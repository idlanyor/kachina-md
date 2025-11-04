import Group from '../database/models/Group.js';

export const handler = {
    command: ['setclose', 'setclosetime'],
    category: 'group',
    help: 'Set waktu auto close grup (Format: HH:MM)',
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
                    `⏰ *Auto Close Settings*\n\n` +
                    `Status: ${settings.autoClose ? '✅ Aktif' : '❌ Nonaktif'}\n` +
                    `Waktu: ${settings.autoCloseTime}\n\n` +
                    `📝 *Cara Penggunaan:*\n` +
                    `.setclose <jam>\n` +
                    `Contoh: .setclose 21:00\n\n` +
                    `Untuk enable/disable:\n` +
                    `.setclose on/off`
                );
                return;
            }

            // Check if user wants to enable/disable
            if (args.toLowerCase() === 'on' || args.toLowerCase() === 'enable') {
                const settings = await Group.setAutoClose(m.chat, true);
                await m.reply(
                    `✅ *Auto Close Diaktifkan*\n\n` +
                    `Grup akan ditutup otomatis pada jam: ${settings.autoCloseTime}\n` +
                    `Timezone: Asia/Jakarta (WIB)`
                );
                return;
            }

            if (args.toLowerCase() === 'off' || args.toLowerCase() === 'disable') {
                await Group.setAutoClose(m.chat, false);
                await m.reply('❌ *Auto Close Dinonaktifkan*');
                return;
            }

            // Validate time format (HH:MM)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
            if (!timeRegex.test(args)) {
                await m.reply(
                    '❌ *Format waktu salah!*\n\n' +
                    'Format yang benar: HH:MM\n' +
                    'Contoh: 21:00, 22:30, 23:45'
                );
                return;
            }

            // Set the time and enable auto close
            await Group.setAutoClose(m.chat, true, args);

            await m.reply(
                `✅ *Auto Close Berhasil Diatur*\n\n` +
                `⏰ Waktu: ${args}\n` +
                `🌍 Timezone: Asia/Jakarta (WIB)\n` +
                `📍 Status: Aktif\n\n` +
                `Grup akan ditutup otomatis setiap hari pada jam tersebut.`
            );

        } catch (error) {
            console.error('Error in setclose:', error);
            await m.reply('❌ Terjadi kesalahan saat mengatur auto close');
        }
    }
};

export default handler;
