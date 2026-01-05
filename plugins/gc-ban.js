import UnifiedGroup from '../database/models/UnifiedGroup.js'

export const handler = {
    command: ['ban'],
    help: 'Ban a member from group',
    category: 'group',
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
                return await m.reply('❌ *Penggunaan Salah*\nSilakan sebutkan pengguna yang akan dibanned.\n\nPenggunaan: !ban @user [alasan]')
            }

            if (targetJid === m.sender) {
                return await m.reply('❌ *Tidak Dapat Membanned Diri Sendiri*\nAnda tidak dapat membanned diri sendiri.')
            }

            if (targetJid === sock.user.id) {
                return await m.reply('❌ *Tidak Dapat Membanned Bot*\nAnda tidak dapat membanned bot.')
            }

            // Get group metadata to check if target is admin
            const groupMetadata = await sock.groupMetadata(m.chat)
            const targetParticipant = groupMetadata.participants.find(p => p.id === targetJid)

            if (targetParticipant?.admin) {
                return await m.reply('❌ *Tidak Dapat Membanned Admin*\nAnda tidak dapat membanned admin.')
            }

            // Extract reason from args (everything after the mention)
            const reason = args.split().filter(arg => !arg.startsWith('@')).join(' ') || 'Tidak ada alasan'
            const groupId = m.chat

            // Check if already banned in database
            if (await UnifiedGroup.isMemberBanned(groupId, targetJid)) {
                return await m.reply('❌ *Sudah Dibanned*\nAnggota ini sudah dibanned dari grup.')
            }

            // Add loading reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            })

            try {
                // Ban member in database
                await UnifiedGroup.banMember(groupId, targetJid, reason)
                
                // Get target user name for better display
                const targetName = targetParticipant?.notify || targetParticipant?.name || targetJid.split('@')[0]
                const adminName = m.pushName || m.sender.split('@')[0]
                
                const banMsg = `┌───「 *ANGGOTA DIBANNED* 」
│
├ 👤 *User:* @${targetJid.split('@')[0]}
├ 📛 *Nama:* ${targetName}
├ 👮 *Dibanned oleh:* @${m.sender.split('@')[0]}
├ 📝 *Alasan:* ${reason}
├ 🕒 *Waktu:* ${new Date().toLocaleString('id-ID')}
│
└ Anggota telah dibanned.
  Pesan mereka akan otomatis dihapus sampai di-unban oleh admin.

🤖 _Powered by Kachina-MD_`

                await m.reply(banMsg, { mentions: [targetJid, m.sender] })
                
                // Add success reaction
                await sock.sendMessage(m.chat, {
                    react: { text: '✅', key: m.key }
                })

            } catch (error) {
                console.error('Ban error:', error)
                await m.reply('❌ *Gagal Membanned*\nTidak dapat membanned anggota. Silakan coba lagi.')
                
                // Add error reaction
                await sock.sendMessage(m.chat, {
                    react: { text: '❌', key: m.key }
                })
            }
        } catch (error) {
            console.error('Ban command error:', error)
            await m.reply('❌ *Error*\nGagal menjalankan perintah ban. Silakan coba lagi.')
        }
    }
}

export default handler