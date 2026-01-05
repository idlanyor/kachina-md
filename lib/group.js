// import { Welcome } from "./canvafy.js";
import { getGroupMetadata } from '../helper/group.js'
import Group from '../database/models/Group.js'



export async function groupParticipants(ev, sock) {
    try {
        console.log('Group participants event:', ev)
        const { id, participants, action } = ev
        const metadata = await getGroupMetadata({ sock, id })
        if (!metadata) {
            console.error('Failed to get group metadata for:', id)
            return
        }
        const settings = await Group.getSettings(id)

        if ((!settings.welcome && action === 'add') || (!settings.leave && action === 'remove')) {
            return
        }

        for (const num of participants) {
            let ppuser
            try {
                ppuser = await sock.profilePictureUrl(num, 'image')
            } catch {
                ppuser = 'https://s3.ryzumi.vip/ryzumi-api/62109931ae93df4a132534b6.jpg'
            }

            const participant = metadata.participants.find(p => p.id === num)
            const isAdmin = participant?.admin ? '👑 Admin Group' : '👤 Member Group'

            if (action === 'add' && settings.welcome) {
                const caption = `╭─「 *WELCOME* 」
├ 👋 Halo @${num.split('@')[0]}!
├ Selamat datang di
├ ${metadata.subject}
│
├ 📝 *INFO MEMBER*
├ • Nama: @${num.split('@')[0]}
├ • Status: ${isAdmin}
├ • Member ke: ${metadata.participants.length}
│
├ 📜 *DESKRIPSI GRUP*
${metadata.desc ? metadata.desc.split('\n').map(line => '├ ' + line).join('\n') : '├ Tidak ada deskripsi'}
│
├ 🎉 Selamat bergabung dan
├ semoga betah di sini!
╰──────────────────`

                await sock.sendMessage(id, {
                    image: { url: ppuser },
                    caption: caption,
                    mentions: [num],
                    contextInfo: {
                        forwardingScore: 9999999,
                        isForwarded: true,
                        externalAdReply: {
                            title: '👋 Welcome to Group',
                            body: metadata.subject,
                            mediaType: 1,
                            thumbnailUrl: ppuser,
                            sourceUrl: globalThis.newsletterUrl,
                            renderLargerThumbnail: true
                        }
                    }
                })

            } else if (action === 'remove' && settings.leave) {
                const caption = `╭─「 *GOODBYE* 」
├ 👋 Selamat tinggal
├ @${num.split('@')[0]}
│
├ 📝 *INFO MEMBER*
├ • Status: ${isAdmin}
├ • Member tersisa: ${metadata.participants.length}
│
├ 🚪 Terima kasih sudah
├ bergabung di grup ini
╰──────────────────`

                await sock.sendMessage(id, {
                    image: { url: ppuser },
                    caption: caption,
                    mentions: [num],
                    contextInfo: {
                        forwardingScore: 9999999,
                        isForwarded: true,
                        externalAdReply: {
                            title: '👋 Goodbye from Group',
                            body: metadata.subject,
                            mediaType: 1,
                            thumbnailUrl: ppuser,
                            sourceUrl: globalThis.newsletterUrl,
                            renderLargerThumbnail: true
                        }
                    }
                })
            }
        }
    } catch (error) {
        console.error('Error in groupParticipants:', error)
    }
}

async function promote(jid, participants, sock) {
    return await sock.groupParticipantsUpdate(jid, [participants], 'promote')
}
async function demote(jid, participants, sock) {
    return await sock.groupParticipantsUpdate(jid, [participants], 'demote')
}

export const grupAction = {
    promote, demote
}


