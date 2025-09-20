import User from '../database/models/User.js'

export const handler = {
    command: ['daily', 'harian'],
    category: 'user',
    help: 'Klaim bonus harian',
    isRegistered: true,
    exec: async ({ sock, m }) => {
        try {
            const dailyAmount = await User.claimDaily(m.sender)
            const user = await User.getById(m.sender)
            
            const dailyText = `🎁 *BONUS HARIAN DIKLAIM!*\n\n` +
                            `💰 *Bonus:* +Rp ${dailyAmount.toLocaleString('id-ID')}\n` +
                            `💵 *Balance:* Rp ${user.balance.toLocaleString('id-ID')}\n` +
                            `📊 *Level:* ${user.level}\n\n` +
                            `⏰ *Klaim lagi besok untuk bonus lebih besar!*`
            
            await sock.sendMessage(m.chat, {
                text: dailyText,
                contextInfo: {
                    externalAdReply: {
                        title: '🎁 Daily Bonus Claimed!',
                        body: `+Rp ${dailyAmount.toLocaleString('id-ID')}`,
                        thumbnailUrl: globalThis.ppUrl,
                        sourceUrl: globalThis.newsletterUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })
            
        } catch (error) {
            console.error('Error in daily command:', error)
            if (error.message.includes('already claimed')) {
                await m.reply('❌ Anda sudah mengklaim bonus harian hari ini!\n⏰ Klaim lagi besok ya!')
            } else {
                await m.reply('❌ Terjadi kesalahan saat mengklaim bonus harian!')
            }
        }
    }
}