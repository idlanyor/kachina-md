import jadiBotManager from '../lib/jadibot.js';

export const handler = {
    command: ['deletejadibot', 'delbot', 'hapusbot'],
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
                return await m.reply(
                    `❌ *SESI TIDAK DITEMUKAN*\n\n` +
                    `Anda tidak memiliki sesi bot yang tersimpan.\n\n` +
                    `💡 Gunakan .jadibot untuk membuat bot baru.`
                );
            }

            // Send confirmation message
            await m.reply(
                `⚠️ *KONFIRMASI HAPUS SESI*\n\n` +
                `Anda yakin ingin menghapus sesi bot?\n\n` +
                `📊 *Info Bot:*\n` +
                `• Nomor: ${status.phoneNumber}\n` +
                `• Status: ${status.status}\n` +
                `• Uptime: ${status.uptime}\n\n` +
                `⚠️ *PERINGATAN:*\n` +
                `• Sesi akan dihapus permanen\n` +
                `• Bot akan logout otomatis\n` +
                `• Perlu scan QR lagi jika ingin membuat bot baru\n\n` +
                `Balas dengan "ya" untuk konfirmasi atau abaikan untuk membatalkan.\n\n` +
                `⏰ Tunggu konfirmasi dalam 30 detik...`
            );

            // Wait for confirmation
            const filter = (msg) => {
                return msg.key.remoteJid === m.chat && 
                       msg.key.participant === userJid &&
                       msg.message?.conversation?.toLowerCase() === 'ya';
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
                return await m.reply(
                    `❌ *DIBATALKAN*\n\n` +
                    `Penghapusan sesi dibatalkan.\n` +
                    `Bot Anda masih tersimpan.`
                );
            }

            // Delete session
            const result = await jadiBotManager.deleteSession(userJid);

            if (result.success) {
                await m.reply(
                    `✅ *SESI BERHASIL DIHAPUS*\n\n` +
                    `Sesi bot Anda telah dihapus permanen.\n\n` +
                    `💡 *Informasi:*\n` +
                    `• Bot telah logout\n` +
                    `• Semua data sesi dihapus\n` +
                    `• Gunakan .jadibot untuk membuat bot baru\n\n` +
                    `Terima kasih telah menggunakan layanan jadibot!`
                );
            } else {
                await m.reply(result.message);
            }

        } catch (error) {
            console.error('Error in deletejadibot command:', error);
            await m.reply(`❌ Terjadi kesalahan: ${error.message}`);
        }
    }
};

export default handler;

