import jadiBotManager from '../lib/jadibot.js';

export const handler = {
    command: ['deletejadibot'],
    category: 'jadibot',
    help: 'Hapus sesi bot Anda secara permanen',
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, args }) => {
        try {
            const userJid = m.sender;

            // Check if user has a bot
            const status = jadiBotManager.getStatus(userJid);
            if (!status.exists) {
                return await m.reply(
                    `❌ SESI TIDAK DITEMUKAN\n\n` +
                    `Anda tidak memiliki sesi bot yang tersimpan.\n\n` +
                    `Ketik .jadibot <nomor> untuk buat bot\n` +
                    `Ketik .jadibotinfo untuk info lengkap`
                );
            }

            // Send confirmation message with warning
            await m.reply(
                `⚠️ MENGHAPUS SESI BOT\n\n` +
                `• Nomor: ${status.phoneNumber}\n` +
                `• Status: ${status.status}\n` +
                `• Uptime: ${status.uptime}\n\n` +
                `Sedang menghapus sesi...`
            );

            // Delete session
            const result = await jadiBotManager.deleteSession(userJid);

            if (result.success) {
                await m.reply(
                    `✅ SESI BERHASIL DIHAPUS\n\n` +
                    `Bot telah logout dan data sesi dihapus.\n\n` +
                    `Ketik .jadibot <nomor> untuk buat bot baru\n` +
                    `Ketik .jadibotinfo untuk info lengkap`
                );
            } else {
                await m.reply(
                    result.message + '\n\n' +
                    'Ketik .statusjadibot untuk cek status'
                );
            }

        } catch (error) {
            console.error('Error in deletejadibot command:', error);
            await m.reply(
                `❌ Terjadi kesalahan: ${error.message}\n\n` +
                `Ketik .statusjadibot untuk cek status\n` +
                `Ketik .jadibotinfo untuk info lengkap`
            );
        }
    }
};

export default handler;
