import UnifiedGroup from '../database/models/UnifiedGroup.js'

export const handler = {
    command: ['gcinfo'],
    help: 'Show group and member information',
    category: 'group',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: true,
    exec: async ({ sock, m, args }) => {
        try {
            if (!m.isGroup) {
                return await m.reply('❌ *Group Only*\nThis command can only be used in groups.')
            }

            const groupId = m.chat
            const settings = await UnifiedGroup.getSettings(groupId)
            const groupMetadata = await sock.groupMetadata(groupId)

            console.log(groupMetadata)

            // Get linked parent group name if exists
            let parentGroupName = null
            if (groupMetadata.linkedParent) {
                try {
                    const parentMetadata = await sock.groupMetadata(groupMetadata.linkedParent)
                    parentGroupName = parentMetadata.subject
                } catch (error) {
                    console.log('Failed to fetch parent group metadata:', error.message)
                    parentGroupName = 'Unknown Parent Group'
                }
            }

            // Get member info if mentioned
            const targetJid = m.mentionedJid?.[0]
            let memberInfo = null

            if (targetJid) {
                const warnings = await UnifiedGroup.getMemberWarnings(groupId, targetJid)
                const isBanned = await UnifiedGroup.isMemberBanned(groupId, targetJid)
                const warningCount = warnings.length

                memberInfo = {
                    id: targetJid,
                    name: groupMetadata.participants.find(p => p.id === targetJid)?.name || 'Unknown',
                    warnings: warningCount,
                    isBanned: isBanned,
                    warningHistory: warnings.slice(-3) // Last 3 warnings
                }
            }

            // Group statistics
            const totalMembers = groupMetadata.participants.length
            const adminParticipants = groupMetadata.participants.filter(p => p.admin)
            const admins = adminParticipants.length
            const bannedMembers = (settings.bannedMembers || []).length
            const totalWarnings = Object.values(settings.warnedMembers || {}).reduce((sum, warnings) => sum + warnings.length, 0)

            // Format admin list
            const adminList = adminParticipants.map((admin, index) => {
                const phone = admin.id.split('@')[0]
                return `${index + 1}. @${phone}`
            }).join('\n')

            // Format group owner info
            const ownerInfo = groupMetadata.ownerJid ? `@${groupMetadata.ownerJid.split('@')[0]}` : 'Unknown'

            // Format creation date
            const creationDate = groupMetadata.creation ? new Date(groupMetadata.creation * 1000).toLocaleDateString('id-ID') : 'Unknown'

            // Format subject time (when group name was last changed)
            const subjectTime = groupMetadata.subjectTime ? new Date(groupMetadata.subjectTime * 1000).toLocaleDateString('id-ID') : 'Unknown'

            const infoMsg = `┌───「 *INFORMASI GRUP* 」
│
├ 🏷️ *Nama Grup:* ${groupMetadata.subject}
├ 👥 *Total Anggota:* ${totalMembers}
├ 👮 *Admin:* ${admins}
├ 🚫 *Anggota Dibanned:* ${bannedMembers}
├ ⚠️ *Total Peringatan:* ${totalWarnings}
├ 👑 *Pemilik Grup:* ${ownerInfo}
├ 📅 *Dibuat:* ${creationDate}
├ 🔄 *Nama Diubah:* ${subjectTime}
${parentGroupName ? `├ 🔗 *Grup Induk:* ${parentGroupName}` : ''}
│
├ 👮 *Daftar Admin:*
${adminList}
│
├ 📈 *Statistik Grup:*
│ • Pesan: ${(settings.stats || {}).messages || 0}
│ • Perintah: ${(settings.stats || {}).commands || 0}
│ • Kick: ${(settings.stats || {}).kicks || 0}
│ • Banned: ${(settings.stats || {}).bans || 0}
│ • Peringatan: ${(settings.stats || {}).warnings || 0}
│
├ 🛡️ *Pengaturan Moderasi:*
│ • Welcome: ${settings.welcome ? '✅ Aktif' : '❌ Nonaktif'}
│ • Goodbye: ${settings.goodbye ? '✅ Aktif' : '❌ Nonaktif'}
│ • Anti-Spam: ${settings.antiSpam ? '✅ Aktif' : '❌ Nonaktif'}
│ • Anti-Link: ${settings.antiLink ? '✅ Aktif' : '❌ Nonaktif'}
│ • Anti-Toxic: ${settings.antiToxic ? '✅ Aktif' : '❌ Nonaktif'}
│ • Anti-Media: ${settings.antiMedia ? '✅ Aktif' : '❌ Nonaktif'}
│
${memberInfo ? `
├ 👤 *Informasi Anggota:*
│ • Nama: ${memberInfo.name}
│ • Peringatan: ${memberInfo.warnings}/3
│ • Status: ${memberInfo.isBanned ? '🚫 Dibanned' : '✅ Aktif'}
${memberInfo.warningHistory.length > 0 ? `
│
├ 📋 *Peringatan Terakhir:*
│ ${memberInfo.warningHistory.map((w, i) =>
                `${i + 1}. ${w.reason} (${new Date(w.warnedAt).toLocaleDateString('id-ID')})`
            ).join('\n│ ')}` : ''}` : ''}
│
├ 💡 *Perintah Cepat:*
│ • \`!warn @user\` - Beri peringatan
│ • \`!kick @user\` - Keluarkan anggota
│ • \`!ban @user\` - Banned anggota
│ • \`!settings\` - Konfigurasi pengaturan
│
└─────────────────────`

            await sock.sendMessage(m.chat, { text: infoMsg, mentions: [...adminParticipants.map(a => a.id), ...(groupMetadata.ownerJid ? [groupMetadata.ownerJid] : [])] }, { quoted: m })

        } catch (error) {
            console.error('Group info error:', error)
            await m.reply('❌ *Error*\nGagal memuat informasi grup. Silakan coba lagi.')
        }
    }
}

export default handler