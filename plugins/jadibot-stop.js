import jadiBotManager from '../lib/jadibot.js';

export const handler = {
    command: ['stopjadibot', 'stopbot', 'sjb'],
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
                    `❌ *BOT TIDAK DITEMUKAN*\n\n` +
                    `Anda tidak memiliki bot yang aktif.\n\n` +
                    `💡 Gunakan .jadibot untuk membuat bot baru.`
                );
            }

            // Stop bot
            const result = await jadiBotManager.stopBot(userJid, sock, m.chat);

            if (result.success) {
                await m.reply(
                    `✅ *BOT BERHASIL DIHENTIKAN*\n\n` +
                    `Bot Anda telah dinonaktifkan.\n\n` +
                    `💡 *Informasi:*\n` +
                    `• Sesi masih tersimpan\n` +
                    `• Gunakan .jadibot untuk mengaktifkan kembali\n` +
                    `• Gunakan .deletejadibot untuk hapus sesi\n\n` +
                    `📊 *Statistik:*\n` +
                    `• Uptime terakhir: ${status.uptime}\n` +
                    `• Dibuat: ${status.createdAt}`
                );
            } else {
                await m.reply(result.message);
            }

        } catch (error) {
            console.error('Error in stopjadibot command:', error);
            await m.reply(`❌ Terjadi kesalahan: ${error.message}`);
        }
    }
};

export default handler;

