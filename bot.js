import { makeWASocket, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, useMultiFileAuthState, DisconnectReason, Browsers, getAggregateVotesInPollMessage } from 'baileys';
import pino from "pino";
import NodeCache from "node-cache";
import fs from 'fs-extra';
import { startBot } from "./main.js";
import { logger } from './helper/logger.js';
import autoNotification from './helper/scheduler.js';
import qrcode from 'qrcode-terminal'
import initFunction from 'buttons-warpper';

// Global state to prevent multiple simultaneous restarts
let isRestarting = false;
let restartTimeout = null;

// Singleton instance management
let botInstance = null;
let isInstanceRunning = false;

// Group metadata cache - TTL 5 menit untuk menghindari data stale
const groupMetadataCache = new NodeCache({
    stdTTL: 300, // 5 menit
    checkperiod: 60, // Check expired keys setiap 60 detik
    useClones: false // Untuk performa yang lebih baik
});

class Kachina {
    constructor(data) {
        this.phoneNumber = data.phoneNumber;
        this.sessionId = data.sessionId;
        this.useStore = data.useStore;
        this.loginMethod = data.loginMethod || 'qr'; // Default ke QR jika tidak ditentukan
        this.sock = null;
        this.isConnecting = false;
    }

    async start() {
        if (isInstanceRunning && botInstance) {
            logger.warning("Bot instance sudah berjalan, menggunakan instance yang ada...");
            return botInstance.sock;
        }

        if (this.isConnecting) {
            logger.warning("Connection attempt already in progress, skipping...");
            return null;
        }

        isInstanceRunning = true;
        botInstance = this;
        this.isConnecting = true;

        try {
            const msgRetryCounterCache = new NodeCache();
            const useStore = this.useStore;
            const MAIN_LOGGER = pino({
                timestamp: () => `,"time":"${new Date().toJSON()}"`
            });

            const loggerPino = MAIN_LOGGER.child({});
            loggerPino.level = "silent";

            const store = useStore ? false : undefined;
            store?.readFromFile(`store-${this.sessionId}.json`);

            setInterval(() => {
                store?.writeToFile(`store-${this.sessionId}.json`);
            }, 10000 * 6);

            const getMessageFromStore = async (key) => {
                const maxRetries = 3;
                const baseDelay = 2000; // 2 detik

                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        if (store) {
                            const msg = await store.loadMessage(key.remoteJid, key.id);
                            return msg?.message || undefined;
                        }
                        return undefined;
                    } catch (error) {
                        if (error.message === 'rate-overlimit' && attempt < maxRetries - 1) {
                            // Exponential backoff
                            const delay = baseDelay * Math.pow(2, attempt);
                            await new Promise(resolve => setTimeout(resolve, delay));
                            continue;
                        }
                        throw error; // Re-throw jika bukan rate-limit atau sudah max retries
                    }
                }
                return undefined;
            };

            const P = pino({ level: "silent" });
            let { state, saveCreds } = await this.validateAndRecoverSession();
            let { version } = await fetchLatestBaileysVersion();

            // Konfigurasi socket berdasarkan metode login
            const socketConfig = {
                version,
                logger: P,
                browser: Browsers.macOS("Safari"),
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, P),
                },
                msgRetryCounterCache,
                cachedGroupMetadata: async (jid) => {
                    try {
                        const cached = groupMetadataCache.get(jid);
                        if (cached) {
                            return cached;
                        }

                        const metadata = await this.sock.groupMetadata(jid);
                        if (metadata) {
                            groupMetadataCache.set(jid, metadata);
                            logger.info(`Group metadata cached for: ${jid}`);
                        }
                        return metadata;
                    } catch (error) {
                        logger.error(`Failed to get cached group metadata for ${jid}:`, error.message);
                        return null;
                    }
                },
                connectOptions: {
                    maxRetries: 5,
                    keepAlive: true,
                    connectTimeoutMs: 60000,
                    retryDelayMs: 2000,
                    patchBeforeConnect: true,
                    qrTimeout: 40000,
                    defaultQueryTimeoutMs: 60000
                },
                getMessage: async (key) => await getMessageFromStore(key)
            };
            // Set printQRInTerminal berdasarkan metode login
            if (this.loginMethod === 'qr') {
                socketConfig.printQRInTerminal = false; // Kita akan handle QR secara manual
            } else {
                socketConfig.printQRInTerminal = false; // Selalu false untuk pairing
            }

            this.sock = makeWASocket(socketConfig);
            await initFunction(this.sock)
            // Mark this socket as the main/parent bot
            this.sock.isParentBot = true;
            this.sock.isChildBot = false;
            store?.bind(this.sock.ev);
            this.sock.ev.on("creds.update", saveCreds);

            // Event handler untuk QR code
            if (this.loginMethod === 'qr') {
                this.sock.ev.on('connection.update', (update) => {
                    const { qr } = update;
                    if (qr) {
                        logger.info('\n🔗 QR Code diterima!');
                        logger.info('📱 Scan QR code berikut dengan WhatsApp:');
                        qrcode.generate(qr,{small:true})
                        logger.info('\n⏰ QR Code akan expired dalam 40 detik');
                        logger.info('💡 Jika QR tidak muncul, coba restart aplikasi\n');
                    }
                });
            }

            // Logic pairing code hanya untuk metode pairing
            if (this.loginMethod === 'pairing' && !this.sock.authState.creds.registered) {
                logger.info("🔐 Memulai proses pairing code...");
                const number = this.phoneNumber;

                if (!number || number.trim() === '') {
                    throw new Error('Nomor telepon diperlukan untuk pairing code');
                }

                const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
                let retryCount = 0;
                const maxRetries = 3;
                let pairingSuccess = false;

                while (retryCount < maxRetries && !pairingSuccess) {
                    try {
                        await delay(3000);
                        const code = await this.sock.requestPairingCode(number);
                        logger.connection.pairing(code);
                        logger.info(`\n📱 Masukkan kode pairing berikut di WhatsApp: ${code}`);
                        logger.info('⚠️  Pastikan nomor telepon yang digunakan sama dengan yang terdaftar di WhatsApp');
                        pairingSuccess = true;
                        break;
                    } catch (err) {
                        retryCount++;
                        logger.error(`Pairing attempt ${retryCount}/${maxRetries} failed:`, err.message);

                        if (retryCount >= maxRetries) {
                            logger.error("Max pairing retries reached, cleaning up session...");
                            await this.cleanup();
                            await fs.remove(`./${this.sessionId}`);
                            this.scheduleRestart(5000);
                            return null;
                        }

                        await delay(2000);
                    }
                }
            }

            // Connection update handler
            this.sock.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "connecting") {
                    logger.connection.connecting("Memulai koneksi soket");
                } else if (connection === "open") {
                    logger.connection.connected("Soket terhubung");
                    this.isConnecting = false;

                    // Clear any pending restart
                    if (restartTimeout) {
                        clearTimeout(restartTimeout);
                        restartTimeout = null;
                    }
                    isRestarting = false;

                    // Initialize scheduler when connection is established
                    autoNotification.init(this.sock);
                } else if (connection === "close") {
                    // Stop scheduler when connection is lost
                    autoNotification.stop();
                    this.isConnecting = false;
                    logger.connection.disconnected("Koneksi terputus, mencoba kembali...");
                    const reason = lastDisconnect?.error?.output?.statusCode;

                    // Prevent multiple simultaneous restart attempts
                    if (isRestarting) {
                        logger.warning("Restart already in progress, ignoring...");
                        return;
                    }

                    if (reason === DisconnectReason.loggedOut) {
                        logger.error("Sesi tidak valid, akan dihapus...");
                        logger.warning(`Folder sesi ${this.sessionId} dihapus, login ulang...`);

                        await this.cleanup();

                        try {
                            await fs.remove(`./${this.sessionId}`);
                            logger.info(`Session folder ${this.sessionId} berhasil dihapus`);
                        } catch (error) {
                            logger.error(`Gagal menghapus session folder: ${error.message}`);
                        }

                        this.scheduleRestart(3000);
                    } else if (reason === DisconnectReason.connectionClosed ||
                        reason === DisconnectReason.connectionLost ||
                        reason === DisconnectReason.restartRequired) {
                        logger.error("Koneksi terputus, mencoba kembali...");
                        await this.cleanup();
                        this.scheduleRestart(5000);
                    } else {
                        logger.error(`Unknown disconnect reason: ${reason}, restarting...`);
                        await this.cleanup();
                        this.scheduleRestart(10000);
                    }
                }
            });

            return this.sock;

        } catch (error) {
            this.isConnecting = false;
            logger.error("Error during bot start:", error);

            if (error.message?.includes('session') || error.message?.includes('auth')) {
                logger.warning("Possible session corruption detected, attempting recovery...");
                await this.handleSessionCorruption();
            }

            this.scheduleRestart(5000);
            return null;
        }
    }

    // Clean up resources before restart
    async cleanup() {
        try {
            if (this.sock) {
                // Remove all event listeners to prevent memory leaks
                this.sock.ev.removeAllListeners();

                // Close connection if still open
                if (this.sock.ws && this.sock.ws.readyState === 1) {
                    this.sock.ws.close();
                }

                this.sock = null;
            }

            // Reset singleton state
            if (botInstance === this) {
                botInstance = null;
                isInstanceRunning = false;
            }
        } catch (error) {
            logger.error("Error during cleanup:", error);
        }
    }

    // Validate session and recover if corrupted
    async validateAndRecoverSession() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.sessionId);

            // Basic validation of session state
            if (!state || !state.creds || !saveCreds) {
                throw new Error('Invalid session state structure');
            }

            return { state, saveCreds };
        } catch (error) {
            logger.warning(`Session validation failed: ${error.message}`);

            // Attempt to backup and recreate session
            await this.backupCorruptedSession();

            // Create fresh session
            const { state, saveCreds } = await useMultiFileAuthState(this.sessionId);
            return { state, saveCreds };
        }
    }

    // Handle session corruption by backing up and cleaning
    async handleSessionCorruption() {
        try {
            await this.backupCorruptedSession();
            logger.info('Session corruption handled, fresh session will be created');
        } catch (error) {
            logger.error('Failed to handle session corruption:', error);
            throw error;
        }
    }

    // Backup corrupted session for debugging
    async backupCorruptedSession() {
        try {
            const backupPath = `${this.sessionId}_corrupted_${Date.now()}`;

            if (await fs.pathExists(this.sessionId)) {
                await fs.move(this.sessionId, backupPath);
                logger.info(`Corrupted session backed up to: ${backupPath}`);
            }
        } catch (error) {
            logger.error('Failed to backup corrupted session:', error);
            // Continue anyway, just remove the corrupted session
            try {
                await fs.remove(this.sessionId);
                logger.info('Corrupted session removed');
            } catch (removeError) {
                logger.error('Failed to remove corrupted session:', removeError);
            }
        }
    }

    // Debounced restart with exponential backoff
    scheduleRestart(delay = 5000) {
        if (isRestarting) {
            logger.warning("Restart already scheduled, ignoring...");
            return;
        }

        isRestarting = true;

        // Clear any existing timeout
        if (restartTimeout) {
            clearTimeout(restartTimeout);
        }

        logger.info(`Scheduling restart in ${delay}ms...`);

        restartTimeout = setTimeout(async () => {
            try {
                logger.info("Executing scheduled restart...");
                await startBot();
            } catch (error) {
                logger.error("Error during scheduled restart:", error);
                // Exponential backoff - double the delay for next attempt
                this.scheduleRestart(Math.min(delay * 2, 60000)); // Max 1 minute
            } finally {
                isRestarting = false;
                restartTimeout = null;
            }
        }, delay);
    }
}

async function clearMessages(m) {
    try {
        if (m === "undefined") return;
        let data;
        // Use normalized m.chat and m.sender (already handles @lid format)
        if (m.message?.conversation) {
            const text = m.message?.conversation.trim();
            if (m.chat.endsWith("g.us")) {
                data = {
                    chatsFrom: "group",
                    remoteJid: m.chat,
                    participant: {
                        fromMe: m.key.fromMe,
                        number: m.sender,
                        pushName: m.pushName,
                        message: text,
                    },
                };
            } else {
                data = {
                    chatsFrom: "private",
                    remoteJid: m.chat,
                    fromMe: m.key.fromMe,
                    pushName: m.pushName,
                    message: text,
                };
            }
            if (typeof text !== "undefined") {
                return data;
            } else {
                return m;
            }
        } else if (m.message?.extendedTextMessage) {
            const text = m.message?.extendedTextMessage.text.trim();
            if (m.chat.endsWith("g.us")) {
                data = {
                    chatsFrom: "group",
                    remoteJid: m.chat,
                    participant: {
                        fromMe: m.key.fromMe,
                        number: m.sender,
                        pushName: m.pushName,
                        message: text,
                    },
                };
            } else {
                data = {
                    chatsFrom: "private",
                    remoteJid: m.chat,
                    fromMe: m.key.fromMe,
                    pushName: m.pushName,
                    message: text,
                };
            }
            if (typeof text !== "undefined") {
                return data;
            } else {
                return m;
            }
        }
    } catch (err) {
        logger.error("Error: ", err);
        return m;
    }
}
const sanitizeBotId = botId => botId.split(":")[0] + "@s.whatsapp.net";

export { Kachina, clearMessages, sanitizeBotId };
