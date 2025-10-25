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
                return await sock.sendButtons(m.chat, {
                    text: `❌ BOT TIDAK DITEMUKAN\n\nAnda belum memiliki bot aktif.`,
                    footer: 'Buat bot sekarang atau lihat info',
                    buttons: [
                        { id: 'jadibot', text: 'Buat Jadibot' },
                        { id: 'jadibotinfo', text: 'Info Jadibot' }
                    ]
                }, { quoted: m });
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

            await sock.sendButtons(m.chat, {
                text: `${statusEmoji[status.status] || '❓'} STATUS BOT ANDA\n\n` +
                      `• Status: ${statusText[status.status] || status.status}\n` +
                      `• Nomor: ${status.phoneNumber}\n` +
                      `• Uptime: ${status.uptime}\n` +
                      `• Dibuat: ${status.createdAt}\n` +
                      `• Mode: Self-Me 🔒`,
                footer: 'Aksi cepat:',
                buttons: [
                    { id: 'stopjadibot', text: 'Hentikan Bot' },
                    { id: 'deletejadibot', text: 'Hapus Sesi' },
                    { id: 'listjadibot', text: 'List Jadibot' }
                ]
            }, { quoted: m });

        } catch (error) {
            console.error('Error in statusjadibot command:', error);
            await sock.sendButtons(m.chat, {
                text: `❌ Terjadi kesalahan: ${error.message}`,
                buttons: [
                    { id: 'jadibotinfo', text: 'Info Jadibot' },
                    { id: 'jadibot', text: 'Buat Jadibot' }
                ]
            }, { quoted: m });
        }
    }
};

export default handler;
