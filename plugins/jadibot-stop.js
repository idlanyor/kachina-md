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
                return await sock.sendButtons(m.chat, {
                    text: `❌ BOT TIDAK DITEMUKAN\n\nAnda tidak memiliki bot aktif.`,
                    footer: 'Buat bot baru?',
                    buttons: [
                        { id: 'jadibot', text: 'Buat Jadibot' },
                        { id: 'jadibotinfo', text: 'Info Jadibot' }
                    ]
                }, { quoted: m });
            }

            // Stop bot
            const result = await jadiBotManager.stopBot(userJid, sock, m.chat);

            if (result.success) {
                await sock.sendButtons(m.chat, {
                    text: `✅ BOT BERHASIL DIHENTIKAN\n\nSesi masih tersimpan.`,
                    footer: 'Aksi berikutnya:',
                    buttons: [
                        { id: 'jadibot', text: 'Aktifkan Kembali' },
                        { id: 'deletejadibot', text: 'Hapus Sesi' },
                        { id: 'statusjadibot', text: 'Cek Status' }
                    ]
                }, { quoted: m });
            } else {
                await sock.sendButtons(m.chat, {
                    text: result.message,
                    buttons: [
                        { id: 'statusjadibot', text: 'Cek Status' }
                    ]
                }, { quoted: m });
            }

        } catch (error) {
            console.error('Error in stopjadibot command:', error);
            await sock.sendButtons(m.chat, {
                text: `❌ Terjadi kesalahan: ${error.message}`,
                buttons: [
                    { id: 'statusjadibot', text: 'Cek Status' },
                    { id: 'jadibotinfo', text: 'Info Jadibot' }
                ]
            }, { quoted: m });
        }
    }
};

export default handler;
