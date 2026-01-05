import axios from 'axios';

export const handler = {
    command: ['dl'],
    category: 'downloader',
    help: 'Download video dari berbagai platform.',
    async exec({ sock, m, args }) {
        try {
            let url = typeof args === 'string' ? args.trim() : '';
            if (!url && m.quoted) {
                url = (
                    m.quoted.text ||
                    m.quoted.message?.conversation ||
                    ''
                ).trim();
            }

            // Validasi URL
            if (!url) {
                await m.reply(
                    '🎥 VIDEO DOWNLOADER\n\n' +
                    'Cara pakai:\n' +
                    '• .dl <url>\n' +
                    '• Atau reply URL dengan .dl\n\n' +
                    'Contoh:\n' +
                    '.dl https://id.pinterest.com/pin/XXXXXXXX/'
                );
                return;
            }

            // Reaksi proses
            await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // API
            const api = `https://ytdlp.antidonasi.web.id/download/video?url=${encodeURIComponent(url)}&quality=480p&format=mp4`;

            const res = await axios.get(api, {
                headers: {
                    accept: 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 30000
            });

            const result = res.data;
            if (!result || result.error) {
                throw new Error(result?.error || 'Gagal mengambil data video.');
            }

            // Kirim videonya
            const caption =
                `🎬 *VIDEO DOWNLOADER*\n\n` +
                `📌 Judul: ${result.title}\n` +
                `🔗 Source: ${url}\n` +
                `📥 Quality: ${result.quality}\n` +
                `📦 Format: ${result.format}`;

            const contextInfo = {
                externalAdReply: {
                    title: result.title || 'Video Downloader',
                    body: 'Konten diunduh via Kachina Bot',
                    thumbnailUrl: result.thumbnail,
                    sourceUrl: url,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            };

            await sock.sendMessage(
                m.chat,
                {
                    video: { url: result.url },
                    caption,
                    contextInfo
                },
                { quoted: m }
            );

            // Reaksi sukses
            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error('Error in .dl downloader:', error);
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            let msg = '❌ Gagal mendownload video!';
            if (error.code === 'ECONNABORTED') msg += '\n\nTimeout bos, coba ulang.';
            else if (error.response?.status === 429) msg += '\n\nTerlalu banyak request, sabar bang.';
            else if (error.response?.status === 400) msg += '\n\nURL invalid kayak hubungan kamu 😭.';
            else msg += `\n\nError: ${error.message}`;

            await m.reply(msg);
        }
    }
};

export default handler;
