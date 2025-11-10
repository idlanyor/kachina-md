import Group from '../database/models/Group.js'

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
            const settings = await Group.getSettings(groupId)
            const groupMetadata = await sock.groupMetadata(groupId)

            // Get member info if mentioned
            const targetJid = m.mentionedJid?.[0]
            let memberInfo = null

            if (targetJid) {
                const warnings = await Group.getMemberWarnings(groupId, targetJid)
                const isBanned = await Group.isMemberBanned(groupId, targetJid)
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

            const infoMsg = `📊 *Group Information*

🏷️ *Group Name:* ${groupMetadata.subject}
📝 *Description:* ${groupMetadata.desc || 'No description'}
👥 *Total Members:* ${totalMembers}
👮 *Admins:* ${admins}
🚫 *Banned Members:* ${bannedMembers}
⚠️ *Total Warnings:* ${totalWarnings}

👮 *Admin List:*
${adminList}

📈 *Group Statistics:*
• Messages: ${(settings.stats || {}).messages || 0}
• Commands: ${(settings.stats || {}).commands || 0}
• Kicks: ${(settings.stats || {}).kicks || 0}
• Bans: ${(settings.stats || {}).bans || 0}
• Warnings: ${(settings.stats || {}).warnings || 0}

🛡️ *Moderation Settings:*
• Welcome: ${settings.welcome ? '✅ On' : '❌ Off'}
• Goodbye: ${settings.goodbye ? '✅ On' : '❌ Off'}
• Anti-Spam: ${settings.antiSpam ? '✅ On' : '❌ Off'}
• Anti-Link: ${settings.antiLink ? '✅ On' : '❌ Off'}
• Anti-Toxic: ${settings.antiToxic ? '✅ On' : '❌ Off'}
• Anti-Media: ${settings.antiMedia ? '✅ On' : '❌ Off'}

${memberInfo ? `
👤 *Member Information:*
• Name: ${memberInfo.name}
• Warnings: ${memberInfo.warnings}/3
• Status: ${memberInfo.isBanned ? '🚫 Banned' : '✅ Active'}
${memberInfo.warningHistory.length > 0 ? `
📋 *Recent Warnings:*
${memberInfo.warningHistory.map((w, i) =>
                `${i + 1}. ${w.reason} (${new Date(w.warnedAt).toLocaleDateString('id-ID')})`
            ).join('\n')}` : ''}` : ''}

💡 *Quick Commands:*
• \`!warn @user\` - Warn a member
• \`!kick @user\` - Kick a member
• \`!ban @user\` - Ban a member
• \`!groupset\` - Configure settings`

            await m.reply(infoMsg, { mentions: adminParticipants.map(a => a.id) })

        } catch (error) {
            console.error('Group info error:', error)
            await m.reply('❌ *Error*\nFailed to load group information. Please try again.')
        }
    }
}

export default handler