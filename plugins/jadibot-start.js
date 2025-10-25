import jadiBotManager from '../lib/jadibot.js';

export const handler = {
    command: ['jadibot', 'rentbot', 'jb'],
    category: 'jadibot',
    help: 'Mulai membuat bot sendiri dengan WhatsApp Anda. Format: .jadibot <nomor>',
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, args }) => {
        try {
            const userJid = m.sender;
            const chatId = m.chat;

            // Check if user already has a bot
            const status = jadiBotManager.getStatus(userJid);
            if (status.exists) {
                if (status.status === 'connected') {
                    return await m.reply(
                        `⚠️ *BOT SUDAH AKTIF*\n\n` +
                        `Anda sudah memiliki bot yang aktif!\n\n` +
                        `📱 *Nomor:* ${status.phoneNumber}\n` +
                        `⏰ *Uptime:* ${status.uptime}\n` +
                        `🔌 *Status:* ${status.status}\n\n` +
                        `💡 *Perintah tersedia:*\n` +
                        `• .statusjadibot - Cek status bot\n` +
                        `• .stopjadibot - Hentikan bot\n` +
                        `• .deletejadibot - Hapus sesi bot`
                    );
                } else if (status.status === 'connecting') {
                    return await m.reply(
                        `⏳ *BOT SEDANG TERSAMBUNG*\n\n` +
                        `Bot Anda sedang dalam proses koneksi.\n` +
                        `Silakan tunggu atau gunakan .stopjadibot untuk membatalkan.`
                    );
                }
            }

            // Get phone number from args
            const phoneNumber = args.trim().replace(/[^0-9]/g, '');
            
            if (!phoneNumber) {
                return await m.reply(
                    `📱 *CARA MEMBUAT JADIBOT*\n\n` +
                    `Format: .jadibot <nomor>\n\n` +
                    `📝 *Contoh:*\n` +
                    `• .jadibot 628123456789\n` +
                    `• .jadibot 08123456789\n` +
                    `• .jadibot 8123456789\n\n` +
                    `⚠️ *Catatan:*\n` +
                    `• Gunakan nomor yang ingin dijadikan bot\n` +
                    `• Format: 628xxxxx (dengan/tanpa 0/62)\n` +
                    `• Nomor harus aktif di WhatsApp\n` +
                    `• Jangan logout selama bot aktif\n\n` +
                    `🔒 *Mode Self-Me:*\n` +
                    `• Bot hanya bisa dipakai oleh ANDA\n` +
                    `• Orang lain tidak bisa akses\n` +
                    `• Berlaku di private & grup\n\n` +
                    `💡 *Tips:*\n` +
                    `Gunakan nomor yang jarang dipakai untuk chatting pribadi.`
                );
            }

            // Normalize phone number (add 62 if starts with 0 or 8)
            let normalizedNumber = phoneNumber;
            if (phoneNumber.startsWith('0')) {
                normalizedNumber = '62' + phoneNumber.substring(1);
            } else if (phoneNumber.startsWith('8')) {
                normalizedNumber = '62' + phoneNumber;
            }

            // Validate phone number format
            if (!/^62\d{9,13}$/.test(normalizedNumber)) {
                return await m.reply(
                    `❌ *NOMOR TIDAK VALID*\n\n` +
                    `Format nomor salah!\n\n` +
                    `✅ *Format yang benar:*\n` +
                    `• 628123456789\n` +
                    `• 08123456789\n` +
                    `• 8123456789\n\n` +
                    `❌ *Jangan gunakan:*\n` +
                    `• Spasi: 0812 3456 789\n` +
                    `• Tanda +: +628123456789\n` +
                    `• Tanda -: 0812-3456-789\n\n` +
                    `Coba lagi dengan format yang benar!`
                );
            }

            // Send waiting message
            await m.reply(
                `🤖 *MEMBUAT BOT BARU*\n\n` +
                `📱 *Nomor:* ${normalizedNumber}\n` +
                `⏳ Sedang menyiapkan bot Anda...\n` +
                `🔐 Kode pairing akan dikirim dalam beberapa detik\n\n` +
                `⚠️ *Catatan Penting:*\n` +
                `• Siapkan WhatsApp di nomor ${normalizedNumber}\n` +
                `• Kode pairing akan dikirim ke chat ini\n` +
                `• Masukkan kode di WhatsApp Anda\n` +
                `• Jangan logout dari WhatsApp selama bot aktif\n` +
                `• WhatsApp Anda akan berfungsi sebagai bot\n` +
                `• Semua fitur bot akan tersedia\n\n` +
                `💰 *Biaya:* GRATIS (untuk sementara)\n` +
                `⏰ Tunggu sebentar...`
            );

            // Create bot
            const result = await jadiBotManager.createBot(userJid, sock, chatId, normalizedNumber);

            if (!result.success) {
                await m.reply(result.message);
            }

        } catch (error) {
            console.error('Error in jadibot command:', error);
            await m.reply(`❌ Terjadi kesalahan: ${error.message}`);
        }
    }
};

export default handler;

