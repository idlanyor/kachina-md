import Group from '../database/models/Group.js';

export const handler = {
    command: ['setopen', 'setopentime'],
    category: 'group',
    help: 'Set waktu auto open grup (Format: HH:MM)',
    isGroup: true,
    isAdmin: true,
    isBotAdmin: true,
    exec: async ({ sock, m, args }) => {
        try {
            if (!m.isAdmin) {
                await m.reply('❌ Hanya admin yang dapat menggunakan perintah ini');
                return;
            }

            // Check if time is provided
            if (!args) {
                const settings = await Group.getSettings(m.chat);
                await m.reply(
                    `⏰ *Auto Open Settings*\n\n` +
                    `Status: ${settings.autoOpen ? '✅ Aktif' : '❌ Nonaktif'}\n` +
                    `Waktu: ${settings.autoOpenTime}\n\n` +
                    `📝 *Cara Penggunaan:*\n` +
                    `.setopen <jam>\n` +
                    `Contoh: .setopen 05:00\n\n` +
                    `Untuk enable/disable:\n` +
                    `.setopen on/off`
                );
                return;
            }

            // Check if user wants to enable/disable
            if (args.toLowerCase() === 'on' || args.toLowerCase() === 'enable') {
                const settings = await Group.setAutoOpen(m.chat, true);
                await m.reply(
                    `✅ *Auto Open Diaktifkan*\n\n` +
                    `Grup akan dibuka otomatis pada jam: ${settings.autoOpenTime}\n` +
                    `Timezone: Asia/Jakarta (WIB)`
                );
                return;
            }

            if (args.toLowerCase() === 'off' || args.toLowerCase() === 'disable') {
                await Group.setAutoOpen(m.chat, false);
                await m.reply('❌ *Auto Open Dinonaktifkan*');
                return;
            }

            // Validate time format (HH:MM)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
            if (!timeRegex.test(args)) {
                await m.reply(
                    '❌ *Format waktu salah!*\n\n' +
                    'Format yang benar: HH:MM\n' +
                    'Contoh: 05:00, 08:30, 12:45'
                );
                return;
            }

            // Set the time and enable auto open
            await Group.setAutoOpen(m.chat, true, args);

            await m.reply(
                `✅ *Auto Open Berhasil Diatur*\n\n` +
                `⏰ Waktu: ${args}\n` +
                `🌍 Timezone: Asia/Jakarta (WIB)\n` +
                `📍 Status: Aktif\n\n` +
                `Grup akan dibuka otomatis setiap hari pada jam tersebut.`
            );

        } catch (error) {
            console.error('Error in setopen:', error);
            await m.reply('❌ Terjadi kesalahan saat mengatur auto open');
        }
    }
};

export default handler;
