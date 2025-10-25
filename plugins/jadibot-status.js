import jadiBotManager from '../lib/jadibot.js';

export const handler = {
    command: ['statusjadibot', 'cekbot', 'botinfo'],
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
                    `❌ *BOT TIDAK DITEMUKAN*\n\n` +
                    `Anda tidak memiliki bot yang aktif.\n\n` +
                    `💡 *Cara membuat bot:*\n` +
                    `Gunakan perintah .jadibot untuk membuat bot baru.\n\n` +
                    `📋 *Fitur Jadibot:*\n` +
                    `• WhatsApp Anda jadi bot\n` +
                    `• Semua fitur tersedia\n` +
                    `• Mudah digunakan\n` +
                    `• GRATIS (untuk sementara)`
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
                `${statusEmoji[status.status] || '❓'} *STATUS BOT ANDA*\n\n` +
                `📊 *Informasi Bot:*\n` +
                `• Status: ${statusText[status.status] || status.status}\n` +
                `• Nomor: ${status.phoneNumber}\n` +
                `• Uptime: ${status.uptime}\n` +
                `• Dibuat: ${status.createdAt}\n` +
                `• Mode: Self-Me 🔒\n\n` +
                `🔒 *Mode Self-Me:*\n` +
                `• HANYA ANDA yang bisa pakai bot ini\n` +
                `• Berlaku di private chat dan grup\n` +
                `• Orang lain tidak bisa akses command\n\n` +
                `💡 *Perintah Tersedia:*\n` +
                `• .stopjadibot - Hentikan bot\n` +
                `• .deletejadibot - Hapus sesi bot\n` +
                `• .listjadibot - List semua bot (owner)\n\n` +
                `⚠️ *Catatan:*\n` +
                `• Bot aktif selama WhatsApp tersambung\n` +
                `• Jangan logout dari WhatsApp\n` +
                `• Pastikan koneksi internet stabil`
            );

        } catch (error) {
            console.error('Error in statusjadibot command:', error);
            await m.reply(`❌ Terjadi kesalahan: ${error.message}`);
        }
    }
};

export default handler;

