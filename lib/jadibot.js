import { ShardManager } from 'baileys-shard';
import initFunction from 'buttons-warpper';
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

class JadiBotManager {
    constructor() {
        this.baseDir = './jadibot-sessions';
        this.persistenceFile = path.join(this.baseDir, 'active-bots.json');
        this.botMetadata = new Map(); // Map of shardId -> metadata (userJid, chatId, etc.)
        this.parentSock = null;

        // Create base directory for jadibot sessions
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }

        // Initialize ShardManager
        this.manager = new ShardManager({
            session: this.baseDir
        });

        // Setup global event handlers for all shards
        this.setupGlobalEventHandlers();
    }

    /**
     * Setup global event handlers for ShardManager
     */
    setupGlobalEventHandlers() {
        // Handle login updates (pairing codes, QR codes)
        this.manager.on('login.update', async ({ shardId, state, type, code }) => {
            const metadata = this.botMetadata.get(shardId);
            if (!metadata) return;

            if (type === 'pairing' && code) {
                logger.info(`Pairing code generated for shard ${shardId}: ${code}`);

                // Send pairing code to user
                if (this.parentSock && metadata.chatId) {
                    try {
                        await this.parentSock.sendMessage(metadata.chatId, {
                            text: `🤖 KODE PAIRING JADIBOT\n\n` +
                                  `📱 Nomor: ${metadata.phoneNumber}\n` +
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
        });

        // Handle connection updates
        this.manager.on('connection.update', async ({ shardId, sock, data }) => {
            const metadata = this.botMetadata.get(shardId);
            if (!metadata) return;

            const { connection, lastDisconnect } = data;

            if (connection === 'open') {
                metadata.status = 'connected';
                metadata.botUserId = sock.user?.id;
                logger.success(`Jadibot connected for shard ${shardId}`);

                // Initialize buttons wrapper
                await initFunction(sock);
                sock.isChildBot = true;
                sock.isParentBot = false;

                // Notify user
                if (this.parentSock && metadata.chatId) {
                    try {
                        await this.parentSock.sendMessage(metadata.chatId, {
                            text: `✅ JADIBOT TERHUBUNG\n\n` +
                                  `📱 Nomor: ${sock.user?.id?.split(':')[0]}\n` +
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

            } else if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;
                logger.info(`Jadibot connection closed for shard ${shardId}, reason: ${reason}`);

                // DisconnectReason.loggedOut = 401
                if (reason === 401) {
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
                } else {
                    metadata.status = 'reconnecting';
                    logger.info(`Attempting to reconnect shard ${shardId}...`);
                }
            }
        });

        // Handle messages from all shards
        this.manager.on('messages.upsert', async ({ shardId, sock, data }) => {
            const metadata = this.botMetadata.get(shardId);
            if (!metadata) return;

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
        this.manager.on('group-participants.update', async ({ shardId, sock, data }) => {
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
            for (const [shardId, metadata] of this.botMetadata.entries()) {
                if (metadata.status === 'connected' && metadata.botUserId) {
                    botsData.push({
                        shardId,
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
                    // Support both old format (without shardId) and new format (with shardId)
                    const userJid = botData.userJid;
                    const phoneNumber = botData.phoneNumber;
                    const chatId = botData.chatId;
                    const shardId = botData.shardId || userJid.split('@')[0]; // Backward compatibility

                    // Check if session exists
                    const sessionInfo = await this.manager.getSessionInfo(shardId);
                    if (!sessionInfo.exists) {
                        logger.warn(`Session not found for ${shardId}, skipping...`);
                        continue;
                    }

                    logger.info(`Auto-reconnecting jadibot shard ${shardId}...`);

                    // Store metadata before creating shard
                    this.botMetadata.set(shardId, {
                        userJid,
                        phoneNumber,
                        chatId,
                        createdAt: new Date(),
                        status: 'connecting',
                        botMode: 'self-me',
                        botUserId: null
                    });

                    // Recreate shard (will reuse existing session)
                    const { sock } = await this.manager.createShard({
                        id: shardId,
                        phoneNumber: phoneNumber,
                        socketOptions: {
                            printQRInTerminal: false,
                            logger: pino({ level: 'silent' }),
                            browser: ['Ubuntu', 'Chrome', '20.0.04']
                        }
                    });

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
            const existingShardId = this.getUserShardId(userJid);
            if (existingShardId) {
                return { success: false, message: '❌ Anda sudah memiliki bot yang aktif! Gunakan .stopjadibot untuk menghentikan bot sebelumnya.' };
            }

            // Validate phone number
            if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
                return { success: false, message: '❌ Nomor telepon tidak valid! Format: 628xxxxx (tanpa +, -, atau spasi)' };
            }

            const sanitizedJid = userJid.split('@')[0];
            const shardId = sanitizedJid;

            // Store metadata
            this.botMetadata.set(shardId, {
                userJid,
                phoneNumber,
                chatId,
                createdAt: new Date(),
                status: 'connecting',
                botMode: 'self-me',
                botUserId: null
            });

            logger.info(`Creating jadibot shard for ${shardId}...`);

            // Create shard using ShardManager
            const { sock } = await this.manager.createShard({
                id: shardId,
                phoneNumber: phoneNumber,
                socketOptions: {
                    printQRInTerminal: false,
                    logger: pino({ level: 'silent' }),
                    browser: ['Ubuntu', 'Chrome', '20.0.04']
                }
            });

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
     * Get shard ID for a user
     * @param {string} userJid - User JID
     * @returns {string|null} Shard ID or null
     */
    getUserShardId(userJid) {
        for (const [shardId, metadata] of this.botMetadata.entries()) {
            if (metadata.userJid === userJid) {
                return shardId;
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
            const shardId = this.getUserShardId(userJid);

            if (!shardId) {
                return { success: false, message: '❌ Anda tidak memiliki bot yang aktif!' };
            }

            // Get the shard socket and close it
            const shard = this.manager.shards?.get(shardId);
            if (shard?.sock) {
                try {
                    shard.sock.ev.removeAllListeners();
                    if (shard.sock.ws) {
                        shard.sock.ws.close();
                    }
                } catch (error) {
                    logger.error('Error closing socket:', error);
                }
            }

            // Remove metadata
            this.botMetadata.delete(shardId);

            // Update persistence
            await this.savePersistence();

            logger.info(`Jadibot stopped for shard ${shardId}`);

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
            const shardId = this.getUserShardId(userJid);

            if (shardId) {
                // Get the shard socket and close it
                const shard = this.manager.shards?.get(shardId);
                if (shard?.sock) {
                    try {
                        shard.sock.ev.removeAllListeners();
                        if (shard.sock.ws) {
                            shard.sock.ws.close();
                        }
                    } catch (error) {
                        logger.error('Error closing socket during cleanup:', error);
                    }
                }

                // Remove metadata
                this.botMetadata.delete(shardId);
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
        const shardId = this.getUserShardId(userJid);

        if (!shardId) {
            return { exists: false };
        }

        const metadata = this.botMetadata.get(shardId);
        if (!metadata) {
            return { exists: false };
        }

        const uptime = Date.now() - metadata.createdAt.getTime();
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

        // Get phone number from shard if available
        const shard = this.manager.shards?.get(shardId);
        const phoneNumber = shard?.sock?.user?.id?.split(':')[0] || metadata.phoneNumber || 'Unknown';

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

        for (const [shardId, metadata] of this.botMetadata.entries()) {
            const uptime = Date.now() - metadata.createdAt.getTime();
            const hours = Math.floor(uptime / (1000 * 60 * 60));
            const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

            // Get phone number from shard if available
            const shard = this.manager.shards?.get(shardId);
            const phoneNumber = shard?.sock?.user?.id?.split(':')[0] || metadata.phoneNumber || 'Connecting...';

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
     * Get session info using ShardManager
     * @param {string} userJid - User JID
     */
    async getSessionInfo(userJid) {
        const shardId = userJid.split('@')[0];
        return await this.manager.getSessionInfo(shardId);
    }

    /**
     * Cleanup corrupted sessions
     */
    async cleanupCorruptSessions() {
        return await this.manager.cleanupCorruptSessions();
    }
}

// Create singleton instance
const jadiBotManager = new JadiBotManager();

export default jadiBotManager;
