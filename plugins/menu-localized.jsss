import User from '../helper/database.js';

export async function before(m, { conn }) {
    if (m.fromMe || m.isGroup) return false;

    return false;
}

export async function handler(m, { conn, args, usedPrefix, command }) {
    try {
        const user = await User.loadUser(m.sender);
        const userLang = user.language || 'id';

        globalThis.localization.setLocale(userLang);

        if (!args[0]) {
            let greeting = t('bot.greeting', { botName: globalThis.botName });
            greeting += `\n\n${t('menu.main')}:\n`;
            greeting += `🤖 ${t('menu.ai')}\n`;
            greeting += `🎮 ${t('menu.games')}\n`;
            greeting += `🛠️ ${t('menu.tools')}\n`;
            greeting += `📥 ${t('menu.download')}\n`;
            greeting += `👥 ${t('menu.group')}\n`;
            greeting += `ℹ️ ${t('menu.info')}\n`;
            greeting += `\n${t('menu.usage_info', { prefix: usedPrefix })}`;

            return m.reply(greeting);
        }

        const subCommand = args[0].toLowerCase();

        switch (subCommand) {
            case 'info':
                const info = `🤖 *${globalThis.botName}*\n\n`;
                info += `${t('common.name')}: ${globalThis.botName}\n`;
                info += `${t('settings.current_language')}: ${userLang.toUpperCase()}\n`;
                info += `${t('common.owner')}: ${globalThis.owner}\n`;
                info += `${t('common.time')}: ${new Date().toLocaleString(userLang === 'id' ? 'id-ID' : 'en-US')}`;
                return m.reply(info);

            case 'lang':
            case 'language':
                const availableLanguages = globalThis.localization.getAvailableLocales();
                let langText = `🌐 ${t('settings.language')}\n\n`;
                langText += `${t('settings.current_language', { language: userLang })}\n\n`;
                langText += `${t('settings.available_languages')}\n`;

                availableLanguages.forEach(lang => {
                    const flag = lang === 'id' ? '🇮🇩' : lang === 'en' ? '🇺🇸' : '🌐';
                    langText += `${flag} ${lang.toUpperCase()}\n`;
                });

                langText += `\n${t('common.usage')}: ${usedPrefix}${command} lang <code>`;
                return m.reply(langText);

            default:
                return m.reply(t('commands.not_found'));
        }

    } catch (error) {
        console.error('Error in menu command:', error);
        return m.reply(t('common.error'));
    }
}

handler.help = ['menu', 'help'];
handler.tags = ['main'];
handler.command = /^(menu|help)$/i;