import User from '../database/models/User.js'

export const handler = {
    command: ['transfer', 'tf', 'kirim'],
    category: 'user',
    help: 'Transfer balance ke user lain',
    isRegistered: true,
    exec: async ({ sock, m, args }) => {
        try {
            if (!args) {
                return await m.reply('❌ *Cara penggunaan:*\n!transfer @user [jumlah]\n\nContoh: !transfer @user 5000')
            }
            
            const targetJid = m.mentionedJid?.[0]
            const amount = parseInt(args.split(' ')[1])
            
            if (!targetJid) {
                return await m.reply('❌ Mention user yang ingin ditransfer!')
            }
            
            if (!amount || amount < 100) {
                return await m.reply('❌ Jumlah transfer minimal Rp 100!')
            }
            
            if (targetJid === m.sender) {
                return await m.reply('❌ Tidak bisa transfer ke diri sendiri!')
            }
            
            const targetUser = await User.getById(targetJid)
            if (!targetUser.registered) {
                return await m.reply('❌ User tersebut belum terdaftar!')
            }
            
            const result = await User.transferBalance(m.sender, targetJid, amount)
            
            const transferText = `✅ *TRANSFER BERHASIL*\n\n` +
                               `💸 *Jumlah:* Rp ${amount.toLocaleString('id-ID')}\n` +
                               `👤 *Kepada:* ${targetUser.name}\n` +
                               `💰 *Sisa Balance:* Rp ${(await User.getBalance(m.sender)).toLocaleString('id-ID')}`
            
            await sock.sendMessage(m.chat, {
                text: transferText,
                mentions: [targetJid]
            }, { quoted: m })
            
        } catch (error) {
            console.error('Error in transfer command:', error)
            if (error.message.includes('Insufficient balance')) {
                await m.reply('❌ Balance Anda tidak mencukupi!')
            } else {
                await m.reply(`❌ ${error.message}`)
            }
        }
    }
}