import jadiBotManager from '../lib/jadibot.js';

export const handler = {
    command: ['jadibot'],
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
                        `⚠️ BOT SUDAH AKTIF\n\n` +
                        `📱 Nomor: ${status.phoneNumber}\n` +
                        `⏰ Uptime: ${status.uptime}\n` +
                        `🔌 Status: ${status.status}\n\n` +
                        `💾 Bot akan auto-reconnect saat restart!\n\n` +
                        `Ketik .statusjadibot untuk cek status\n` +
                        `Ketik .stopjadibot untuk hentikan bot\n` +
                        `Ketik .deletejadibot untuk hapus sesi`
                    );
                } else if (status.status === 'connecting' || status.status === 'reconnecting') {
                    return await m.reply(
                        `⏳ BOT SEDANG TERSAMBUNG\n\n` +
                        `Bot Anda sedang dalam proses koneksi.\n\n` +
                        `Ketik .statusjadibot untuk cek status\n` +
                        `Ketik .stopjadibot untuk batalkan`
                    );
                }
            }

            // Get phone number from args
            const phoneNumber = args.trim().replace(/[^0-9]/g, '');

            if (!phoneNumber) {
                return await m.reply(
                    '📱 Cara membuat Jadibot\n\n' +
                    'Format: .jadibot <nomor>\n' +
                    'Contoh: .jadibot 628123456789\n\n' +
                    'Ketik .jadibotinfo untuk info lengkap'
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
                    `❌ NOMOR TIDAK VALID\n\n` +
                    `Format nomor salah!\n\n` +
                    `Format yang benar: 628xxxxx\n` +
                    `Contoh: 628123456789\n\n` +
                    `Ketik .jadibotinfo untuk info lengkap`
                );
            }

            // Send waiting message
            await m.reply(
                `🤖 MEMBUAT BOT BARU\n\n` +
                `📱 Nomor: ${normalizedNumber}\n` +
                `⏳ Menyiapkan bot Anda...\n` +
                `🔐 Kode pairing akan dikirim segera\n\n` +
                `Ketik .statusjadibot untuk cek status\n` +
                `Ketik .stopjadibot untuk batalkan`
            );

            // Create bot
            const result = await jadiBotManager.createBot(userJid, sock, chatId, normalizedNumber);

            if (!result.success) {
                await m.reply(
                    result.message + '\n\n' +
                    'Ketik .jadibotinfo untuk info lengkap\n' +
                    'Ketik .statusjadibot untuk cek status'
                );
            }

        } catch (error) {
            console.error('Error in jadibot command:', error);
            await m.reply(
                `❌ Terjadi kesalahan: ${error.message}\n\n` +
                `Ketik .jadibotinfo untuk info lengkap\n` +
                `Ketik .statusjadibot untuk cek status`
            );
        }
    }
};

export default handler;
