import User from '../database/models/User.js';

export async function before(m, { conn }) {
    return false;
}

export async function handler(m, { conn, args, usedPrefix, command }) {
    try {
        // Get user and set localization
        const user = await User.getById(m.sender);
        const userLang = user.preferences?.language || 'id';
        globalThis.localization.setLocale(userLang);

        if (!args[0]) {
            let demoText = `🌐 *${t('demo.title')}*\n\n`;
            demoText += `${t('demo.description')}\n\n`;
            demoText += `${t('demo.commands')}:\n`;
            demoText += `• ${usedPrefix}${command} hello\n`;
            demoText += `• ${usedPrefix}${command} time\n`;
            demoText += `• ${usedPrefix}${command} number\n`;
            demoText += `• ${usedPrefix}${command} date\n\n`;
            demoText += `${t('demo.current_language')}: ${userLang.toUpperCase()}\n`;
            demoText += `${t('demo.change_language')}: !lang <code>`;

            return m.reply(demoText);
        }

        const subCommand = args[0].toLowerCase();

        switch (subCommand) {
            case 'hello':
                const greeting = t('demo.hello_message', { name: user.name || 'User' });
                return m.reply(`👋 ${greeting}`);

            case 'time':
                const now = new Date();
                const timeText = `🕐 ${t('demo.current_time')}: ${globalThis.localization.formatDate(now, userLang, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                })}`;
                return m.reply(timeText);

            case 'number':
                const randomNum = Math.floor(Math.random() * 1000000);
                const numberText = `🔢 ${t('demo.random_number')}: ${globalThis.localization.formatNumber(randomNum)}`;
                return m.reply(numberText);

            case 'date':
                const today = new Date();
                const dateText = `📅 ${t('demo.today_date')}: ${globalThis.localization.formatDate(today, userLang)}`;
                return m.reply(dateText);

            default:
                return m.reply(t('demo.invalid_command'));
        }

    } catch (error) {
        console.error('Error in demo command:', error);
        return m.reply(t('common.error'));
    }
}

handler.help = ['demo'];
handler.tags = ['tools'];
handler.command = /^(demo|localdemo)$/i;