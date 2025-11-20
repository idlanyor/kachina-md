import { handleGameAnswers } from '../helper/gameHandler.js';
import { GroupHandler } from './groupHandler.js';
import { pluginLoader } from './pluginLoader.js';
import { CommandHandler } from './commandHandler.js';
import Database from '../helper/database.js';
import { logger } from '../helper/logger.js';
import User from '../database/models/User.js';

export class MessageHandler {
    static async processMessage({ command, sock, m, id, sender, noTel, attf, mime }) {
        try {
            if (!command) return;

            // --- HANDLER GAME ANSWERS ---
            const gameHandled = await handleGameAnswers(sock, m);
            if (gameHandled) {
                return;
            }

            // --- AUTO XP SYSTEM ---
            await this.handleAutoXP(sock, m);

            // Tambahkan pengecekan prefix setelah game handler
            if (!command.startsWith('.') && !command.startsWith('!')) {
                return;
            }

            // --- FITUR ANTILINK GRUP ---
            const antiLinkHandled = await GroupHandler.handleAntiLink(sock, m, command);
            if (antiLinkHandled) return;

            // --- FITUR ANTITOXIC GRUP ---
            const antiToxicHandled = await GroupHandler.handleAntiToxic(sock, m, command);
            if (antiToxicHandled) return;

            // Cek mode bot
            const settings = await Database.getSettings();
            const isOwner = await m.isOwner;

            if (settings.botMode === 'self-me' && !isOwner) {
                return;
            }

            if (settings.botMode === 'self-private') {
                if (id.endsWith('@g.us')) {
                    return;
                }
            }

            // --- RESTRIKSI BOT ADMIN DI GRUP ---
            if (m.isGroup) {
                const isBotAdmin = await m.isBotAdmin;
                if (!isBotAdmin) {
                    await m.reply(`🚫 *BOT TIDAK ADMIN*\n\nMaaf, bot harus menjadi admin di grup ini untuk dapat mengakses menu dan fitur.\n\nSilakan hubungi admin grup untuk menjadikan bot sebagai admin terlebih dahulu.`);
                    return;
                }
            }

            let cmd = '';
            let args = [];

            // Improved command parsing logic
            if (command.startsWith('.') || command.startsWith('!')) {
                cmd = command.toLowerCase().substring(1).split(' ')[0];
                args = command.split(' ').slice(1);

                // Log eksekusi command
                logger.info('⚡ EXECUTE COMMAND');
                logger.info(`├ Command : ${cmd}`);
                logger.info(`├ Args    : ${args.join(' ') || '-'}`);
                logger.info(`├ From    : ${m.pushName || 'Unknown'} (@${noTel})`);
                logger.info(`└ Chat    : ${id.endsWith('@g.us') ? '👥 Group' : '👤 Private'}`);
                logger.divider();
            } else {
                return;
            }

            // Load plugins
            await pluginLoader.loadPlugins();
            const matchedHandler = pluginLoader.getPlugin(cmd);

            if (matchedHandler) {
                // Blokir fitur kategori 'jadibot' pada bot child (jadibot)
                if ((matchedHandler.category === 'jadibot' || matchedHandler.category === 'JADIBOT') && sock.isChildBot) {
                    await sock.sendButtons(m.chat, {
                        text: '🚫 Fitur ini hanya tersedia di bot induk.',
                        footer: 'Gunakan bot utama untuk akses jadibot',
                        buttons: [
                            { id: 'statusjadibot', text: 'Cek Status (Induk)' },
                            { id: 'jadibotinfo', text: 'Info Jadibot' }
                        ]
                    }, { quoted: m });
                    return;
                }
                // Validasi permission
                if (matchedHandler.isAdmin && !(await m.isAdmin)) {
                    await m.reply('❌ *Akses ditolak*\nHanya admin yang dapat menggunakan perintah ini!');
                    return;
                }

                if (matchedHandler.isBotAdmin && !(await m.isBotAdmin)) {
                    await m.reply('❌ Bot harus menjadi admin untuk menggunakan perintah ini!');
                    return;
                }

                if (matchedHandler.isOwner && !(await m.isOwner)) {
                    await m.reply('❌ Perintah ini hanya untuk owner bot!');
                    return;
                }

                if (matchedHandler.isGroup && !m.isGroup) {
                    await m.reply('❌ Perintah ini hanya dapat digunakan di dalam grup!');
                    return;
                }

                await matchedHandler.exec({
                    sock, m, id,
                    args: args.join(' '),
                    sender, noTel,
                    attf, cmd, mime
                });
                return;
            }

            // Handle built-in commands
            const builtinHandled = await CommandHandler.handleBuiltinCommands(sock, m, cmd, args);
            if (builtinHandled) return;

        } catch (error) {
            logger.error(`Kesalahan memproses pesan`, error);
        }
    }

    static async handleAutoXP(sock, m) {
        try {
            // Skip jika m.sender tidak ada
            if (!m.sender) return;

            // Skip jika pesan dari bot sendiri
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            if (m.sender === botId) return;

            // Skip jika pesan kosong atau hanya whitespace
            const messageText = m.message?.conversation ||
                m.message?.extendedTextMessage?.text ||
                m.message?.imageMessage?.caption ||
                m.message?.videoMessage?.caption || '';

            if (!messageText || messageText.trim().length === 0) return;

            // Ambil atau buat user
            let user = await User.getById(m.sender);
            if (!user) {
                user = await User.register(m.sender, m.pushName || 'Unknown');
            }

            // Hitung XP berdasarkan panjang pesan (1-10 XP)
            const messageLength = messageText.length;
            let xpGain = Math.min(Math.max(Math.floor(messageLength / 10), 1), 10);

            // Bonus XP untuk grup (1.5x)
            if (m.isGroup) {
                xpGain = Math.floor(xpGain * 1.5);
            }

            // Bonus XP untuk media (2x)
            if (['image', 'video', 'audio', 'document'].includes(m.type)) {
                xpGain *= 2;
            }

            // Tambahkan XP dan cek level up
            const levelUpResult = await User.addExperience(m.sender, xpGain);

            if (levelUpResult.leveledUp) {
                // Level up detected! Send level up notification
                await this.sendLevelUpNotification(sock, m, levelUpResult);
            }

        } catch (error) {
            logger.error('Error in auto XP system:', error);
        }
    }

    static async sendLevelUpNotification(sock, m, levelUpResult) {
        try {
            const { user, previousLevel, newLevel, xpGained } = levelUpResult;
            
            // Validasi dan fallback untuk previousLevel
            const safePreviousLevel = previousLevel ?? (newLevel - 1) ?? 1;
            const safeNewLevel = newLevel ?? 1;
            
            // Ambil avatar user
            let avatarUrl;
            try {
                avatarUrl = await sock.profilePictureUrl(m.sender, 'image');
            } catch {
                avatarUrl = 'https://telegra.ph/file/a6f3ef42e42b098b2c9c4.jpg';
            }
        
            // Buat level up image menggunakan API canvas
            const canvasParams = {
                avatar: avatarUrl,
                name: encodeURIComponent(m.pushName || user?.name || 'User'),
                level: safeNewLevel,
                background: 'https://telegra.ph/file/8a6c4b4b6b4b4b4b4b4b4.jpg'
            };
        
            const canvasUrl = `https://api.siputzx.my.id/api/canvas/levelup?` + 
                new URLSearchParams(canvasParams).toString();
        
            // Hitung reward
            const balanceReward = safeNewLevel * 1000; // 1000 per level
            const bonusXP = Math.floor(safeNewLevel * 50); // 50 XP bonus per level
        
            // Berikan reward balance saja (JANGAN tambah XP lagi untuk menghindari spam)
            await User.addBalance(m.sender, balanceReward);
        
            // Kirim notifikasi level up dengan fallback value
            const levelUpMessage = `🎉 *LEVEL UP!* 🎉\n\n` +
                `Selamat @${m.sender.split('@')[0]}!\n` +
                `Kamu naik level dari *${safePreviousLevel}* ke *${safeNewLevel}*!\n\n` +
                `🎁 *Reward:*\n` +
                `💰 Balance: +${balanceReward.toLocaleString('id-ID')}\n` +
                `⭐ Bonus XP: +${bonusXP}\n\n` +
                `Terus aktif untuk naik level lebih tinggi! 🚀`;
        
            // try {
            //     await sock.sendMessage(m.chat, {
            //         image: { url: canvasUrl },
            //         caption: levelUpMessage,
            //         mentions: [m.sender],
            //         contextInfo: {
            //             externalAdReply: {
            //                 title: `🎉 Level Up! 🎉`,
            //                 body: `${m.pushName || 'User'} naik ke level ${safeNewLevel}!`,
            //                 thumbnailUrl: avatarUrl,
            //                 sourceUrl: canvasUrl,
            //                 mediaType: 1,
            //                 renderLargerThumbnail: true
            //             }
            //         }
            //     });
            // } catch (canvasError) {
            //     // Fallback ke teks jika canvas gagal
            //     console.log(canvasError)
            //     await sock.sendMessage(m.chat, {
            //         text: levelUpMessage,
            //         mentions: [m.sender]
            //     });
            // }
        
        } catch (error) {
            logger.error('Error sending level up notification:', error);
        }
    }
}
