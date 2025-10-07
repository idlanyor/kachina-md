import User from '../database/models/User.js'

export const handler = {
    command: ['bal'],
    category: 'user',
    help: 'Cek balance/saldo Anda',
    isRegistered: true,
    exec: async ({ sock, m, args }) => {
        try {
            const targetJid = m.mentionedJid?.[0] || m.sender
            const user = await User.getById(targetJid)
            const isOwnBalance = targetJid === m.sender

            if (!user?.registered && !isOwnBalance) {
                return await m.reply('❌ User tersebut belum terdaftar!')
            }

            const balanceText = `💰 *${isOwnBalance ? 'BALANCE ANDA' : 'BALANCE USER'}*\n\n` +
                `👤 *Nama:* ${user.name}\n` +
                `💵 *Balance:* Rp ${(user.balance||0).toLocaleString('id-ID')}\n` +
                `📊 *Level:* ${user.level||1}\n` +
                `⭐ *Experience:* ${(user.experience||0).toLocaleString('id-ID')} XP\n` +
                `💎 *Plan:* ${user.premiumPlan||'FREE'}\n\n` +
                `📈 *Total Earned:* Rp ${(user.totalEarned||0).toLocaleString('id-ID')}\n` +
                `📉 *Total Spent:* Rp ${(user.totalSpent||0).toLocaleString('id-ID')}\n\n` +
                `💡 *Tips:* Mainkan game untuk mendapatkan balance!`

            await sock.sendMessage(m.chat, {
                text: balanceText,
                contextInfo: {
                    externalAdReply: {
                        title: '💰 Balance Information',
                        body: `Balance: Rp ${user.balance.toLocaleString('id-ID')}`,
                        thumbnailUrl: globalThis.ppUrl,
                        sourceUrl: globalThis.newsletterUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })

        } catch (error) {
            console.error('Error in balance command:', error)
            await m.reply('❌ Terjadi kesalahan saat mengecek balance!')
        }
    }
}
