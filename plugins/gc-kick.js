import Database from '../helper/database.js'

export const handler = {
    command: ['dor', 'kick'],
    category: 'group',
    help: 'Mengeluarkan member dari grup\n\nFormat:\n- !kick @user1 @user2\n- !kick (reply pesan)',
    isAdmin: true,
    isBotAdmin: true,
    isOwner: false,
    isGroup: true,
    exec: async ({ sock, m, id, args }) => {
        try {
            let users = []

            // Handle quoted message
            if (m.quoted) {
                const quotedUser = m.quoted?.key?.participant
                if (quotedUser) users.push(quotedUser)
            }

            // Handle mentioned users
            if (m.mentionedJid && m.mentionedJid.length > 0) {
                users.push(...m.mentionedJid)
            }
            // Handle manual input
            else if (args && !m.quoted) {
                const numbers = args.split(' ')
                users = numbers.map(num => num.replace('@', '').replace(/[^0-9]/g, '') + '@s.whatsapp.net')
            }

            // Deduplicate
            users = Array.from(new Set(users.filter(Boolean)))

            if (users.length === 0) {
                await m.reply('📋 Format: !kick @user1 @user2 atau reply pesan user')
                return
            }

            // Get group metadata
            const groupMeta = await sock.groupMetadata(id)
            const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'

            // Filter out invalid numbers and check permissions
            const validUsers = []
            const skipped = []
            for (const user of users) {
                const participant = groupMeta.participants.find(p => p.id === user)
                if (!participant) {
                    skipped.push({ user, reason: 'not_in_group' })
                    continue
                }
                if (user === groupMeta.owner) {
                    skipped.push({ user, reason: 'owner' })
                    continue
                }
                if (user === botNumber) {
                    skipped.push({ user, reason: 'bot' })
                    continue
                }
                // Prevent kicking admins
                if (participant.admin) {
                    skipped.push({ user, reason: 'admin' })
                    continue
                }
                validUsers.push(user)
            }

            if (validUsers.length === 0) {
                const msg = skipped.length
                    ? '❌ Tidak ada target yang valid untuk di-kick.'
                    : '❌ Tidak ada pengguna yang disebut.'
                await m.reply(msg)
                return
            }

            // Kick users
            await sock.groupParticipantsUpdate(id, validUsers, 'remove')

            // Send success message
            const kickedUsers = validUsers.map(user => `@${user.split('@')[0]}`).join(', ')
            let replyMsg = `✅ Berhasil mengeluarkan ${kickedUsers}`
            if (skipped.length) {
                const detail = skipped.map(s => {
                    const tag = `@${s.user.split('@')[0]}`
                    switch (s.reason) {
                        case 'not_in_group': return `${tag} (bukan anggota)`
                        case 'owner': return `${tag} (owner grup)`
                        case 'bot': return `${tag} (bot)`
                        case 'admin': return `${tag} (admin)`
                        default: return `${tag}`
                    }
                }).join(', ')
                replyMsg += `\n\nℹ️ Dilewati: ${detail}`
            }
            await m.reply(replyMsg)

        } catch (error) {
            console.error('Error in kick:', error)
            await m.reply('❌ Gagal mengeluarkan member: ' + error.message)
        }
    }
}

export default handler
