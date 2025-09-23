import User from '../database/models/User.js'

export const handler = {
    command: ['daily'],
    category: 'user',
    help: 'Klaim bonus harian',
    isRegistered: true,
    exec: async ({ sock, m }) => {
        try {
            const user = await User.getById(m.sender)

            // Set localization based on user's language
            const userLang = user.preferences?.language || 'id'
            globalThis.localization.setLocale(userLang)

            const dailyAmount = await User.claimDaily(m.sender)
            const updatedUser = await User.getById(m.sender)

            const dailyText = `🎁 *${t('user.daily_bonus_claimed')}!*\n\n` +
                            `💰 *${t('user.bonus')}:* +${globalThis.localization.formatNumber(dailyAmount)}\n` +
                            `💵 *${t('user.balance')}:* ${globalThis.localization.formatNumber(updatedUser.balance)}\n` +
                            `📊 *${t('user.level')}:* ${updatedUser.level}\n\n` +
                            `⏰ *${t('user.claim_tomorrow')}!*`

            await sock.sendMessage(m.chat, {
                text: dailyText,
                contextInfo: {
                    externalAdReply: {
                        title: `🎁 ${t('user.daily_bonus_claimed')}!`,
                        body: `+${globalThis.localization.formatNumber(dailyAmount)}`,
                        thumbnailUrl: globalThis.ppUrl,
                        sourceUrl: globalThis.newsletterUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })

        } catch (error) {
            console.error('Error in daily command:', error)

            // Set localization for error messages
            const user = await User.getById(m.sender).catch(() => ({}))
            const userLang = user.preferences?.language || 'id'
            globalThis.localization.setLocale(userLang)

            if (error.message.includes('already claimed')) {
                await m.reply(`❌ ${t('user.daily_claimed')}\n⏰ ${t('user.claim_again_tomorrow')}!`)
            } else {
                await m.reply(`❌ ${t('user.daily_claim_error')}!`)
            }
        }
    }
}