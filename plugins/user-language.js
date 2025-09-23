import localization from '../helper/localization.js';
import Database from '../helper/database.js';

export async function before(m, { isAdmin, isOwner }) {
    return false
}

export async function handler(m, { conn, args, usedPrefix, command }) {
    const userId = m.sender;
    const user = await Database.loadUser(userId);

    if (!args[0]) {
        const currentLang = user.language || 'id';
        const availableLanguages = localization.getAvailableLocales();

        let text = `🌐 *${t('settings.language')}*\n\n`;
        text += `${t('settings.current_language', { language: currentLang })}\n\n`;
        text += `${t('settings.available_languages')}\n`;

        availableLanguages.forEach(lang => {
            const flag = lang === 'id' ? '🇮🇩' : lang === 'en' ? '🇺🇸' : '🌐';
            text += `${flag} ${lang.toUpperCase()}\n`;
        });

        text += `\n${t('common.usage')}: ${usedPrefix}${command} <language_code>`;
        text += `\n${t('common.example')}: ${usedPrefix}${command} en`;

        return m.reply(text);
    }

    const newLanguage = args[0].toLowerCase();
    const availableLanguages = localization.getAvailableLocales();

    if (!availableLanguages.includes(newLanguage)) {
        return m.reply(t('settings.invalid_language', {
            languages: availableLanguages.join(', ')
        }));
    }

    try {
        await Database.updateUser(userId, { language: newLanguage });

        localization.setLocale(newLanguage);

        const languageName = newLanguage === 'id' ? 'Bahasa Indonesia' : 'English';
        const flag = newLanguage === 'id' ? '🇮🇩' : '🇺🇸';

        return m.reply(`${flag} ${t('settings.language_changed', { language: languageName })}`);
    } catch (error) {
        console.error('Error setting language:', error);
        return m.reply(t('common.error'));
    }
}

handler.help = ['lang', 'language', 'bahasa'];
handler.tags = ['user'];
handler.command = /^(lang|language|bahasa)$/i;