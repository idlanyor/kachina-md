import jadiBotManager from '../lib/jadibot.js';

export const handler = {
    command: ['listjadibot', 'listbot', 'ljb'],
    category: 'jadibot',
    help: 'Lihat daftar semua bot aktif (owner only)',
    isOwner: true,
    isGroup: false,
    exec: async ({ sock, m, args }) => {
        try {
            // Get all bots
            const bots = jadiBotManager.getAllBots();

            if (bots.length === 0) {
                return await m.reply(
                    `📋 *DAFTAR JADIBOT*\n\n` +
                    `Tidak ada bot yang aktif saat ini.\n\n` +
                    `💡 Bot akan muncul di sini setelah user menggunakan .jadibot`
                );
            }

            // Status emoji
            const statusEmoji = {
                'connected': '✅',
                'connecting': '⏳',
                'reconnecting': '🔄',
                'disconnected': '❌'
            };

            let message = `📋 *DAFTAR JADIBOT AKTIF*\n\n`;
            message += `Total: ${bots.length} bot\n\n`;

            bots.forEach((bot, index) => {
                const userNumber = bot.userJid.split('@')[0];
                message += `${index + 1}. ${statusEmoji[bot.status] || '❓'} *Bot #${index + 1}*\n`;
                message += `   • User: @${userNumber}\n`;
                message += `   • Nomor Bot: ${bot.phoneNumber}\n`;
                message += `   • Status: ${bot.status}\n`;
                message += `   • Uptime: ${bot.uptime}\n`;
                message += `   • Dibuat: ${bot.createdAt}\n\n`;
            });

            message += `📊 *Statistik:*\n`;
            message += `• Connected: ${bots.filter(b => b.status === 'connected').length}\n`;
            message += `• Connecting: ${bots.filter(b => b.status === 'connecting').length}\n`;
            message += `• Reconnecting: ${bots.filter(b => b.status === 'reconnecting').length}\n`;

            // Get mentions for all users
            const mentions = bots.map(bot => bot.userJid);

            await sock.sendMessage(m.chat, {
                text: message,
                mentions: mentions
            }, { quoted: m });

        } catch (error) {
            console.error('Error in listjadibot command:', error);
            await m.reply(`❌ Terjadi kesalahan: ${error.message}`);
        }
    }
};

export default handler;

