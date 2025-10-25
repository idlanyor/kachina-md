import axios from 'axios';
import * as cheerio from 'cheerio';

const CMD = 'xanohimitahananonamaewobokutachiwamadashiranai';

async function xnxxSearch(query) {
    const page = Math.floor(3 * Math.random()) + 1;
    const url = `https://www.xnxx.com/search/${encodeURIComponent(query)}/${page}`;
    const resp = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 30000
    });
    const $ = cheerio.load(resp.data);
    const results = [];

    $('div[id*="video"]').each((_, bkp) => {
        const title = $(bkp).find('.thumb-under p:nth-of-type(1) a').text().trim();
        const views = $(bkp).find('.thumb-under p.metadata span.right').contents().not('span.superfluous').text().trim();
        const resolution = $(bkp).find('.thumb-under p.metadata span.video-hd').contents().not('span.superfluous').text().trim();
        const duration = $(bkp).find('.thumb-under p.metadata').contents().not('span').text().trim();
        const cover = $(bkp).find('.thumb-inside .thumb img').attr('data-src') || $(bkp).find('.thumb-inside .thumb img').attr('src');
        const href = $(bkp).find('.thumb-inside .thumb a').attr('href');
        if (!href) return;
        const fixed = href.replace('/THUMBNUM/', '/');
        const link = `https://xnxx.com${fixed}`;
        results.push({ title, views, resolution, duration, cover, url: link });
    });
    return results;
}

async function xnxxDownload(url) {
    const resp = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        },
        timeout: 30000
    });
    const $ = cheerio.load(resp.data);

    // Aggregate all scripts for robust parsing
    const scripts = $('script').map((_, el) => $(el).html() || '').get().join('\n');
    const extract = (re) => {
        const m = scripts.match(re);
        return m ? m[1] : undefined;
    };

    const videos = {
        low: extract(/html5player\.setVideoUrlLow\('(.*?)'\);/),
        high: extract(/html5player\.setVideoUrlHigh\('(.*?)'\);/),
        HLS: extract(/html5player\.setVideoHLS\('(.*?)'\);/)
    };
    const thumb = extract(/html5player\.setThumbUrl\('(.*?)'\);/);
    const title = $('title').text().trim();

    return { videos, thumb, title };
}

export const handler = {
    command: [CMD],
    category: 'HIDDEN',
    help: 'Private command',
    async exec({ sock, m, args }) {
        try {
            let text = typeof args === 'string' ? args.trim() : '';

            if (!text) {
                await m.reply(
                    `🔒 Private Command\n\n` +
                    `Usage:\n.${CMD} <query|url> [--low|--high]\n\n` +
                    `Examples:\n.${CMD} japanese\n.${CMD} https://www.xnxx.com/video-xxxxxxxx/slug --high`
                );
                return;
            }

            // Detect flags
            let quality = 'high';
            if (text.includes('--low')) quality = 'low';
            if (text.includes('--high')) quality = 'high';
            text = text.replace(/--low|--high/g, '').trim();

            // Show processing reaction
            await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // Decide search or download
            if (!text.includes('xnxx.com')) {
                const results = await xnxxSearch(text);
                if (!results.length) {
                    await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                    await m.reply('❌ Tidak ditemukan hasil. Coba kata kunci lain.');
                    return;
                }

                const top = results.slice(0, 10);
                let msg = `🔎 Hasil Pencarian (${text})\n\n`;
                top.forEach((r, i) => {
                    msg += `${i + 1}. ${r.title}\n` +
                           `   ⏱ ${r.duration} • 👁️ ${r.views} • ${r.resolution || '-'}\n` +
                           `   🔗 ${r.url}\n\n`;
                });
                msg += `Gunakan:.\n.${CMD} <url> untuk mengunduh.`;

                await m.reply(msg);
                await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
                return;
            }

            // Download flow
            const info = await xnxxDownload(text);
            const url = info.videos[quality] || info.videos.high || info.videos.low;
            if (!url) {
                await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                await m.reply('❌ Gagal mengambil URL video (mungkin hanya HLS tersedia).');
                return;
            }

            const caption = `✅ Download via Kachina Bot\n` +
                            `${info.title || 'Video'}\n` +
                            `Quality: ${quality.toUpperCase()}`;

            await sock.sendMessage(m.chat, {
                document: { url },
                fileName: `${(info.title || 'video').replace(/[^a-z0-9\s\-_\.]/gi, ' ').slice(0, 60)}.mp4`,
                mimetype: 'video/mp4',
                caption,
                contextInfo: {
                    externalAdReply: {
                        title: 'Downloaded Video',
                        body: 'Private command',
                        thumbnailUrl: info.thumb || globalThis.ppUrl,
                        sourceUrl: text,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        } catch (error) {
            console.error('Error in xnxx handler:', error);
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            await m.reply(`❌ Gagal memproses permintaan. ${error.message}`);
        }
    }
};

export default handler;

