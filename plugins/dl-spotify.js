import { spotifyDownload } from '../lib/scraper/spotify.js';
import { spotifySearch } from '../lib/scraper/spotifySearch.js';

export const handler = {
    command: ['spotify', 'sp'],
    category: 'downloader',
    help: 'Download lagu Spotify',
    exec: async ({ sock, m, args }) => {
        try {
            if (!args || args.length === 0) {
                await m.reply('🎵 Masukkan URL Spotify atau kata kunci pencarian\n*Contoh:* !spotify https://open.spotify.com/track/ اُ...\n*Atau:* !spotify judul lagu');
                return;
            }

            // Kirim reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '🔍', key: m.key }
            });

            const input = args;
            let spotifyUrl;

            if (input.includes('open.spotify.com')) {
                spotifyUrl = input;
            } else {
                // Proses pencarian
                const searchResults = await spotifySearch(input);

                if (!searchResults.tracks || searchResults.tracks.length === 0) {
                    await m.reply('❌ Tidak ditemukan hasil untuk pencarian tersebut');
                    return;
                }

                const track = searchResults.tracks[0];
                spotifyUrl = track.url;
                await m.reply(`🎵 Menemukan: *${track.name}* by *${track.artist}*\n_Sedang memproses download..._`);
            }

            // Proses download menggunakan spotifyDownload (spotdl.io)
            const result = await spotifyDownload(spotifyUrl);

            if (!result.success) {
                await m.reply('❌ Gagal mengunduh lagu.');
                return;
            }

            const { metadata, download_url } = result;
            const duration = metadata.duration 
                ? Math.floor(metadata.duration / 1000 / 60) + ':' + String(Math.floor((metadata.duration / 1000) % 60)).padStart(2, '0')
                : 'N/A';

            const messageText = `🎧 *SPOTIFY DOWNLOADER*

🎵 *Judul:* ${metadata.title}
👤 *Artis:* ${metadata.artist}
💿 *Album:* ${metadata.album || 'N/A'}
🆔 *ID:* ${metadata.id || 'N/A'}
⏱️ *Durasi:* ${duration}

_Sedang mengirim audio, mohon tunggu..._`;

            await sock.sendMessage(m.chat, {
                text: messageText,
                contextInfo: {
                    externalAdReply: {
                        title: '乂 Spotify Downloader 乂',
                        body: `${metadata.title} - ${metadata.artist}`,
                        thumbnailUrl: metadata.image,
                        sourceUrl: `https://open.spotify.com/track/${metadata.id}`,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });

            await sock.sendMessage(m.chat, {
                audio: { url: download_url },
                mimetype: 'audio/mpeg',
                fileName: `${metadata.title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: metadata.title,
                        body: metadata.artist,
                        thumbnailUrl: metadata.image,
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
            console.error('Error in spotify downloader:', error);
            await m.reply('❌ Gagal mengunduh lagu: ' + error.message);
        }
    }
}

export default handler;
