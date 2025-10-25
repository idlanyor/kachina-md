import jadiBotManager from '../lib/jadibot.js';

export const handler = {
    command: ['deletejadibot'],
    category: 'jadibot',
    help: 'Hapus sesi bot Anda secara permanen',
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, args }) => {
        try {
            const userJid = m.sender;

            // Check if user has a bot
            const status = jadiBotManager.getStatus(userJid);
            if (!status.exists) {
                return await sock.sendButtons(m.chat, {
                    text: `❌ SESI TIDAK DITEMUKAN\n\nAnda tidak memiliki sesi bot yang tersimpan.`,
                    footer: 'Buat bot baru?',
                    buttons: [
                        { id: 'jadibot', text: 'Buat Jadibot' },
                        { id: 'jadibotinfo', text: 'Info Jadibot' }
                    ]
                }, { quoted: m });
            }

            // Send confirmation message
            await sock.sendButtons(m.chat, {
                text: `⚠️ KONFIRMASI HAPUS SESI\n\n` +
                      `• Nomor: ${status.phoneNumber}\n` +
                      `• Status: ${status.status}\n` +
                      `• Uptime: ${status.uptime}\n\n` +
                      `Sesi akan dihapus permanen. Lanjutkan?`,
                footer: 'Pilih salah satu:',
                buttons: [
                    { id: 'confirm_delete_session', text: 'Ya, Hapus' },
                    { id: 'statusjadibot', text: 'Cek Status' }
                ]
            }, { quoted: m });

            // Wait for confirmation
            const filter = (msg) => {
                const irm = msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage;
                if (!irm) return false;
                try {
                    const params = JSON.parse(irm.paramsJson);
                    const sameChat = msg.key.remoteJid === m.chat;
                    const sameUser = msg.key.participant ? (msg.key.participant === userJid) : (msg.key.remoteJid === userJid);
                    return sameChat && sameUser && params?.id === 'confirm_delete_session';
                } catch { return false; }
            };

            // Create a promise to wait for the next message
            const waitForMessage = () => {
                return new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        sock.ev.off('messages.upsert', handler);
                        resolve(false);
                    }, 30000); // 30 seconds timeout

                    const handler = (update) => {
                        const msg = update.messages[0];
                        if (filter(msg)) {
                            clearTimeout(timeout);
                            sock.ev.off('messages.upsert', handler);
                            resolve(true);
                        }
                    };

                    sock.ev.on('messages.upsert', handler);
                });
            };

            const confirmed = await waitForMessage();

            if (!confirmed) {
                return await sock.sendButtons(m.chat, {
                    text: `❌ DIBATALKAN\n\nPenghapusan sesi dibatalkan. Bot Anda masih tersimpan.`,
                    buttons: [
                        { id: 'statusjadibot', text: 'Cek Status' },
                        { id: 'deletejadibot', text: 'Hapus Lagi' }
                    ]
                }, { quoted: m });
            }

            // Delete session
            const result = await jadiBotManager.deleteSession(userJid);

            if (result.success) {
                await sock.sendButtons(m.chat, {
                    text: `✅ SESI BERHASIL DIHAPUS\n\nBot telah logout dan data sesi dihapus.`,
                    footer: 'Aksi cepat:',
                    buttons: [
                        { id: 'jadibot', text: 'Buat Jadibot Baru' },
                        { id: 'jadibotinfo', text: 'Info Jadibot' }
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
            console.error('Error in deletejadibot command:', error);
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
