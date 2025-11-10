import jadiBotManager from '../lib/jadibot.js';

export const handler = {
    command: ['statusjadibot'],
    category: 'jadibot',
    help: 'Cek status bot Anda',
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, args }) => {
        try {
            const userJid = m.sender;

            // Get bot status
            const status = jadiBotManager.getStatus(userJid);

            if (!status.exists) {
                return await m.reply(
                    `❌ BOT TIDAK DITEMUKAN\n\n` +
                    `Anda belum memiliki bot aktif.\n\n` +
                    `Ketik .jadibot <nomor> untuk buat bot\n` +
                    `Ketik .jadibotinfo untuk info lengkap`
                );
            }

            // Status emoji
            const statusEmoji = {
                'connected': '✅',
                'connecting': '⏳',
                'reconnecting': '🔄',
                'disconnected': '❌'
            };

            const statusText = {
                'connected': 'Terhubung',
                'connecting': 'Sedang Tersambung',
                'reconnecting': 'Menyambung Kembali',
                'disconnected': 'Terputus'
            };

            await m.reply(
                `${statusEmoji[status.status] || '❓'} STATUS BOT ANDA\n\n` +
                `• Status: ${statusText[status.status] || status.status}\n` +
                `• Nomor: ${status.phoneNumber}\n` +
                `• Uptime: ${status.uptime}\n` +
                `• Dibuat: ${status.createdAt}\n` +
                `• Mode: Self-Me 🔒\n\n` +
                `Ketik .stopjadibot untuk hentikan bot\n` +
                `Ketik .deletejadibot untuk hapus sesi\n` +
                `Ketik .listjadibot untuk list semua bot`
            );

        } catch (error) {
            console.error('Error in statusjadibot command:', error);
            await m.reply(
                `❌ Terjadi kesalahan: ${error.message}\n\n` +
                `Ketik .jadibotinfo untuk info lengkap`
            );
        }
    }
};

export default handler;
