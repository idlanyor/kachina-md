import Group from '../database/models/Group.js';

export const handler = {
    command: ['schedule', 'jadwal', 'autoschedule'],
    category: 'group',
    help: 'Lihat jadwal auto open/close grup',
    isGroup: true,
    exec: async ({ sock, m }) => {
        try {
            const settings = await Group.getSettings(m.chat);

            const autoOpenStatus = settings.autoOpen ? '✅ Aktif' : '❌ Nonaktif';
            const autoCloseStatus = settings.autoClose ? '✅ Aktif' : '❌ Nonaktif';

            const message =
                `📅 *Jadwal Auto Open/Close Grup*\n\n` +
                `🔓 *Auto Open*\n` +
                `   Status: ${autoOpenStatus}\n` +
                `   Waktu: ${settings.autoOpenTime} WIB\n\n` +
                `🔒 *Auto Close*\n` +
                `   Status: ${autoCloseStatus}\n` +
                `   Waktu: ${settings.autoCloseTime} WIB\n\n` +
                `⏰ Timezone: Asia/Jakarta (WIB)\n\n` +
                `📝 *Pengaturan:*\n` +
                `• .setopen <jam> - Set waktu auto open\n` +
                `• .setclose <jam> - Set waktu auto close\n` +
                `• .setopen on/off - Enable/disable auto open\n` +
                `• .setclose on/off - Enable/disable auto close\n\n` +
                `Contoh: .setopen 05:00`;

            await m.reply(message);

        } catch (error) {
            console.error('Error in schedule:', error);
            await m.reply('❌ Terjadi kesalahan saat mengambil jadwal');
        }
    }
};

export default handler;
