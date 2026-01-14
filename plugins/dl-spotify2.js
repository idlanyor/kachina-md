import axios from 'axios';
import { Spotify } from '../lib/scraper/spotify2.js';

export const handler = {
    command: ['spotify2', 'sp2'],
    category: 'downloader',
    help: 'Download lagu Spotify (v2)',
    exec: async ({ sock, m, args }) => {
        try {
            if (!args || args.length === 0) {
                await m.reply('🎵 *SPOTIFY DOWNLOADER V2*\n\nCara penggunaan:\n1. !spotify2 <URL Spotify>\n2. !spotify2 <kata kunci pencarian>\n\n✨ Fitur:\n• Download audio MP3\n• Metadata lengkap\n\n📝 *Contoh:*\n• !spotify2 https://open.spotify.com/track/...\n• !spotify2 judul lagu - artis');
                return;
            }

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '🔍', key: m.key }
            });

            const input = args;
            let spotifyUrl;

            // Cek apakah input adalah URL Spotify atau kata kunci pencarian
            if (input.includes('open.spotify.com')) {
                spotifyUrl = input;
            } else {
                // Proses pencarian menggunakan API Ryzumi
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
                spotifyUrl = firstTrack.url;
            }

            await m.reply('🎵 Memproses download, harap tunggu...\n_Sedang mengambil metadata_');

            // Proses download menggunakan class Spotify
            const spotify = new Spotify(spotifyUrl);
            const result = await spotify.run();

            if (!result || !result.download) {
                throw new Error('Lagu tidak ditemukan atau tidak bisa diunduh');
            }

            const { metadata, download } = result;

            // Kirim info
            const messageText = `🎧 *SPOTIFY DOWNLOADER V2*

🎵 *Judul:* ${metadata.title}
👤 *Artis:* ${metadata.artist}
⏱️ *Durasi:* ${metadata.duration}
🆔 *ID:* ${metadata.id}

_Sedang mengirim audio, mohon tunggu..._`;

            await sock.sendMessage(m.chat, {
                text: messageText,
                contextInfo: {
                    externalAdReply: {
                        title: '🎧 Spotify Downloader V2',
                        body: `${metadata.title} - ${metadata.artist}`,
                        thumbnailUrl: metadata.images,
                        sourceUrl: `https://open.spotify.com/track/${metadata.id}`,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });

            // Kirim audio dengan buffer
            await sock.sendMessage(m.chat, {
                audio: download,
                mimetype: 'audio/mpeg',
                fileName: `${metadata.title} - ${metadata.artist}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: metadata.title,
                        body: metadata.artist,
                        thumbnailUrl: metadata.images,
                        sourceUrl: `https://open.spotify.com/track/${metadata.id}`,
                        mediaType: 1,
                    }
                }
            }, { quoted: m });

            // Kirim reaksi sukses
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in spotify2 downloader:', error);

            // Tambahkan reaksi error
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });

            let errorMessage = '❌ Gagal mengunduh lagu!';

            if (error.message.includes('Mana URL nya min')) {
                errorMessage = '❌ URL Spotify tidak ditemukan atau tidak valid.';
            } else if (error.message.includes('Token CSRF tidak ditemukan')) {
                errorMessage = '❌ Gagal mendapatkan token dari server.\n\n*Penyebab:* Server Spotmate sedang bermasalah.';
            } else if (error.message.includes('Gagal ambil data metadata')) {
                errorMessage = '❌ Gagal mengambil data lagu.\n\n*Penyebab:* URL tidak valid atau lagu tidak tersedia.';
            } else if (error.message.includes('Lagu tidak ditemukan atau tidak bisa diunduh')) {
                errorMessage = '❌ Lagu tidak dapat diunduh.\n\n*Penyebab:* File download tidak tersedia di server.';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server API tidak dapat diakses.';
            } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                errorMessage = '⏱️ Proses timeout!\n\n*Penyebab:* Server membutuhkan waktu terlalu lama. Coba lagi nanti.';
            } else {
                errorMessage += `\n\n*Error:* ${error.message}`;
            }

            await m.reply(errorMessage);
        }
    }
}

export default handler;