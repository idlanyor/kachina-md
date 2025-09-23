import User from '../database/models/User.js'

export const handler = {
    command: ['daftar', 'register'],
    category: 'user',
    help: 'Daftar sebagai user bot',
    exec: async ({ sock, m, args }) => {
        try {
            const userJid = m.sender
            const user = await User.getById(userJid)

            // Set localization based on user's current language or default
            const userLang = user.preferences?.language || 'id'
            globalThis.localization.setLocale(userLang)

            // Check if already registered
            if (user.registered) {
                return await m.reply(t('user.already_registered'))
            }

            // Get name from args or use pushName
            const name = args.trim() || m.pushName || 'User'

            // Register user
            await User.register(userJid, {
                name: name,
                registered: true,
                joinDate: new Date().toISOString()
            })

            // Add welcome bonus
            await User.addBalance(userJid, 1000, 'Welcome bonus')

            const welcomeText = `🎉 *${t('user.register_success', { name })}*\n\n` +
                              `✅ ${t('user.register_success')}!\n` +
                              `👤 *${t('common.name')}:* ${name}\n` +
                              `📱 *${t('user.number')}:* ${userJid.split('@')[0]}\n` +
                              `💰 *${t('user.welcome_bonus')}:* ${globalThis.localization.formatNumber(1000)}\n\n` +

                              `🎁 *${t('user.registration_bonus')}:*\n` +
                              `• ${t('user.initial_balance')}: ${globalThis.localization.formatNumber(1000)}\n` +
                              `• ${t('user.level')} 1 ${t('user.with_xp')} 0 XP\n` +
                              `• ${t('user.full_access')}\n\n` +

                              `📋 *${t('user.available_features')}:*\n` +
                              `• \`.me\` - ${t('user.view_profile')}\n` +
                              `• \`.balance\` - ${t('user.check_balance')}\n` +
                              `• \`.daily\` - ${t('user.daily_bonus')}\n` +
                              `• \`.transfer\` - ${t('user.transfer_balance')}\n` +
                              `• ${t('user.games_available')}\n` +
                              `• ${t('user.and_more')}!\n\n` +

                              `💡 *${t('common.tips')}:* ${t('user.help_tip')}`

            await sock.sendMessage(m.chat, {
                text: welcomeText,
                contextInfo: {
                    externalAdReply: {
                        title: `🎉 ${t('user.registration_success')}!`,
                        body: `${t('user.welcome', { name })}! ${t('user.bonus_added')}.`,
                        thumbnailUrl: globalThis.ppUrl,
                        sourceUrl: globalThis.newsletterUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })

        } catch (error) {
            console.error('Error in register command:', error)
            await m.reply(t('errors.database'))
        }
    }
}

export default handler