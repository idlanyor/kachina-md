import jadiBotManager from '../lib/jadibot.js';

export const handler = {
    command: ['stopjadibot'],
    category: 'jadibot',
    help: 'Hentikan bot Anda',
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, args }) => {
        try {
            const userJid = m.sender;

            // Check if user has a bot
            const status = jadiBotManager.getStatus(userJid);
            if (!status.exists) {
                return await m.reply(
                    `❌ BOT TIDAK DITEMUKAN\n\n` +
                    `Anda tidak memiliki bot aktif.\n\n` +
                    `Ketik .jadibot <nomor> untuk buat bot\n` +
                    `Ketik .jadibotinfo untuk info lengkap`
                );
            }

            // Stop bot
            const result = await jadiBotManager.stopBot(userJid, sock, m.chat);

            if (result.success) {
                await m.reply(
                    `✅ BOT BERHASIL DIHENTIKAN\n\n` +
                    `Sesi masih tersimpan.\n\n` +
                    `Ketik .jadibot <nomor> untuk aktifkan kembali\n` +
                    `Ketik .deletejadibot untuk hapus sesi\n` +
                    `Ketik .statusjadibot untuk cek status`
                );
            } else {
                await m.reply(
                    result.message + '\n\n' +
                    'Ketik .statusjadibot untuk cek status'
                );
            }

        } catch (error) {
            console.error('Error in stopjadibot command:', error);
            await m.reply(
                `❌ Terjadi kesalahan: ${error.message}\n\n` +
                `Ketik .statusjadibot untuk cek status\n` +
                `Ketik .jadibotinfo untuk info lengkap`
            );
        }
    }
};

export default handler;
