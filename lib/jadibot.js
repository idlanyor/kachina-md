import { initFunction } from 'buttons-warpper';
import pino from 'pino';
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
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from 'baileys';

class JadiBotManager {
    constructor() {
        this.baseDir = './jadibot-sessions';
        this.persistenceFile = path.join(this.baseDir, 'active-bots.json');
        this.botMetadata = new Map(); // Map of sessionId -> metadata (userJid, chatId, etc.)
        this.parentSock = null;
        this.bots = new Map(); // Map of sessionId -> socket instance

        // Create base directory for jadibot sessions
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }

    /**
     * Create a new WhatsApp socket connection
     * @param {string} sessionId - Session ID (usually phone number)
     * @param {string} phoneNumber - Phone number for pairing
     * @returns {Promise<object>} Socket connection and state
     */
    async createSocket(sessionId, phoneNumber) {
        const sessionDir = path.join(this.baseDir, sessionId);
        
        // Ensure session directory exists
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        // Load auth state
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        // Create socket
        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            mobile: false,
            connectTimeoutMs: 60000,
            retryRequestDelayMs: 5000,
            keepAliveIntervalMs: 30000,
            phoneNumber: phoneNumber
        });

        // Save credentials when updated
        sock.ev.on('creds.update', saveCreds);

        return { sock, state, saveCreds };
    }

    /**
     * Setup event handlers for a specific socket
     * @param {object} sock - Socket instance
     * @param {string} sessionId - Session ID
     */
    setupSocketEventHandlers(sock, sessionId) {
        const metadata = this.botMetadata.get(sessionId);
        if (!metadata) return;

        // Handle connection updates
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr, isNewLogin } = update;

            if (qr) {
                // QR code generated (shouldn't happen with phone number pairing)
                logger.info(`QR code generated for session ${sessionId}`);
            }

            if (connection === 'connecting') {
                logger.info(`Connecting session ${sessionId}...`);
                metadata.status = 'connecting';
            }

            if (connection === 'open') {
                logger.success(`Jadibot connected for session ${sessionId}`);
                metadata.status = 'connected';
                metadata.botUserId = sock.user.id;

                // Initialize buttons wrapper
                await initFunction(sock);
                sock.isChildBot = true;
                sock.isParentBot = false;

                // Notify user
                if (this.parentSock && metadata.chatId) {
                    try {
                        await this.parentSock.sendMessage(metadata.chatId, {
                            text: `✅ JADIBOT TERHUBUNG\n\n` +
                                `📱 Nomor: ${sock.user.id.split(':')[0]}\n` +
                                `⏰ Waktu: ${new Date().toLocaleString('id-ID')}\n` +
                                `🔒 Mode: Self-Me (hanya Anda)\n\n` +
                                `💾 Sesi tersimpan - Bot akan auto-reconnect saat restart!\n\n` +
                                `Ketik .statusjadibot untuk cek status\n` +
                                `Ketik .stopjadibot untuk hentikan bot\n` +
                                `Ketik .deletejadibot untuk hapus sesi`
                        });
                    } catch (error) {
                        logger.error('Error sending connect notification:', error);
                    }
                }

                // Save persistence
                await this.savePersistence();
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.info(`Connection closed for session ${sessionId}, reconnect: ${shouldReconnect}`);

                if (shouldReconnect) {
                    metadata.status = 'reconnecting';
                    // Attempt to reconnect after delay
                    setTimeout(async () => {
                        try {
                            logger.info(`Attempting to reconnect session ${sessionId}...`);
                            const { sock: newSock } = await this.createSocket(sessionId, metadata.phoneNumber);
                            this.bots.set(sessionId, newSock);
                            this.setupSocketEventHandlers(newSock, sessionId);
                        } catch (error) {
                            logger.error(`Failed to reconnect session ${sessionId}:`, error);
                        }
                    }, 5000);
                } else {
                    // Logged out, clean up
                    logger.info(`Session ${sessionId} logged out`);
                    await this.cleanupBot(metadata.userJid);
                    await this.savePersistence();

                    if (this.parentSock && metadata.chatId) {
                        try {
                            await this.parentSock.sendMessage(metadata.chatId, {
                                text: '❌ JADIBOT TERPUTUS\n\n' +
                                    'Bot Anda telah logout.\n\n' +
                                    'Ketik .jadibot <nomor> untuk buat bot baru\n' +
                                    'Ketik .jadibotinfo untuk info lengkap'
                            });
                        } catch (error) {
                            logger.error('Error sending disconnect message:', error);
                        }
                    }
                }
            }
        });

        // Handle pairing code
        sock.ev.on('auth.update', async ({ sas, error }) => {
            if (sas && sas.method === 'pairing-code' && sas.code) {
                logger.info(`Pairing code generated for session ${sessionId}: ${sas.code}`);

                // Send pairing code to user
                if (this.parentSock && metadata.chatId) {
                    try {
                        await this.parentSock.sendMessage(metadata.chatId, {
                            text: `🤖 KODE PAIRING JADIBOT\n\n` +
                                `📱 Nomor: ${metadata.phoneNumber}\n` +
                                `🔐 Kode Pairing: ${sas.code}\n\n` +
                                `Cara menggunakan:\n` +
                                `1) WhatsApp → Linked Devices\n` +
                                `2) Link with phone number\n` +
                                `3) Masukkan kode di atas\n\n` +
                                `⏰ Kode akan expired dalam 60 detik\n\n` +
                                `Ketik .statusjadibot untuk cek status\n` +
                                `Ketik .stopjadibot untuk batalkan`
                        });

                        // Set timeout for pairing code
                        setTimeout(async () => {
                            if (metadata.status === 'connecting') {
                                await this.stopBot(metadata.userJid, this.parentSock, metadata.chatId);
                                await this.parentSock.sendMessage(metadata.chatId, {
                                    text: '⏱️ Kode pairing expired! Ingin mencoba lagi?\n\n' +
                                        'Ketik .jadibot <nomor> untuk membuat bot lagi\n' +
                                        'Ketik .jadibotinfo untuk info lengkap'
                                });
                            }
                        }, 90000);
                    } catch (error) {
                        logger.error('Error sending pairing code:', error);
                    }
                }
            }

            if (error) {
                logger.error(`Auth error for session ${sessionId}:`, error);
            }
        });

        // Handle messages
        sock.ev.on('messages.upsert', async (data) => {
            try {
                let m = data.messages[0];
                if (!m.message) return;

                m = addMessageHandler(m, sock);

                const botOwnerId = sanitizeBotId(sock.user.id);
                const senderId = m.key.fromMe ? botOwnerId : (m.key.participant || m.key.remoteJid);
                const isBotOwner = senderId === botOwnerId;

                if (!isBotOwner) return;

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

        // Handle group participant updates
        sock.ev.on('group-participants.update', async (data) => {
            try {
                await GroupHandler.handleGroupParticipantsUpdate(sock, data);
            } catch (error) {
                logger.error('Error in jadibot group handler:', error);
            }
        });
    }

    /**
     * Save active bot info to persistence file
     */
    async savePersistence() {
        try {
            const botsData = [];
            for (const [sessionId, metadata] of this.botMetadata.entries()) {
                if (metadata.status === 'connected' && metadata.botUserId) {
                    botsData.push({
                        sessionId,
                        userJid: metadata.userJid,
                        phoneNumber: metadata.phoneNumber,
                        chatId: metadata.chatId,
                        connectedAt: metadata.createdAt.toISOString(),
                        botUserId: metadata.botUserId
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
            this.parentSock = parentSock;

            if (!fs.existsSync(this.persistenceFile)) {
                logger.info('No jadibot persistence file found');
                return;
            }

            const botsData = await fs.readJson(this.persistenceFile);
            logger.info(`Found ${botsData.length} saved jadibot(s), attempting to reconnect...`);

            for (const botData of botsData) {
                try {
                    const userJid = botData.userJid;
                    const phoneNumber = botData.phoneNumber;
                    const chatId = botData.chatId;
                    const sessionId = botData.sessionId || userJid.split('@')[0]; // Backward compatibility

                    // Check if session exists
                    const sessionDir = path.join(this.baseDir, sessionId);
                    if (!fs.existsSync(sessionDir)) {
                        logger.warn(`Session directory not found for ${sessionId}, skipping...`);
                        continue;
                    }

                    logger.info(`Auto-reconnecting jadibot session ${sessionId}...`);

                    // Store metadata before creating socket
                    this.botMetadata.set(sessionId, {
                        userJid,
                        phoneNumber,
                        chatId,
                        createdAt: new Date(),
                        status: 'connecting',
                        botMode: 'self-me',
                        botUserId: null
                    });

                    // Create socket (will reuse existing session)
                    const { sock } = await this.createSocket(sessionId, phoneNumber);
                    this.bots.set(sessionId, sock);
                    this.setupSocketEventHandlers(sock, sessionId);

                    // Initialize buttons wrapper
                    await initFunction(sock);
                    sock.isChildBot = true;
                    sock.isParentBot = false;

                    // Notify user about reconnection attempt
                    try {
                        await parentSock.sendMessage(chatId, {
                            text: `🔄 JADIBOT AUTO-RECONNECTING\n\n` +
                                `📱 Nomor: ${phoneNumber}\n` +
                                `⏰ Waktu: ${new Date().toLocaleString('id-ID')}\n` +
                                `🔄 Mencoba menghubungkan kembali...\n\n` +
                                `Ketik .statusjadibot untuk cek status`
                        });
                    } catch (error) {
                        logger.error('Error sending auto-reconnect notification:', error);
                    }

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
            this.parentSock = parentSock;

            // Check if user already has a bot
            const existingSessionId = this.getUserSessionId(userJid);
            if (existingSessionId) {
                return { success: false, message: '❌ Anda sudah memiliki bot yang aktif! Gunakan .stopjadibot untuk menghentikan bot sebelumnya.' };
            }

            // Validate phone number
            if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
                return { success: false, message: '❌ Nomor telepon tidak valid! Format: 628xxxxx (tanpa +, -, atau spasi)' };
            }

            const sanitizedJid = userJid.split('@')[0];
            const sessionId = sanitizedJid;

            // Store metadata
            this.botMetadata.set(sessionId, {
                userJid,
                phoneNumber,
                chatId,
                createdAt: new Date(),
                status: 'connecting',
                botMode: 'self-me',
                botUserId: null
            });

            logger.info(`Creating jadibot session for ${sessionId}...`);

            // Create socket
            const { sock } = await this.createSocket(sessionId, phoneNumber);
            this.bots.set(sessionId, sock);
            this.setupSocketEventHandlers(sock, sessionId);

            // Initialize buttons wrapper
            await initFunction(sock);
            sock.isChildBot = true;
            sock.isParentBot = false;

            return {
                success: true,
                message: '✅ Sedang membuat bot... Kode pairing akan dikirim segera!'
            };

        } catch (error) {
            logger.error('Error creating jadibot:', error);
            // Cleanup on error
            const sanitizedJid = userJid.split('@')[0];
            this.botMetadata.delete(sanitizedJid);
            return {
                success: false,
                message: `❌ Gagal membuat bot: ${error.message}`
            };
        }
    }

    /**
     * Get session ID for a user
     * @param {string} userJid - User JID
     * @returns {string|null} Session ID or null
     */
    getUserSessionId(userJid) {
        for (const [sessionId, metadata] of this.botMetadata.entries()) {
            if (metadata.userJid === userJid) {
                return sessionId;
            }
        }
        return null;
    }

    /**
     * Stop a jadibot instance
     * @param {string} userJid - User JID
     * @param {object} parentSock - Parent bot socket (optional)
     * @param {string} chatId - Chat ID (optional)
     */
    async stopBot(userJid, parentSock = null, chatId = null) {
        try {
            const sessionId = this.getUserSessionId(userJid);

            if (!sessionId) {
                return { success: false, message: '❌ Anda tidak memiliki bot yang aktif!' };
            }

            // Get the socket and close it
            const sock = this.bots.get(sessionId);
            if (sock) {
                try {
                    sock.ev.removeAllListeners();
                    if (sock.ws) {
                        sock.ws.close();
                    }
                } catch (error) {
                    logger.error('Error closing socket:', error);
                }
                this.bots.delete(sessionId);
            }

            // Remove metadata
            this.botMetadata.delete(sessionId);

            // Update persistence
            await this.savePersistence();

            logger.info(`Jadibot stopped for session ${sessionId}`);

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
            const sessionId = this.getUserSessionId(userJid);

            if (sessionId) {
                // Get the socket and close it
                const sock = this.bots.get(sessionId);
                if (sock) {
                    try {
                        sock.ev.removeAllListeners();
                        if (sock.ws) {
                            sock.ws.close();
                        }
                    } catch (error) {
                        logger.error('Error closing socket during cleanup:', error);
                    }
                    this.bots.delete(sessionId);
                }

                // Remove metadata
                this.botMetadata.delete(sessionId);
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
        const sessionId = this.getUserSessionId(userJid);

        if (!sessionId) {
            return { exists: false };
        }

        const metadata = this.botMetadata.get(sessionId);
        if (!metadata) {
            return { exists: false };
        }

        const uptime = Date.now() - metadata.createdAt.getTime();
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

        // Get phone number from socket if available
        const sock = this.bots.get(sessionId);
        const phoneNumber = sock?.user?.id?.split(':')[0] || metadata.phoneNumber || 'Unknown';

        return {
            exists: true,
            status: metadata.status,
            phoneNumber: phoneNumber,
            uptime: `${hours}h ${minutes}m ${seconds}s`,
            createdAt: metadata.createdAt.toLocaleString('id-ID')
        };
    }

    /**
     * Get all active bots
     */
    getAllBots() {
        const bots = [];

        for (const [sessionId, metadata] of this.botMetadata.entries()) {
            const uptime = Date.now() - metadata.createdAt.getTime();
            const hours = Math.floor(uptime / (1000 * 60 * 60));
            const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

            // Get phone number from socket if available
            const sock = this.bots.get(sessionId);
            const phoneNumber = sock?.user?.id?.split(':')[0] || metadata.phoneNumber || 'Connecting...';

            bots.push({
                userJid: metadata.userJid,
                phoneNumber: phoneNumber,
                status: metadata.status,
                uptime: `${hours}h ${minutes}m`,
                createdAt: metadata.createdAt.toLocaleString('id-ID')
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

    /**
     * Get session info
     * @param {string} userJid - User JID
     */
    async getSessionInfo(userJid) {
        const sessionId = userJid.split('@')[0];
        const sessionDir = path.join(this.baseDir, sessionId);
        
        return {
            exists: fs.existsSync(sessionDir),
            path: sessionDir
        };
    }

    /**
     * Cleanup corrupted sessions
     */
    async cleanupCorruptSessions() {
        try {
            if (!fs.existsSync(this.baseDir)) {
                return { cleaned: 0, message: 'No sessions directory found' };
            }

            const sessions = await fs.readdir(this.baseDir);
            let cleaned = 0;

            for (const sessionId of sessions) {
                const sessionDir = path.join(this.baseDir, sessionId);
                const credsFile = path.join(sessionDir, 'creds.json');

                if (!fs.existsSync(credsFile)) {
                    try {
                        await fs.remove(sessionDir);
                        cleaned++;
                        logger.info(`Cleaned up corrupt session: ${sessionId}`);
                    } catch (error) {
                        logger.error(`Failed to clean up session ${sessionId}:`, error);
                    }
                }
            }

            return { cleaned, message: `Cleaned up ${cleaned} corrupt sessions` };
        } catch (error) {
            logger.error('Error cleaning up corrupt sessions:', error);
            return { cleaned: 0, message: `Error: ${error.message}` };
        }
    }
}

// Create singleton instance
const jadiBotManager = new JadiBotManager();

export default jadiBotManager;
