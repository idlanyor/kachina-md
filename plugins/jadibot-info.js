export const handler = {
    command: ['jadibotinfo', 'infojb', 'aboutjadibot'],
    category: 'jadibot',
    help: 'Informasi lengkap tentang fitur jadibot',
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, args }) => {
        try {
            const message = `🤖 *INFORMASI JADIBOT*\n\n` +
                          `Jadibot adalah fitur yang memungkinkan Anda mengubah WhatsApp pribadi menjadi bot dengan semua fitur bot utama.\n\n` +
                          
                          `📋 *PERINTAH TERSEDIA:*\n\n` +
                          
                          `1️⃣ *.jadibot <nomor>*\n` +
                          `   Mulai membuat bot baru\n` +
                          `   Contoh: .jadibot 628123456789\n` +
                          `   Alias: .rentbot, .jb\n\n` +
                          
                          `2️⃣ *.stopjadibot*\n` +
                          `   Hentikan bot yang sedang berjalan\n` +
                          `   Alias: .stopbot, .sjb\n\n` +
                          
                          `3️⃣ *.statusjadibot*\n` +
                          `   Cek status dan info bot Anda\n` +
                          `   Alias: .cekbot, .botinfo\n\n` +
                          
                          `4️⃣ *.deletejadibot*\n` +
                          `   Hapus sesi bot secara permanen\n` +
                          `   Alias: .delbot, .hapusbot\n\n` +
                          
                          `5️⃣ *.listjadibot* (owner)\n` +
                          `   Lihat semua bot yang aktif\n` +
                          `   Alias: .listbot, .ljb\n\n` +
                          
                          `✨ *FITUR & KELEBIHAN:*\n` +
                          `• ✅ Semua fitur bot tersedia\n` +
                          `• ✅ Auto-reconnect jika terputus\n` +
                          `• ✅ Pairing code (lebih mudah)\n` +
                          `• ✅ Multi-device support\n` +
                          `• ✅ Session tersimpan otomatis\n` +
                          `• ✅ Mode Self-Me (privasi terjaga)\n` +
                          `• ✅ Mudah digunakan\n` +
                          `• ✅ GRATIS (untuk sementara)\n\n` +
                          
                          `🔒 *MODE SELF-ME:*\n` +
                          `Jadibot menggunakan mode Self-Me secara default:\n` +
                          `• HANYA ANDA yang bisa pakai bot\n` +
                          `• Orang lain tidak bisa akses command\n` +
                          `• Berlaku di private chat DAN grup\n` +
                          `• Bot hanya respon command dari Anda\n\n` +
                          
                          `⚠️ *SYARAT & KETENTUAN:*\n` +
                          `• WhatsApp harus tetap online\n` +
                          `• Jangan logout saat bot aktif\n` +
                          `• Koneksi internet stabil\n` +
                          `• Nomor belum terdaftar sebagai bot\n\n` +
                          
                          `🔒 *KEAMANAN:*\n` +
                          `• Kode pairing bersifat pribadi\n` +
                          `• Jangan share kode ke siapapun\n` +
                          `• Sesi tersimpan dengan aman\n` +
                          `• Bisa dihapus kapan saja\n\n` +
                          
                          `📝 *CARA PENGGUNAAN:*\n` +
                          `1. Ketik .jadibot <nomor>\n` +
                          `   Contoh: .jadibot 628123456789\n` +
                          `2. Tunggu kode pairing dikirim\n` +
                          `3. Buka WhatsApp → Settings → Linked Devices\n` +
                          `4. Tap "Link a Device" → "Link with phone number"\n` +
                          `5. Masukkan kode pairing\n` +
                          `6. Bot siap digunakan!\n\n` +
                          
                          `💡 *TIPS:*\n` +
                          `• Gunakan di private chat untuk keamanan\n` +
                          `• Cek status bot secara berkala\n` +
                          `• Stop bot jika tidak digunakan\n` +
                          `• Backup nomor penting sebelum jadi bot\n` +
                          `• Siapkan WhatsApp dulu sebelum jadibot\n\n` +
                          
                          `❓ *FAQ:*\n` +
                          `Q: Apakah aman?\n` +
                          `A: Ya, menggunakan teknologi Baileys yang terpercaya\n\n` +
                          
                          `Q: Bisakah WhatsApp utama tetap digunakan?\n` +
                          `A: Ya, fitur multi-device memungkinkan penggunaan normal\n\n` +
                          
                          `Q: Berapa lama bot aktif?\n` +
                          `A: Selama WhatsApp tersambung dan tidak logout\n\n` +
                          
                          `Q: Apakah berbayar?\n` +
                          `A: Gratis untuk sementara waktu\n\n` +
                          
                          `Q: Kenapa pakai nomor, bukan QR?\n` +
                          `A: Lebih mudah! Tinggal masukkan kode, tidak perlu scan\n\n` +
                          
                          `📞 *BANTUAN:*\n` +
                          `Jika ada masalah, hubungi owner:\n` +
                          `• .owner - Info owner\n\n` +
                          
                          `🚀 Siap mencoba? Ketik .jadibot sekarang!`;

            await sock.sendMessage(m.chat, {
                text: message,
                contextInfo: {
                    externalAdReply: {
                        title: '🤖 Jadibot - Jadikan WhatsApp Anda Bot!',
                        body: 'Fitur canggih untuk semua pengguna',
                        thumbnailUrl: globalThis.ppUrl,
                        sourceUrl: globalThis.newsletterUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

        } catch (error) {
            console.error('Error in jadibotinfo command:', error);
            await m.reply(`❌ Terjadi kesalahan: ${error.message}`);
        }
    }
};

export default handler;

