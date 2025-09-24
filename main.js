import './global.js'
import { Kachina, clearMessages, sanitizeBotId } from './bot.js';
import { logger } from './helper/logger.js';
import { getMedia } from './helper/mediaMsg.js';
import { cacheGroupMetadata } from './helper/caching.js';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import readline from 'readline';
import { call } from './lib/call.js';
import { addMessageHandler } from './helper/message.js';
import Database from './helper/database.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import autoNotification from './helper/scheduler.js';
import { MessageHandler } from './handlers/messageHandler.js';
import { GroupHandler } from './handlers/groupHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

export function findJsFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findJsFiles(filePath));
        } else if (file.endsWith('.js')) {
            results.push(filePath);
        }
    });
    return results;
}

async function getPhoneNumber() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        const askNumber = () => {
            rl.question(chalk.cyan('Masukkan nomor WhatsApp (dengan kode negara, contoh: 628123456789): '), (input) => {
                const phoneNumber = input.trim();

                // Validasi nomor telepon
                if (!/^\d{10,15}$/.test(phoneNumber)) {
                    console.log(chalk.red('❌ Format nomor tidak valid! Gunakan format: 628123456789'));
                    askNumber();
                    return;
                }

                // Validasi kode negara Indonesia
                if (!phoneNumber.startsWith('62')) {
                    console.log(chalk.yellow('⚠️  Pastikan menggunakan kode negara Indonesia (62)'));
                    rl.question(chalk.cyan('Lanjutkan dengan nomor ini? (y/n): '), (confirm) => {
                        if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
                            rl.close();
                            resolve(phoneNumber);
                        } else {
                            askNumber();
                        }
                    });
                    return;
                }

                rl.close();
                resolve(phoneNumber);
            });
        };

        askNumber();
    });
}

async function getLoginMethod() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        console.log(chalk.cyan('\n📱 Pilih metode login:'));
        console.log(chalk.white('1. QR Code (scan dengan WhatsApp)'));
        console.log(chalk.white('2. Pairing Code (masukkan kode di WhatsApp)'));

        const askMethod = () => {
            rl.question(chalk.cyan('\nPilih metode (1/2): '), (input) => {
                const choice = input.trim();

                if (choice === '1') {
                    rl.close();
                    resolve('qr');
                } else if (choice === '2') {
                    rl.close();
                    resolve('pairing');
                } else {
                    console.log(chalk.red('❌ Pilihan tidak valid! Pilih 1 atau 2'));
                    askMethod();
                }
            });
        };

        askMethod();
    });
}

export async function startBot() {
    try {
        logger.showBanner();

        // Cek keberadaan session terlebih dahulu
        const sessionPath = `./${globalThis.sessionName}`;
        const sessionExists = await fs.pathExists(sessionPath);

        let phoneNumber, loginMethod;

        if (!sessionExists) {
            // Untuk session baru, selalu tanya metode login
            loginMethod = await getLoginMethod();

            // Hanya minta nomor telepon jika menggunakan pairing code
            if (loginMethod === 'pairing') {
                phoneNumber = await getPhoneNumber();
            } else {
                phoneNumber = ''; // QR code tidak perlu nomor telepon
            }
        } else {
            // Session sudah ada, gunakan session yang ada
            phoneNumber = globalThis.botNumber || '';
            loginMethod = 'existing';
        }

        const bot = new Kachina({
            phoneNumber,
            sessionId: globalThis.sessionName,
            useStore: false,
            loginMethod
        });

        bot.start().then(async (sock) => {
            logger.success('Bot berhasil dimulai!');
            logger.divider();

            autoNotification.init(sock);

            sock.ev.on('messages.upsert', async chatUpdate => {
                try {
                    let m = chatUpdate.messages[0];
                    m = addMessageHandler(m, sock);
                    if (!m.key?.fromMe) return
                    await Database.addMessage();

                    if (m.type === 'text' && m.message?.conversation?.startsWith('!')) {
                        await Database.addCommand();
                    }

                    const { remoteJid } = m.key;
                    const sender = m.pushName || remoteJid;
                    const id = remoteJid;
                    const noTel = (id.endsWith('@g.us')) ? m.key.participant?.split('@')[0]?.replace(/[^0-9]/g, '') : id.split('@')[0]?.replace(/[^0-9]/g, '');
                    const mediaTypes = ['image', 'video', 'audio'];

                    // Untuk grup, gunakan cached group metadata
                    if (m.isGroup) {
                        await cacheGroupMetadata(sock, id);
                    }

                    // Cek apakah pesan dari bot sendiri
                    const botId = sanitizeBotId(sock.user.id);

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
                            await MessageHandler.processMessage({ command: `!${cmd}`, sock, m, id, sender, noTel });
                            break;
                        }
                    }

                    const chat = await clearMessages(m);
                    if (chat) {
                        const parsedMsg = chat.chatsFrom === "private" ? chat.message : chat.participant?.message;
                        await MessageHandler.processMessage({ command: parsedMsg, sock, m, id, sender, noTel });
                    }

                } catch (error) {
                    logger.error('Kesalahan menangani pesan:', error);
                }
            });

            sock.ev.on('call', (callEv) => {
                call(callEv, sock)
            })

            // Event handler untuk welcome dan leave message
            sock.ev.on('group-participants.update', async (update) => {
                await GroupHandler.handleGroupParticipantsUpdate(sock, update);
            });

        }).catch(error => {
            logger.error('Error starting bot:', error);
        });

    } catch (error) {
        logger.error('Error in startBot:', error);
    }
}

async function runtime() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
}

startBot();