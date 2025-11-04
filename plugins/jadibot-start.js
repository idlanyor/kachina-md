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
                    return await sock.sendButtons(m.chat, {
                        text: `⚠️ BOT SUDAH AKTIF\n\n` +
                              `📱 Nomor: ${status.phoneNumber}\n` +
                              `⏰ Uptime: ${status.uptime}\n` +
                              `🔌 Status: ${status.status}\n\n` +
                              `💾 Bot akan auto-reconnect saat restart!`,
                        footer: 'Pilih aksi cepat:',
                        buttons: [
                            { id: 'statusjadibot', text: 'Cek Status' },
                            { id: 'stopjadibot', text: 'Hentikan Bot' },
                            { id: 'deletejadibot', text: 'Hapus Sesi' }
                        ]
                    }, { quoted: m });
                } else if (status.status === 'connecting' || status.status === 'reconnecting') {
                    return await sock.sendButtons(m.chat, {
                        text: `⏳ BOT SEDANG TERSAMBUNG\n\nBot Anda sedang dalam proses koneksi.`,
                        footer: 'Tunggu atau batalkan',
                        buttons: [
                            { id: 'statusjadibot', text: 'Cek Status' },
                            { id: 'stopjadibot', text: 'Batalkan (Stop)' }
                        ]
                    }, { quoted: m });
                }
            }

            // Get phone number from args
            const phoneNumber = args.trim().replace(/[^0-9]/g, '');
            
            if (!phoneNumber) {
                return await sock.sendInteractiveMessage(m.chat, {
                    text: '📱 Cara membuat Jadibot\n\nFormat: .jadibot <nomor>\nContoh: .jadibot 628123456789',
                    footer: 'Gunakan tombol di bawah untuk bantuan',
                    interactiveButtons: [
                        { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: 'Salin Contoh', copy_code: '.jadibot 628123456789' }) },
                        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Info Jadibot', id: 'jadibotinfo' }) }
                    ]
                }, { quoted: m });
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
                return await sock.sendButtons(m.chat, {
                    text: `❌ NOMOR TIDAK VALID\n\nFormat nomor salah!`,
                    footer: 'Pilih bantuan:',
                    buttons: [
                        { id: 'jadibotinfo', text: 'Info Jadibot' },
                        { id: 'statusjadibot', text: 'Cek Status' }
                    ]
                }, { quoted: m });
            }

            // Send waiting message
            await sock.sendButtons(m.chat, {
                text: `🤖 MEMBUAT BOT BARU\n\n📱 Nomor: ${normalizedNumber}\n⏳ Menyiapkan bot Anda...\n🔐 Kode pairing akan dikirim segera`,
                footer: 'Aksi cepat:',
                buttons: [
                    { id: 'statusjadibot', text: 'Cek Status' },
                    { id: 'stopjadibot', text: 'Batalkan (Stop)' }
                ]
            }, { quoted: m });

            // Create bot
            const result = await jadiBotManager.createBot(userJid, sock, chatId, normalizedNumber);

            if (!result.success) {
                await sock.sendButtons(m.chat, {
                    text: result.message,
                    footer: 'Butuh bantuan?',
                    buttons: [
                        { id: 'jadibotinfo', text: 'Info Jadibot' },
                        { id: 'statusjadibot', text: 'Cek Status' }
                    ]
                }, { quoted: m });
            }

        } catch (error) {
            console.error('Error in jadibot command:', error);
            await sock.sendButtons(m.chat, {
                text: `❌ Terjadi kesalahan: ${error.message}`,
                buttons: [
                    { id: 'jadibotinfo', text: 'Info Jadibot' },
                    { id: 'statusjadibot', text: 'Cek Status' }
                ]
            }, { quoted: m });
        }
    }
};

export default handler;
