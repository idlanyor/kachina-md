export const handler = {
    command: 'demote',
    category: 'group',
    help: 'Menurunkan pangkat anggota grup dari Admin',
    isAdmin: true,
    isBotAdmin: true,
    isOwner: false,
    isGroup: true,
    exec: async ({ sock, m, id, args }) => {
        try {
            let userJid
            console.log('quoted', m.quoted?.sender)

            if (m.quoted) {
                userJid = m.quoted.sender
            }
            // Jika tidak ada quoted, cek mention
            else if (args) {
                userJid = args.replace('@', '') + '@lid'
            }
            else {
                await m.reply('📋 Format: !demote @user atau reply pesan user')
                return
            }

            // Cek apakah target adalah admin
            const groupMetadata = await sock.groupMetadata(id)
            const isTargetAdmin = groupMetadata.participants.find(p => {
                console.log('participant id', p.id)
                console.log('userjid', userJid)
                return p.id === userJid
            })?.admin
            if (!isTargetAdmin) {
                await m.reply('Gagal: Pengguna yang ditag bukan admin!')
                return
            }

            // Cek apakah target adalah owner grup
            if (isTargetAdmin === 'superadmin') {
                await m.reply('Gagal: Tidak dapat menurunkan pangkat owner grup!')
                return
            }

            try {
                await sock.groupParticipantsUpdate(id, [userJid], 'demote')
                await sock.sendMessage(id, { text: `Berhasil menurunkan @${userJid.split('@')[0]} dari admin`, mentions: [userJid] })
            } catch (updateError) {
                if (updateError.toString().includes('forbidden')) {
                    await m.reply('Gagal: Bot tidak memiliki izin untuk menurunkan admin!')
                } else if (updateError.toString().includes('not-authorized')) {
                    await m.reply('Gagal: Bot harus menjadi admin untuk menurunkan admin!')
                } else {
                    throw updateError
                }
            }
        } catch (error) {
            console.error('Error in demote:', error)
            await m.reply('Terjadi kesalahan internal')
        }
    }
}

export default handler
