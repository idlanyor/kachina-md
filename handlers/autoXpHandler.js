import User from '../database/models/User.js';
import { logger } from '../helper/logger.js';

export async function handleAutoXP(sock, m) {
    try {
        // Skip jika pesan dari bot sendiri
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (m.sender === botId) return;

        // Skip jika pesan adalah command
        const messageText = m.message?.conversation || 
                           m.message?.extendedTextMessage?.text || 
                           m.message?.imageMessage?.caption || 
                           m.message?.videoMessage?.caption || '';
        
        if (messageText.startsWith('.') || messageText.startsWith('!')) return;

        // Berikan XP untuk aktivitas chat
        const user = await User.getById(m.sender);
        if (!user) {
            // Auto register user jika belum terdaftar
            await User.register(m.sender, m.pushName || 'Unknown');
        }

        // Tambah XP berdasarkan tipe pesan
        let xpGain = 1; // Default XP untuk text
        
        if (m.type === 'image' || m.type === 'video') {
            xpGain = 3; // Lebih banyak XP untuk media
        } else if (m.type === 'audio') {
            xpGain = 2;
        }

        // Bonus XP untuk grup aktif
        if (m.isGroup) {
            xpGain += 1;
        }

        const result = await User.addExperience(m.sender, xpGain);
        
        // Jika level up, kirim notifikasi
        if (result.leveledUp) {
            const userInfo = await User.getById(m.sender);
            const rankInfo = await User.getUserRankInfo(m.sender);
            
            // Buat level up image dengan API canvas
            const canvasParams = {
                avatar: 'https://telegra.ph/file/a6f3ef42e42b098b2c9c4.jpg',
                name: userInfo.name,
                level: userInfo.level,
                previous_level: userInfo.level - 1
            };

            try {
                // Ambil avatar user dari WhatsApp
                const avatarUrl = await sock.profilePictureUrl(m.sender, 'image').catch(() => null);
                if (avatarUrl) {
                    canvasParams.avatar = avatarUrl;
                }
            } catch (error) {
                logger.error('Error getting profile picture:', error);
            }

            const canvasUrl = `https://api.siputzx.my.id/api/canvas/levelup?${new URLSearchParams(canvasParams).toString()}`;

            // Reward untuk level up
            const balanceReward = userInfo.level * 1000;
            const bonusXP = userInfo.level * 50;
            
            await User.addBalance(m.sender, balanceReward);
            await User.addExperience(m.sender, bonusXP);

            const levelUpMessage = `🎉 *LEVEL UP!* 🎉\n\n` +
                `👤 *${userInfo.name}*\n` +
                `📊 Level: ${userInfo.level - 1} ➜ ${userInfo.level}\n` +
                `⭐ Rank: ${rankInfo.rankName}\n` +
                `💰 Reward: ${balanceReward.toLocaleString()} coins\n` +
                `🎁 Bonus XP: ${bonusXP}\n\n` +
                `Selamat! Terus aktif untuk naik level! 🚀`;

            await sock.sendMessage(m.chat, {
                image: { url: canvasUrl },
                caption: levelUpMessage,
                mentions: [m.sender]
            });
        }
    } catch (error) {
        logger.error('Error in auto XP handler:', error);
    }
}