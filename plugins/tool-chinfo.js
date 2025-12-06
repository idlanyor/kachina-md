import { unixToDate } from "../helper/date.js";
import { proto, generateWAMessageFromContent } from 'baileys';

export const handler = {
    command: ['chinfo', 'channelinfo'],
    category: 'info',
    help: 'Retrieve Information from Channel/Newsletter',
    exec: async ({ sock, m, args }) => {
        if (!args) {
            await m.reply('⚠️ Mohon masukkan link channel WhatsApp yang valid!');
            return;
        }

        if (!args.includes('whatsapp.com/channel/')) {
            await m.reply('❌ Link tidak valid! Pastikan menggunakan format https://whatsapp.com/channel/KODE');
            return;
        }

        try {
            const filterCode = args.match(/channel\/([A-Za-z0-9]{20,24})/)?.[1];
            if (!filterCode) {
                await m.reply('❌ Kode channel tidak ditemukan dalam link!');
                return;
            }

            // Send loading reaction
            await sock.sendMessage(m.chat, {
                react: {
                    text: '⏳',
                    key: m.key
                }
            });

            const metadata = await sock.newsletterMetadata('invite', filterCode);

            // Extract data from the new metadata structure
            const channelId = metadata.id;
            const channelState = metadata.state?.type || 'UNKNOWN';
            const creationTime = metadata.thread_metadata?.creation_time;
            const description = metadata.thread_metadata?.description?.text || 'Tidak ada deskripsi';
            const channelName = metadata.thread_metadata?.name?.text || 'Unknown Channel';
            const subscribersCount = metadata.thread_metadata?.subscribers_count || '0';
            const inviteCode = metadata.thread_metadata?.invite || filterCode;
            const verification = metadata.thread_metadata?.verification || 'UNVERIFIED';

            // Try to get the newsletter picture from multiple possible paths
            let thumbnailUrl = 'https://files.catbox.moe/2wynab.jpg';
            if (metadata.thread_metadata?.preview?.direct_path) {
                thumbnailUrl = `https://mmg.whatsapp.net${metadata.thread_metadata?.preview?.direct_path}`;
            }

            // Format subscribers count with commas for better readability
            const formattedSubscribers = parseInt(subscribersCount).toLocaleString('id-ID');

            // Format verification status with emoji
            const verificationStatus = verification === 'VERIFIED' ? '✅ Terverifikasi' : '❌ Belum Terverifikasi';

            // Format channel state with emoji
            const stateEmoji = {
                'ACTIVE': '🟢',
                'INACTIVE': '🔴',
                'UNKNOWN': '⚪'
            }[channelState] || '⚪';

            const message = generateWAMessageFromContent(m.chat, proto.Message.fromObject({
                extendedTextMessage: {
                    text: `┌───「 *INFORMASI CHANNEL* 」
│
├ 📛 *Nama Channel:* ${channelName}
├ 🆔 *ID Channel:* ${channelId.split('@')[0]}
├ ${stateEmoji} *Status:* ${channelState}
├ 📅 *Dibuat:* ${creationTime ? unixToDate(creationTime) : 'Tidak diketahui'}
├ 👥 *Subscriber:* ${formattedSubscribers}
├ ${verification === 'VERIFIED' ? '✅' : '❌'} *Verifikasi:* ${verificationStatus}
├ 🔗 *Link Channel:* https://whatsapp.com/channel/${inviteCode}
│
├ 📝 *Deskripsi:*
│  ${description}
│
└─────────────────────`,
                    contextInfo: {
                        isForwarded: true,
                        forwardingScore: 9999999,
                        externalAdReply: {
                            title: `📢 ${channelName}`,
                            body: `Channel WhatsApp • ${formattedSubscribers} subscriber`,
                            mediaType: 1,
                            previewType: 0,
                            renderLargerThumbnail: true,
                            thumbnailUrl: thumbnailUrl,
                            sourceUrl: `https://whatsapp.com/channel/${inviteCode}`
                        }
                    }
                }
            }), { userJid: m.chat, quoted: m });

            await sock.relayMessage(m.chat, message.message, { messageId: message.key.id });

            // Send success reaction
            await sock.sendMessage(m.chat, {
                react: {
                    text: '✅',
                    key: m.key
                }
            });

        } catch (error) {
            console.error('Error in chinfo:', error);
            await m.reply({
                text: '❌ Terjadi kesalahan saat mengambil informasi channel: ' + error.message,
                contextInfo: {
                    externalAdReply: {
                        title: '❌ Gagal Mengambil Info',
                        body: 'Terjadi kesalahan saat mengambil informasi channel',
                        thumbnailUrl: 'https://files.catbox.moe/2wynab.jpg',
                        sourceUrl: 'https://whatsapp.com/channel/0029VagADOLLSmbaxFNswH1m',
                        mediaType: 1,
                    }
                }
            });

            // Send error reaction
            await sock.sendMessage(m.chat, {
                react: {
                    text: '❌',
                    key: m.key
                }
            });
        }
    }
};

export default handler;