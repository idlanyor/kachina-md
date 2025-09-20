import { spotifydl } from '../lib/scraper/spotify.js'

export const handler = {
    command: ['spotify'],
    category: 'downloader',
    help: 'Mencari dan memutar lagu dari Spotify\n*Contoh:* !spotify https://open.spotify.com/track/...',
    exec: async ({ sock, m, args }) => {
        try {
            console.log(args)
            if (!args || args.length === 0) {
                await m.reply('🎵 Masukkan URL Spotify yang ingin diunduh\n*Contoh:* !spotify https://open.spotify.com/track/6yID3RbYKiwn2p2LPz0OkK');
                return;
            }

            const url = args;
            if (!url.includes('open.spotify.com')) {
                await m.reply('❌ URL tidak valid. Gunakan URL Spotify yang benar.');
                return;
            }

            // Kirim reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '🔍', key: m.key }
            });

            // Mengunduh lagu menggunakan scraper
            const result = await spotifydl(url);
            if (!result || !result.download_url) {
                await m.reply('❌ Lagu tidak ditemukan atau tidak bisa diunduh');
                return;
            }

            // Proses data artists (array) dan album images
            const artistNames = Array.isArray(result.artists) 
                ? result.artists.map(artist => artist.name).join(', ')
                : result.artists || result.artist || 'Unknown Artist';
            
            const thumbnailUrl = result.album?.images?.[0]?.url || result.image || result.thumbnail;
            const trackName = result.name || result.title || 'Unknown Track';
            const duration = result.duration_ms 
                ? Math.floor(result.duration_ms / 1000 / 60) + ':' + String(Math.floor((result.duration_ms / 1000) % 60)).padStart(2, '0')
                : 'N/A';

            // Kirim thumbnail dan info serta audio dalam satu pesan
            const messageText = `🎧 *SPOTIFY DOWNLOADER*

🎵 *Judul:* ${trackName}
👤 *Artis:* ${artistNames}
⏱️ *Durasi:* ${duration}
🆔 *ID:* ${result.id || 'N/A'}
🎼 *Type:* ${result.type || 'track'}

_Sedang mengirim audio, mohon tunggu..._`;

            await sock.sendMessage(m.chat, {
                text: messageText,
                contextInfo: {
                    externalAdReply: {
                        title: '乂 Spotify Downloader 乂',
                        body: `${trackName} - ${artistNames}`,
                        thumbnailUrl: thumbnailUrl,
                        sourceUrl: result.external_urls?.spotify || url,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });

            // Kirim audio
            await sock.sendMessage(m.chat, {
                audio: { url: result.download_url },
                mimetype: 'audio/mpeg',
                fileName: `${trackName}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: trackName,
                        body: artistNames,
                        thumbnailUrl: thumbnailUrl,
                        sourceUrl: result.external_urls?.spotify || url,
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
            await m.reply('❌ Gagal mengunduh lagu. Pastikan URL Spotify valid dan coba lagi nanti.');
        }
    }
}

export default handler;