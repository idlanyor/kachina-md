import axios from 'axios';
import * as cheerio from 'cheerio';

class Spotify {
    constructor(url) {
        if (!url) throw new Error("Mana URL nya min");
        this.url = url;
        this.baseURL = "https://spotmate.online";
        this.userAgent =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
    }

    async getToken() {
        const res = await axios.get(this.baseURL, {
            headers: { "User-Agent": this.userAgent },
        });
        const html = res.data;
        const match = html.match(
            /<meta[^>]+(csrf[-_]?token|csrf|csrf_token)[^>]+content=["']([^"']+)["']/
        );
        if (!match) throw new Error("Token CSRF tidak ditemukan");
        const token = match[2];
        const cookie = (res.headers["set-cookie"] || [])
            .map((c) => c.split(";")[0])
            .join("; ");
        return { token, cookie };
    }

    async run() {
        try {
            const { token, cookie } = await this.getToken();
            const headers = {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": token,
                Cookie: cookie,
                Referer: this.baseURL + "/",
                "X-Requested-With": "XMLHttpRequest",
                "User-Agent": this.userAgent,
            };
            let result = {
                metadata: {},
                download: null
            }
            let r = await axios
                .post(this.baseURL + "/getTrackData", { spotify_url: this.url }, { headers })
                .catch((e) => e.response);
            if (r.status !== 200) throw new Error("Gagal ambil data metadata");
            const meta = r.data;
            result.metadata = {
                title: meta.name,
                id: meta.id,
                images: meta.album.images[0].url,
                duration: this.formatTime(meta.duration_ms),
                artist: meta.artists[0].name
            }

            const { data } = await axios.get(`https://genius.com/${result.metadata.artist.split(" ").join("-").toLowerCase()}-${result.metadata.title.split(" ").join("-").toLowerCase()}-lyrics`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                maxRedirects: 5,
                validateStatus: function (status) {
                    return status >= 200 && status < 400;
                }
            }).catch((e) => e.response);

            const $ = cheerio.load(data);
            const lyricsContainers = $('[data-lyrics-container="true"]');
            let lyrics = '';

            lyricsContainers.each((i, container) => {
                const containerText = $(container).html();
                const textWithBreaks = containerText
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/div>/gi, '\n')
                    .replace(/<[^>]+>/g, '');

                lyrics += textWithBreaks + '\n';
            });

            result.metadata.lyrics = lyrics.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n').split(';').pop() || 'Lyrics not found'

            const cdnURL = `https://cdn-spotify-247.zm.io.vn/download/${result.metadata.id}/syaiiganteng?name=${encodeURIComponent(result.metadata.title)}&artist=${encodeURIComponent(result.metadata.artist)}`
            const buffer = await axios.get(cdnURL, { responseType: "arraybuffer" }).catch(e => e.response);
            result.download = Buffer.from(buffer.data) || cdnURL
            return result;
        } catch (error) {
            console.error('Error in Spotify class:', error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
            }
            throw error;
        }
    }

    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

export const handler = {
    command: ['spotify2', 'sp2'],
    category: 'downloader',
    help: 'Download lagu Spotify dengan lyrics (v2)',
    exec: async ({ sock, m, args }) => {
        try {
            if (!args || args.length === 0) {
                await m.reply('🎵 *SPOTIFY DOWNLOADER V2*\n\nCara penggunaan:\n1. !spotify2 <URL Spotify>\n2. !spotify2 <kata kunci pencarian>\n\n✨ Fitur:\n• Download audio MP3\n• Scraping lyrics dari Genius\n• Metadata lengkap\n\n📝 *Contoh:*\n• !spotify2 https://open.spotify.com/track/...\n• !spotify2 judul lagu - artis');
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

            await m.reply('🎵 Memproses download, harap tunggu...\n_Sedang mengambil metadata dan lyrics_');

            // Proses download menggunakan class Spotify
            const spotify = new Spotify(spotifyUrl);
            const result = await spotify.run();

            if (!result || !result.download) {
                throw new Error('Lagu tidak ditemukan atau tidak bisa diunduh');
            }

            const { metadata, download } = result;

            // Kirim info dengan lyrics
            const messageText = `🎧 *SPOTIFY DOWNLOADER V2*

🎵 *Judul:* ${metadata.title}
👤 *Artis:* ${metadata.artist}
⏱️ *Durasi:* ${metadata.duration}
🆔 *ID:* ${metadata.id}

📝 *Lyrics:*
${metadata.lyrics && metadata.lyrics !== 'Lyrics not found' ? metadata.lyrics.substring(0, 500) + (metadata.lyrics.length > 500 ? '...\n\n_Lyrics dipotong karena terlalu panjang_' : '') : '❌ Lyrics tidak ditemukan'}

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
