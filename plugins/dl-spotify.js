import axios from 'axios';

export const handler = {
    command: ['spotify', 'sp'],
    category: 'downloader',
    help: 'Download lagu Spotify',
    exec: async ({ sock, m, args }) => {
        try {
            if (!args || args.length === 0) {
                await m.reply('🎵 Masukkan URL Spotify atau kata kunci pencarian\n*Contoh:* !spotify https://open.spotify.com/track/...\n*Atau:* !spotify judul lagu');
                return;
            }

            // Kirim reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '🔍', key: m.key }
            });

            const input = args;
            let trackData;
            let downloadUrl;

            // Cek apakah input adalah URL Spotify atau kata kunci pencarian
            if (input.includes('open.spotify.com')) {
                // Proses URL Spotify
                const encodedUrl = encodeURIComponent(input);
                const downloadResponse = await axios.get(`https://api.ryzumi.vip/api/downloader/spotify?url=${encodedUrl}`, {
                    headers: { 'accept': 'application/json' }
                });

                if (!downloadResponse.data.success) {
                    await m.reply('❌ Lagu tidak ditemukan atau tidak bisa diunduh');
                    return;
                }

                trackData = downloadResponse.data.metadata;
                downloadUrl = downloadResponse.data.link;
            } else {
                // Proses pencarian
                const encodedQuery = encodeURIComponent(input);
                const searchResponse = await axios.get(`https://api.ryzumi.vip/api/search/spotify?query=${encodedQuery}`, {
                    headers: { 'accept': 'application/json' }
                });

                if (!searchResponse.data.tracks || searchResponse.data.tracks.length === 0) {
                    await m.reply('❌ Tidak ditemukan hasil untuk pencarian tersebut');
                    return;
                }

                // Ambil hasil pertama
                const firstTrack = searchResponse.data.tracks[0];
                
                // Download lagu dari hasil pencarian
                const encodedUrl = encodeURIComponent(firstTrack.url);
                const downloadResponse = await axios.get(`https://api.ryzumi.vip/api/downloader/spotify?url=${encodedUrl}`, {
                    headers: { 'accept': 'application/json' }
                });

                if (!downloadResponse.data.success) {
                    await m.reply('❌ Lagu ditemukan tapi tidak bisa diunduh');
                    return;
                }

                trackData = downloadResponse.data.metadata;
                downloadUrl = downloadResponse.data.link;
            }

            // Format durasi jika tersedia dari pencarian
            const duration = trackData.duration_ms 
                ? Math.floor(trackData.duration_ms / 1000 / 60) + ':' + String(Math.floor((trackData.duration_ms / 1000) % 60)).padStart(2, '0')
                : 'N/A';

            // Kirim thumbnail dan info
            const messageText = `🎧 *SPOTIFY DOWNLOADER*

🎵 *Judul:* ${trackData.title}
👤 *Artis:* ${trackData.artists}
💿 *Album:* ${trackData.album || 'N/A'}
📅 *Rilis:* ${trackData.releaseDate || 'N/A'}
🆔 *ID:* ${trackData.id || 'N/A'}
${trackData.duration_ms ? `⏱️ *Durasi:* ${duration}` : ''}

_Sedang mengirim audio, mohon tunggu..._`;

            await sock.sendMessage(m.chat, {
                text: messageText,
                contextInfo: {
                    externalAdReply: {
                        title: '乂 Spotify Downloader 乂',
                        body: `${trackData.title} - ${trackData.artists}`,
                        thumbnailUrl: trackData.cover,
                        sourceUrl: `https://open.spotify.com/track/${trackData.id}`,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });

            // Kirim audio
            await sock.sendMessage(m.chat, {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${trackData.title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: trackData.title,
                        body: trackData.artists,
                        thumbnailUrl: trackData.cover,
                        sourceUrl: `https://open.spotify.com/track/${trackData.id}`,
                        mediaType: 1,
                    }
                }
            }, { quoted: m });

            // Kirim reaksi sukses
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in spotify downloader:', error);
            await m.reply('❌ Gagal mengunduh lagu. Pastikan URL Spotify valid atau coba kata kunci pencarian lain.');
        }
    }
}

export default handler;