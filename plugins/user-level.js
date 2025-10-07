import User from '../database/models/User.js'
import canvafy from 'canvafy'

export const handler = {
    command: ['level'],
    description: 'Menampilkan level card dengan canvas',
    help: 'Menampilkan level card user',
    category: 'user',

    async exec({ m, sock, args }) {
        try {
            // Tentukan target user
            const targetJid = m.mentionedJid?.[0] || m.sender
            const viewer = await User.getById(m.sender)
            const user = await User.getById(targetJid)

            // Set locale berdasarkan preferensi pengguna pemanggil
            const userLang = viewer?.preferences?.language || 'id'
            globalThis.localization.setLocale(userLang)

            // Validasi pendaftaran target
            if (!user?.registered) {
                if (targetJid === m.sender) {
                    return m.reply('❌ Kamu belum terdaftar. Ketik .register untuk mendaftar.')
                } else {
                    return m.reply('❌ User tersebut belum terdaftar!')
                }
            }

            // Dapatkan info level dan ranking
            const levelInfo = await User.getLevelInfo(targetJid)
            const rankInfo = await User.getUserRankInfo(targetJid)

            // Get user profile picture
            let avatarUrl
            try {
                avatarUrl = await sock.profilePictureUrl(targetJid, 'image')
            } catch (error) {
                // Fallback to default avatar if user doesn't have profile picture
                avatarUrl = "https://telegra.ph/file/a6f3ef42e42b098b2c9c4.jpg"
            }

            // Create rank card using canvafy
            const rank = await new canvafy.Rank()
                .setAvatar(avatarUrl)
                .setCurrentXp(levelInfo.experience)
                .setRequiredXp(levelInfo.nextLevelXP)
                .setRank(rankInfo.rank || 999)
                .setLevel(levelInfo.level)
                .setUsername(user.name || 'Unknown User')
                .setBackground("color", "#667eea")
                .setBarColor("#4facfe")
                .build()

            // Send level card
            await sock.sendMessage(m.chat, {
                image: rank,
                caption: `🎯 **Level Card**\n\n` +
                    `👤 **User:** ${user.name || 'Unknown'}\n` +
                    `📊 **Level:** ${levelInfo.level}\n` +
                    `⭐ **XP:** ${levelInfo.experience.toLocaleString('id-ID')}\n` +
                    `🎯 **Progress:** ${Math.round(levelInfo.progress)}%\n` +
                    `🏆 **Rank:** #${rankInfo.rank} dari ${rankInfo.totalUsers} user\n` +
                    `📈 **Percentile:** Top ${100 - rankInfo.percentile}%\n` +
                    `💰 **Balance:** ${user.balance?.toLocaleString('id-ID') || 0}\n` +
                    `👑 **Status:** ${user.premiumPlan || 'Free'}\n\n` +
                    `_Gunakan command untuk mendapatkan XP!_`,
                contextInfo: {
                    externalAdReply: {
                        title: `Level ${levelInfo.level} - Rank #${rankInfo.rank}`,
                        body: `${user.name} | Top ${100 - rankInfo.percentile}% | XP: ${levelInfo.experience}`,
                        thumbnailUrl: avatarUrl,
                        sourceUrl: 'https://github.com/kachina-md',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })

        } catch (error) {
            console.error('Error in level command:', error)
            m.reply('❌ Terjadi kesalahan saat membuat level card!')
        }
    }
}

export default handler
