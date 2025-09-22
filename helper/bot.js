import { makeWASocket, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, makeInMemoryStore, useMultiFileAuthState, DisconnectReason, Browsers } from 'baileys';
import pino from "pino";
import NodeCache from "node-cache";
import chalk from 'chalk';
import fs from 'fs-extra';
import { startBot } from "../main.js";

class Kachina {
    constructor(data, io = null) {
        this.phoneNumber = data.phoneNumber;
        this.sessionId = data.sessionId;
        this.useStore = data.useStore;
        this.io = io;
    }

    async start() {
        const msgRetryCounterCache = new NodeCache();
        const useStore = this.useStore;
        const MAIN_LOGGER = pino({
            timestamp: () => `,"time":"${new Date().toJSON()}"`,
        });

        const logger = MAIN_LOGGER.child({});
        logger.level = "silent";

        const store = useStore ? makeInMemoryStore({ logger }) : undefined;
        store?.readFromFile(`store-${this.sessionId}.json`);

        setInterval(() => {
            store?.writeToFile(`store-${this.sessionId}.json`);
        }, 10000 * 6);

        const P = pino({
            level: "silent",
        });
        let { state, saveCreds } = await useMultiFileAuthState(this.sessionId);
        let { version, isLatest } = await fetchLatestBaileysVersion();
        const sock = makeWASocket({
            version,
            shouldSyncHistoryMessage: () => false,
            logger: P,
            printQRInTerminal: false,
            browser: Browsers.macOS("Safari"),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, P),
            },
            msgRetryCounterCache,
            
        });

        store?.bind(sock.ev);

        sock.ev.on("creds.update", saveCreds);

        if (!sock.authState.creds.registered) {
            console.log(chalk.yellowBright("Menunggu Pairing Code"));
            globalThis.io.emit("broadcastMessage", `Menunggu Pairing Code`);
            const number = this.phoneNumber;
            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

            let retryCount = 0;
            const maxRetries = 1;

            while (retryCount < maxRetries) {
                try {
                    await delay(6000);
                    const code = await sock.requestPairingCode(number);
                    console.log(chalk.green("Kode Pairing: "), chalk.bgGreen.black(code));
                    globalThis.io.emit("broadcastMessage", "Koneksi terhubung");
                    globalThis.io.emit("pairCode", `${code}`);
                    break; // Kalo sukses, break loop
                } catch (err) {
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        await fs.remove(`./${this.sessionId}`);
                        await startBot();
                    }
                }
            }
        }

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "connecting") {
                console.log(chalk.blue("Memulai koneksi soket"));
                globalThis.io.emit("broadcastMessage", "Memulai koneksi soket");
            } else if (connection === "open") {
                console.log(chalk.green("Soket terhubung"));
                globalThis.io.emit("broadcastMessage", "Soket terhubung");
            } else if (connection === "close") {
                console.log(chalk.red("Koneksi terputus, mencoba kembali..."));
                globalThis.io.emit("broadcastMessage", "Koneksi terputus, mencoba kembali...");
                const reason = lastDisconnect?.error?.output?.statusCode;

                if (reason === DisconnectReason.loggedOut) {
                    console.log(chalk.red("Sesi tidak valid, akan dihapus..."));
                    globalThis.io.emit("broadcastMessage", "Sesi tidak valid, akan dihapus...");

                    // Remove session folder when logged out with proper error handling
                    try {
                        await fs.remove(`./${this.sessionId}`);
                        console.log(chalk.yellow(`Session folder ${this.sessionId} berhasil dihapus`));
                        globalThis.io.emit("broadcastMessage", `Session folder ${this.sessionId} berhasil dihapus`);
                    } catch (error) {
                        console.log(chalk.red(`Gagal menghapus session folder: ${error.message}`));
                        globalThis.io.emit("broadcastMessage", `Gagal menghapus session folder: ${error.message}`);
                    }

                    // Restart with delay for logout
                    setTimeout(async () => {
                        console.log(chalk.green("Memulai ulang bot setelah logout..."));
                        globalThis.io.emit("broadcastMessage", "Memulai ulang bot setelah logout...");
                        await startBot();
                    }, 3000);
                } else if (reason === DisconnectReason.connectionClosed ||
                    reason === DisconnectReason.connectionLost ||
                    reason === DisconnectReason.restartRequired) {
                    // Restart with delay for connection issues
                    setTimeout(async () => {
                        console.log(chalk.red("Koneksi terputus, mencoba kembali..."));
                        globalThis.io.emit("broadcastMessage", "Koneksi terputus, mencoba kembali...");
                        await startBot();
                    }, 5000);
                } else {
                    // Unknown disconnect reason
                    setTimeout(async () => {
                        console.log(chalk.red(`Unknown disconnect reason: ${reason}, restarting...`));
                        globalThis.io.emit("broadcastMessage", `Unknown disconnect reason: ${reason}, restarting...`);
                        await startBot();
                    }, 10000);
                }
            }
        });

        // sock.ev.on("connection.update", async update => {
        //     const { connection, lastDisconnect } = update;
        //     if (connection === "connecting") {
        //         console.log(chalk.blue("Memulai koneksi soket"));
        //     } else if (connection === "open") {
        //         console.log(chalk.green("Soket terhubung"));
        //     } else if (connection === "close") {
        //         const reason = lastDisconnect?.error?.output?.statusCode;

        //         if (reason === DisconnectReason.loggedOut) {
        //             console.log(chalk.red("Sesi ora valid, bakal dihapus..."));

        //             // Hapus folder sesi kalo sesi logout
        //             await fs.remove(`./${this.sessionId}`);
        //             console.log(chalk.yellow(`Folder sesi ${this.sessionId} dihapus, login ulang...`));

        //             // Login ulang tanpa nge-delay
        //             console.log(chalk.green("Login ulang berhasil. Eksekusi tugas selanjutnya..."));
        //             await startBot();
        //         } else {
        //             console.log(chalk.red("Koneksi terputus, mencoba kembali..."));
        //             await startBot();
        //         }
        //     }
        // });

        return sock;
    }
}

async function clearMessages(m) {
    try {
        if (m === "undefined") return;
        let data;
        if (m.message?.conversation) {
            const text = m.message?.conversation.trim();
            if (m.key.remoteJid.endsWith("g.us")) {
                data = {
                    chatsFrom: "group",
                    remoteJid: m.key.remoteJid,
                    participant: {
                        fromMe: m.key.fromMe,
                        number: m.key.participant,
                        pushName: m.pushName,
                        message: text,
                    },
                };
            } else {
                data = {
                    chatsFrom: "private",
                    remoteJid: m.key.remoteJid,
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
            if (m.key.remoteJid.endsWith("g.us")) {
                data = {
                    chatsFrom: "group",
                    remoteJid: m.key.remoteJid,
                    participant: {
                        fromMe: m.key.fromMe,
                        number: m.key.participant,
                        pushName: m.pushName,
                        message: text,
                    },
                };
            } else {
                data = {
                    chatsFrom: "private",
                    remoteJid: m.key.remoteJid,
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
        console.log(chalk.red("Error: "), err);
        return m;
    }
}
const sanitizeBotId = botId => botId.split(":")[0] + "@s.whatsapp.net";

export { Kachina, clearMessages, sanitizeBotId };
