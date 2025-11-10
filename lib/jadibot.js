import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } from 'baileys';
import initFunction from 'buttons-warpper';
import pino from 'pino';
import NodeCache from 'node-cache';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../helper/logger.js';
import { MessageHandler } from '../handlers/messageHandler.js';
import { GroupHandler } from '../handlers/groupHandler.js';
import { addMessageHandler } from '../helper/message.js';
import Database from '../helper/database.js';
import { clearMessages, sanitizeBotId } from '../bot.js';
import { getMedia } from '../helper/mediaMsg.js';
import { cacheGroupMetadata } from '../helper/caching.js';

class JadiBotManager {
    constructor() {
        this.bots = new Map(); // Map of userId -> bot instance
        this.baseDir = './jadibot-sessions';
        this.persistenceFile = path.join(this.baseDir, 'active-bots.json');

        // Create base directory for jadibot sessions
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }

    /**
     * Save active bot info to persistence file
     */
    async savePersistence() {
        try {
            const botsData = [];
            for (const [userJid, botInfo] of this.bots.entries()) {
                if (botInfo.status === 'connected' && botInfo.sock?.user?.id) {
                    botsData.push({
                        userJid,
                        phoneNumber: botInfo.phoneNumber,
                        chatId: botInfo.chatId,
                        connectedAt: botInfo.createdAt.toISOString(),
                        botUserId: botInfo.sock.user.id
                    });
                }
            }
            await fs.writeJson(this.persistenceFile, botsData, { spaces: 2 });
            logger.info(`Saved ${botsData.length} active jadibot(s) to persistence`);
        } catch (error) {
            logger.error('Error saving jadibot persistence:', error);
        }
    }

    /**
     * Load and reconnect bots from persistence file
     * @param {object} parentSock - Parent bot socket
     */
    async loadPersistence(parentSock) {
        try {
            if (!fs.existsSync(this.persistenceFile)) {
                logger.info('No jadibot persistence file found');
                return;
            }

            const botsData = await fs.readJson(this.persistenceFile);
            logger.info(`Found ${botsData.length} saved jadibot(s), attempting to reconnect...`);

            for (const botData of botsData) {
                try {
                    const { userJid, phoneNumber, chatId } = botData;
                    const sanitizedJid = userJid.split('@')[0];
                    const sessionDir = path.join(this.baseDir, sanitizedJid);

                    // Check if session exists
                    if (!fs.existsSync(sessionDir)) {
                        logger.warn(`Session not found for ${sanitizedJid}, skipping...`);
                        continue;
                    }

                    logger.info(`Auto-reconnecting jadibot for ${sanitizedJid}...`);

                    // Initialize logger
                    const P = pino({ level: 'silent' });

                    // Setup auth state
                    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

                    // Create message retry cache
                    const msgRetryCounterCache = new NodeCache();

                    // Create socket configuration
                    const socketConfig = {
                        auth: state,
                        printQRInTerminal: false,
                        logger: P,
                        browser: Browsers.ubuntu("Chrome"),
                        msgRetryCounterCache,
                        getMessage: async (key) => {
                            return { conversation: '' };
                        }
                    };

                    // Create socket
                    const sock = makeWASocket(socketConfig);
                    await initFunction(sock);
                    sock.isChildBot = true;
                    sock.isParentBot = false;

                    // Store bot info
                    const botInfo = {
                        sock,
                        userJid,
                        chatId,
                        sessionDir,
                        createdAt: new Date(),
                        status: 'connecting',
                        phoneNumber: phoneNumber,
                        botMode: 'self-me'
                    };

                    this.bots.set(userJid, botInfo);

                    // Handle connection updates
                    sock.ev.on('connection.update', async (update) => {
                        const { connection, lastDisconnect } = update;

                        if (connection === 'open') {
                            botInfo.status = 'connected';
                            logger.success(`Jadibot auto-reconnected for ${sanitizedJid}`);

                            // Notify user about reconnection
                            try {
                                await parentSock.sendMessage(chatId, {
                                    text: `✅ JADIBOT AUTO-RECONNECTED\n\n` +
                                          `📱 Nomor: ${sock.user?.id?.split(':')[0]}\n` +
                                          `⏰ Waktu: ${new Date().toLocaleString('id-ID')}\n` +
                                          `🔄 Bot Anda telah terhubung kembali otomatis setelah restart!\n\n` +
                                          `Ketik .statusjadibot untuk cek status\n` +
                                          `Ketik .stopjadibot untuk hentikan bot`
                                });
                            } catch (error) {
                                logger.error('Error sending auto-reconnect notification:', error);
                            }

                            // Setup message handlers
                            this.setupMessageHandlers(sock, userJid);

                            // Save persistence after successful connection
                            await this.savePersistence();

                        } else if (connection === 'close') {
                            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                            const reason = lastDisconnect?.error?.output?.statusCode;

                            logger.info(`Jadibot connection closed for ${sanitizedJid}, reason: ${reason}`);

                            if (reason === DisconnectReason.loggedOut) {
                                await this.cleanupBot(userJid);
                                await this.savePersistence();

                                try {
                                    await parentSock.sendMessage(chatId, {
                                        text: '❌ JADIBOT TERPUTUS\n\nBot Anda telah logout. Gunakan .jadibot untuk membuat bot baru.'
                                    });
                                } catch (error) {
                                    logger.error('Error sending disconnect message:', error);
                                }
                            } else if (shouldReconnect) {
                                logger.info(`Attempting to reconnect jadibot for ${sanitizedJid}...`);
                                botInfo.status = 'reconnecting';

                                setTimeout(async () => {
                                    try {
                                        const newSock = makeWASocket(socketConfig);
                                        await initFunction(newSock);
                                        newSock.isChildBot = true;
                                        newSock.isParentBot = false;
                                        botInfo.sock = newSock;

                                        this.setupConnectionHandlers(newSock, userJid, parentSock, chatId, botInfo);
                                    } catch (error) {
                                        logger.error('Error reconnecting jadibot:', error);
                                        await this.cleanupBot(userJid);
                                        await this.savePersistence();
                                    }
                                }, 5000);
                            }
                        }
                    });

                    sock.ev.on('creds.update', saveCreds);

                } catch (error) {
                    logger.error(`Error reconnecting jadibot for ${botData.userJid}:`, error);
                }
            }

        } catch (error) {
            logger.error('Error loading jadibot persistence:', error);
        }
    }

    /**
     * Create a new jadibot instance for a user
     * @param {string} userJid - User JID (WhatsApp ID)
     * @param {object} parentSock - Parent bot socket
     * @param {string} chatId - Chat ID where pairing code will be sent
     * @param {string} phoneNumber - Phone number for pairing
     * @returns {Promise<object>} Bot instance
     */
    async createBot(userJid, parentSock, chatId, phoneNumber) {
        try {
            // Check if user already has a bot
            if (this.bots.has(userJid)) {
                return { success: false, message: '❌ Anda sudah memiliki bot yang aktif! Gunakan .stopjadibot untuk menghentikan bot sebelumnya.' };
            }

            // Validate phone number
            if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
                return { success: false, message: '❌ Nomor telepon tidak valid! Format: 628xxxxx (tanpa +, -, atau spasi)' };
            }

            const sanitizedJid = userJid.split('@')[0];
            const sessionDir = path.join(this.baseDir, sanitizedJid);

            // Initialize logger
            const P = pino({ level: 'silent' });
            
            // Setup auth state
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
            
            // Create message retry cache
            const msgRetryCounterCache = new NodeCache();

            // Create socket configuration
            const socketConfig = {
                auth: state,
                printQRInTerminal: false,
                logger: P,
                browser: Browsers.ubuntu("Chrome"),
                msgRetryCounterCache,
                getMessage: async (key) => {
                    return { conversation: '' };
                }
            };

            // Create socket
            const sock = makeWASocket(socketConfig);
            // Initialize buttons wrapper on jadibot sock
            await initFunction(sock);
            // Mark this socket as child bot
            sock.isChildBot = true;
            sock.isParentBot = false;
            
            let pairingCodeSent = false;
            let connectionTimeout = null;
            
            // Store bot info
            const botInfo = {
                sock,
                userJid,
                chatId,
                sessionDir,
                createdAt: new Date(),
                status: 'connecting',
                phoneNumber: phoneNumber, 
                botMode: 'self-me'  
            };

            this.bots.set(userJid, botInfo);

            // Request pairing code if not registered
            if (!sock.authState.creds.registered) {
                try {
                    // Wait a bit before requesting pairing code
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const code = await sock.requestPairingCode(phoneNumber);
                    
                    if (code) {
                        pairingCodeSent = true;
                        
                        // Send pairing code to user
                        await parentSock.sendMessage(chatId, {
                            text: `🤖 KODE PAIRING JADIBOT\n\n` +
                                  `📱 Nomor: ${phoneNumber}\n` +
                                  `🔐 Kode Pairing: ${code}\n\n` +
                                  `Cara menggunakan:\n` +
                                  `1) WhatsApp → Linked Devices\n` +
                                  `2) Link with phone number\n` +
                                  `3) Masukkan kode di atas\n\n` +
                                  `⏰ Kode akan expired dalam 60 detik\n\n` +
                                  `Ketik .statusjadibot untuk cek status\n` +
                                  `Ketik .stopjadibot untuk batalkan`
                        });
                        
                        // Set timeout for pairing code
                        connectionTimeout = setTimeout(async () => {
                            if (botInfo.status === 'connecting') {
                                await this.stopBot(userJid, parentSock, chatId);
                                await parentSock.sendMessage(chatId, {
                                    text: '⏱️ Kode pairing expired! Ingin mencoba lagi?\n\n' +
                                          'Ketik .jadibot <nomor> untuk membuat bot lagi\n' +
                                          'Ketik .jadibotinfo untuk info lengkap'
                                });
                            }
                        }, 90000); // 90 seconds timeout
                        
                    }
                } catch (error) {
                    logger.error('Error requesting pairing code:', error);
                    await parentSock.sendMessage(chatId, {
                        text: `❌ Gagal mendapatkan kode pairing: ${error.message}\n\n` +
                              `Ketik .jadibot <nomor> untuk coba lagi\n` +
                              `Ketik .jadibotinfo untuk info lengkap`
                    });
                    await this.cleanupBot(userJid);
                    return { success: false, message: 'Gagal mendapatkan kode pairing' };
                }
            }

            // Handle connection updates
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;

                // Handle connection status
                if (connection === 'open') {
                    if (connectionTimeout) clearTimeout(connectionTimeout);

                    botInfo.status = 'connected';
                    logger.success(`Jadibot connected for ${sanitizedJid}`);

                    await parentSock.sendMessage(chatId, {
                        text: `✅ JADIBOT TERHUBUNG\n\n` +
                              `📱 Nomor: ${sock.user?.id?.split(':')[0]}\n` +
                              `⏰ Waktu: ${new Date().toLocaleString('id-ID')}\n` +
                              `🔒 Mode: Self-Me (hanya Anda)\n\n` +
                              `💾 Sesi tersimpan - Bot akan auto-reconnect saat restart!\n\n` +
                              `Ketik .statusjadibot untuk cek status\n` +
                              `Ketik .stopjadibot untuk hentikan bot\n` +
                              `Ketik .deletejadibot untuk hapus sesi`
                    });

                    // Setup message handlers
                    this.setupMessageHandlers(sock, userJid);

                    // Save persistence after successful connection
                    await this.savePersistence();

                } else if (connection === 'close') {
                    if (connectionTimeout) clearTimeout(connectionTimeout);

                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    const reason = lastDisconnect?.error?.output?.statusCode;

                    logger.info(`Jadibot connection closed for ${sanitizedJid}, reason: ${reason}`);

                    if (reason === DisconnectReason.loggedOut) {
                        // Clean up session
                        await this.cleanupBot(userJid);
                        await this.savePersistence();

                        try {
                            await parentSock.sendMessage(chatId, {
                                text: '❌ JADIBOT TERPUTUS\n\n' +
                                      'Bot Anda telah logout.\n\n' +
                                      'Ketik .jadibot <nomor> untuk buat bot baru\n' +
                                      'Ketik .jadibotinfo untuk info lengkap'
                            });
                        } catch (error) {
                            logger.error('Error sending disconnect message:', error);
                        }
                    } else if (shouldReconnect) {
                        logger.info(`Attempting to reconnect jadibot for ${sanitizedJid}...`);
                        botInfo.status = 'reconnecting';
                        
                        // Wait a bit before reconnecting
                        setTimeout(async () => {
                            try {
                                // Recreate connection
                                const newSock = makeWASocket(socketConfig);
                                await initFunction(newSock);
                                newSock.isChildBot = true;
                                newSock.isParentBot = false;
                                botInfo.sock = newSock;
                                
                                this.setupConnectionHandlers(newSock, userJid, parentSock, chatId, botInfo);
                            } catch (error) {
                                logger.error('Error reconnecting jadibot:', error);
                                await this.cleanupBot(userJid);
                            }
                        }, 5000);
                    }
                }
            });

            sock.ev.on('creds.update', saveCreds);

            return { 
                success: true, 
                message: '✅ Sedang membuat bot... Kode pairing akan dikirim segera!'
            };

        } catch (error) {
            logger.error('Error creating jadibot:', error);
            // Cleanup on error
            await this.cleanupBot(userJid);
            return { 
                success: false, 
                message: `❌ Gagal membuat bot: ${error.message}` 
            };
        }
    }

    /**
     * Setup connection handlers for bot
     */
    setupConnectionHandlers(sock, userJid, parentSock, chatId, botInfo) {
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                botInfo.status = 'connected';
                logger.success(`Jadibot reconnected for ${userJid.split('@')[0]}`);

                try {
                    await parentSock.sendMessage(chatId, {
                        text: '✅ Bot Anda tersambung kembali!\n\n' +
                              'Ketik .statusjadibot untuk cek status\n' +
                              'Ketik .stopjadibot untuk hentikan bot'
                    });
                } catch (error) {
                    logger.error('Error sending reconnect message:', error);
                }
                
                this.setupMessageHandlers(sock, userJid);
            } else if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                
                if (!shouldReconnect) {
                    await this.cleanupBot(userJid);
                }
            }
        });
    }

    /**
     * Setup message handlers for jadibot
     */
    setupMessageHandlers(sock, userJid) {
        sock.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                let m = chatUpdate.messages[0];
                if (!m.message) return;
                
                m = addMessageHandler(m, sock);
                
                const botInfo = this.bots.get(userJid);
                if (!botInfo) return;
                
                const botOwnerId = sanitizeBotId(sock.user.id); // The bot's own number
                const senderId = m.key.fromMe ? botOwnerId : (m.key.participant || m.key.remoteJid);
                
                const isBotOwner = senderId === botOwnerId;
                
                if (!isBotOwner) {
                    return;
                }
                
                // Add to database stats
                await Database.addMessage();
                
                if (m.type === 'text' && m.message?.conversation?.startsWith('!')) {
                    await Database.addCommand();
                }

                const { remoteJid } = m.key;
                const sender = m.pushName || remoteJid;
                const id = remoteJid;
                const noTel = (id.endsWith('@g.us')) 
                    ? m.key.participant?.split('@')[0]?.replace(/[^0-9]/g, '') 
                    : id.split('@')[0]?.replace(/[^0-9]/g, '');

                const mediaTypes = ['image', 'video', 'audio'];

                if (m.isGroup) {
                    await cacheGroupMetadata(sock, id);
                }

                if (mediaTypes.includes(m.type)) {
                    const messageType = `${m.type}Message`;
                    const buffer = m.message[messageType] ||
                        m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.[messageType];

                    if (buffer) {
                        const mediaBuffer = await getMedia({ message: { [messageType]: buffer } });
                        const caption = buffer.caption || m.message?.extendedTextMessage?.text;
                        const mime = buffer.mime || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.[messageType]?.mime;

                        await MessageHandler.processMessage({
                            command: caption,
                            sock,
                            m,
                            id,
                            sender,
                            noTel,
                            attf: mediaBuffer,
                            mime
                        });
                    }
                }

                const buttonTypes = {
                    interactiveResponseMessage: m => JSON.parse(m.nativeFlowResponseMessage?.paramsJson)?.id,
                    templateButtonReplyMessage: m => m.selectedId,
                    buttonsResponseMessage: m => m.selectedButtonId
                };

                for (const [type, getCmd] of Object.entries(buttonTypes)) {
                    if (m.message?.[type]) {
                        const cmd = getCmd(m.message[type]);
                        await MessageHandler.processMessage({ 
                            command: `!${cmd}`, 
                            sock, 
                            m, 
                            id, 
                            sender, 
                            noTel 
                        });
                        break;
                    }
                }

                const chat = await clearMessages(m);
                if (chat) {
                    const parsedMsg = chat.chatsFrom === "private" 
                        ? chat.message 
                        : chat.participant?.message;
                    await MessageHandler.processMessage({ 
                        command: parsedMsg, 
                        sock, 
                        m, 
                        id, 
                        sender, 
                        noTel 
                    });
                }

            } catch (error) {
                logger.error('Error in jadibot message handler:', error);
            }
        });

        sock.ev.on('group-participants.update', async (update) => {
            try {
                await GroupHandler.handleGroupParticipantsUpdate(sock, update);
            } catch (error) {
                logger.error('Error in jadibot group handler:', error);
            }
        });
    }

    /**
     * Stop a jadibot instance
     * @param {string} userJid - User JID
     * @param {object} parentSock - Parent bot socket (optional)
     * @param {string} chatId - Chat ID (optional)
     */
    async stopBot(userJid, parentSock = null, chatId = null) {
        try {
            const botInfo = this.bots.get(userJid);

            if (!botInfo) {
                return { success: false, message: '❌ Anda tidak memiliki bot yang aktif!' };
            }

            // Close socket connection
            if (botInfo.sock) {
                try {
                    botInfo.sock.ev.removeAllListeners();
                    if (botInfo.sock.ws) {
                        botInfo.sock.ws.close();
                    }
                } catch (error) {
                    logger.error('Error closing socket:', error);
                }
            }

            // Remove from maps
            this.bots.delete(userJid);

            // Update persistence
            await this.savePersistence();

            logger.info(`Jadibot stopped for ${userJid.split('@')[0]}`);

            return {
                success: true,
                message: '✅ Bot berhasil dihentikan!\n\n💾 Sesi masih tersimpan. Gunakan .jadibot untuk reconnect atau .deletejadibot untuk hapus sesi.'
            };

        } catch (error) {
            logger.error('Error stopping jadibot:', error);
            return {
                success: false,
                message: `❌ Gagal menghentikan bot: ${error.message}`
            };
        }
    }

    /**
     * Cleanup bot resources
     */
    async cleanupBot(userJid) {
        try {
            const botInfo = this.bots.get(userJid);
            
            if (botInfo) {
                // Close socket
                if (botInfo.sock) {
                    try {
                        botInfo.sock.ev.removeAllListeners();
                        if (botInfo.sock.ws) {
                            botInfo.sock.ws.close();
                        }
                    } catch (error) {
                        logger.error('Error closing socket during cleanup:', error);
                    }
                }

                // Remove from maps
                this.bots.delete(userJid);
            }

            logger.info(`Jadibot cleaned up for ${userJid.split('@')[0]}`);
        } catch (error) {
            logger.error('Error cleaning up jadibot:', error);
        }
    }

    /**
     * Get status of a user's bot
     * @param {string} userJid - User JID
     */
    getStatus(userJid) {
        const botInfo = this.bots.get(userJid);
        
        if (!botInfo) {
            return { exists: false };
        }

        const uptime = Date.now() - botInfo.createdAt.getTime();
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

        return {
            exists: true,
            status: botInfo.status,
            phoneNumber: botInfo.sock?.user?.id?.split(':')[0] || 'Unknown',
            uptime: `${hours}h ${minutes}m ${seconds}s`,
            createdAt: botInfo.createdAt.toLocaleString('id-ID')
        };
    }

    /**
     * Get all active bots
     */
    getAllBots() {
        const bots = [];
        
        for (const [userJid, botInfo] of this.bots.entries()) {
            const uptime = Date.now() - botInfo.createdAt.getTime();
            const hours = Math.floor(uptime / (1000 * 60 * 60));
            const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

            bots.push({
                userJid,
                phoneNumber: botInfo.sock?.user?.id?.split(':')[0] || 'Connecting...',
                status: botInfo.status,
                uptime: `${hours}h ${minutes}m`,
                createdAt: botInfo.createdAt.toLocaleString('id-ID')
            });
        }

        return bots;
    }

    /**
     * Delete a bot session permanently
     * @param {string} userJid - User JID
     */
    async deleteSession(userJid) {
        try {
            // Stop bot first
            await this.stopBot(userJid);

            // Delete session directory
            const sanitizedJid = userJid.split('@')[0];
            const sessionDir = path.join(this.baseDir, sanitizedJid);

            if (fs.existsSync(sessionDir)) {
                await fs.remove(sessionDir);
                logger.info(`Session deleted for ${sanitizedJid}`);
                return { success: true, message: '✅ Sesi bot berhasil dihapus!' };
            }

            return { success: false, message: '❌ Sesi tidak ditemukan!' };

        } catch (error) {
            logger.error('Error deleting session:', error);
            return { 
                success: false, 
                message: `❌ Gagal menghapus sesi: ${error.message}` 
            };
        }
    }

}

// Create singleton instance
const jadiBotManager = new JadiBotManager();

export default jadiBotManager;
