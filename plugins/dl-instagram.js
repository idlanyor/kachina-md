import axios from 'axios';

export const handler = {
    command: ['ig'],
    category: 'downloader',
    help: 'Download konten Instagram (Reels/Posting). Gunakan .ig <url> atau reply pesan yang berisi URL.',
    async exec({ sock, m, args }) {
        try {
            // Ambil URL dari argumen atau reply
            let url = typeof args === 'string' ? args.trim() : '';
            if (!url && m.quoted) {
                url = (m.quoted.text || m.quoted.message?.conversation || '').trim();
            }

            // Validasi input
            if (!url) {
                await m.reply(
                    '📸 INSTAGRAM DOWNLOADER\n\n' +
                    'Cara penggunaan:\n' +
                    '1. .ig <url instagram>\n' +
                    '2. Reply pesan yang berisi URL dengan .ig\n\n' +
                    'Contoh:\n' +
                    '.ig https://www.instagram.com/reel/XXXXXXXX/\n' +
                    '.ig https://www.instagram.com/p/XXXXXXXX/'
                );
                return;
            }

            if (!url.includes('instagram.com')) {
                await m.reply('❌ URL tidak valid! Harus URL Instagram.');
                return;
            }

            // Reaksi proses
            await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // Panggil Ryzumi API
            const apiUrl = `https://api.ryzumi.vip/api/downloader/igdl?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, {
                headers: {
                    accept: 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });

            const result = response.data;

            if (!result?.status || !Array.isArray(result.data) || result.data.length === 0) {
                throw new Error('Tidak ada media ditemukan pada URL Instagram tersebut');
            }

            // Kirim semua media yang ditemukan (video/gambar)
            for (const item of result.data) {
                const mediaUrl = item.url;
                const thumbUrl = item.thumbnail;
                const mediaType = item.type || (mediaUrl?.endsWith('.mp4') ? 'video' : 'image');

                const caption = `📸 *INSTAGRAM DOWNLOADER*\n\n` +
                    `🔗 Source: ${url}\n` +
                    `🗂 Type: ${mediaType}`;

                const contextInfo = {
                    externalAdReply: {
                        title: 'Instagram Downloader',
                        body: 'Konten diunduh menggunakan Kachina Bot',
                        thumbnailUrl: thumbUrl || `${globalThis.ppUrl}`,
                        sourceUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                };

                if (mediaType === 'video') {
                    await sock.sendMessage(m.chat, {
                        video: { url: mediaUrl },
                        caption,
                        thumbnail: thumbUrl,
                        contextInfo
                    }, { quoted: m });
                } else {
                    await sock.sendMessage(m.chat, {
                        image: { url: mediaUrl },
                        caption,
                        contextInfo
                    }, { quoted: m });
                }
            }

            // Reaksi sukses
            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error('Error in instagram downloader:', error);
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            let errorMessage = '❌ Gagal mendownload konten Instagram!';
            if (error.code === 'ECONNABORTED') {
                errorMessage += '\n\n*Penyebab:* Permintaan timeout, coba lagi.';
            } else if (error.response?.status === 429) {
                errorMessage += '\n\n*Penyebab:* Terlalu banyak request. Coba lagi nanti.';
            } else if (error.response?.status === 400) {
                errorMessage += '\n\n*Penyebab:* URL tidak valid.';
            } else if (error.message) {
                errorMessage += `\n\n*Error:* ${error.message}`;
            }

            await m.reply(errorMessage);
        }
    }
};

export default handler;

