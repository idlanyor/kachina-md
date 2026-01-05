import UnifiedGroup from '../database/models/UnifiedGroup.js'

export const handler = {
    command: ['unban'],
    category: 'group',
    help: 'Unban a member from group',
    isAdmin: true,
    isBotAdmin: true,
    isOwner: false,
    isGroup: true,
    exec: async ({ sock, m, args }) => {
        try {
            if (!m.isGroup) {
                return await m.reply('❌ *Hanya Grup*\nPerintah ini hanya dapat digunakan di dalam grup.')
            }

            if (!m.isAdmin) {
                return await m.reply('❌ *Hanya Admin*\nHanya admin grup yang dapat menggunakan perintah ini.')
            }

            const targetJid = m.mentionedJid?.[0]
            if (!targetJid) {
                return await m.reply('❌ *Penggunaan Salah*\nSilakan sebutkan pengguna yang akan di-unban.\n\nPenggunaan: !unban @user')
            }

            const groupId = m.chat

            // Check if member is banned in database
            if (!(await UnifiedGroup.isMemberBanned(groupId, targetJid))) {
                return await m.reply('❌ *Tidak Dibanned*\nAnggota ini tidak dibanned dari grup.')
            }

            // Add loading reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            })

            try {
                // Get ban info before unbanning for better message
                const settings = await UnifiedGroup.getSettings(groupId)
                const banInfo = settings.bannedMembers.find(m => m.id === targetJid)
                const banReason = banInfo?.reason || 'Tidak ada alasan'
                const banDate = banInfo?.bannedAt ? new Date(banInfo.bannedAt).toLocaleString('id-ID') : 'Tidak diketahui'
                
                // Unban member from database
                await UnifiedGroup.unbanMember(groupId, targetJid)
                
                const adminName = m.pushName || m.sender.split('@')[0]
                
                const unbanMsg = `┌───「 *ANGGOTA DI-UNBAN* 」
│
├ 👤 *User:* @${targetJid.split('@')[0]}
├ 👮 *Di-unban oleh:* @${m.sender.split('@')[0]}
├ 📝 *Alasan Ban Awal:* ${banReason}
├ 🕒 *Waktu Ban:* ${banDate}
├ 🕒 *Waktu Unban:* ${new Date().toLocaleString('id-ID')}
│
└ Anggota telah di-unban dan sekarang dapat mengirim pesan kembali.

🤖 _Powered by Kachina-MD_`

                await m.reply(unbanMsg, { mentions: [targetJid, m.sender] })
                
                // Add success reaction
                await sock.sendMessage(m.chat, {
                    react: { text: '✅', key: m.key }
                })

            } catch (error) {
                console.error('Unban error:', error)
                await m.reply('❌ *Gagal Meng-unban*\nTidak dapat meng-unban anggota.')
                
                // Add error reaction
                await sock.sendMessage(m.chat, {
                    react: { text: '❌', key: m.key }
                })
            }

        } catch (error) {
            console.error('Unban command error:', error)
            await m.reply('❌ *Error*\nGagal menjalankan perintah unban. Silakan coba lagi.')
        }
    }
}

export default handler