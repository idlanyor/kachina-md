import axios from 'axios';
import crypto from 'crypto';

async function soraVideoGenerator(prompt, { ratio = 'portrait' } = {}) {
    try {
        if (!prompt) throw new Error('Prompt is required.');
        if (!['portrait', 'landscape'].includes(ratio)) throw new Error('Available ratios: portrait, landscape.');

        const api = axios.create({
            baseURL: 'https://api.bylo.ai/aimodels/api/v1/ai',
            headers: {
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'cache-control': 'max-age=0',
                connection: 'keep-alive',
                'content-type': 'application/json; charset=UTF-8',
                dnt: '1',
                origin: 'https://bylo.ai',
                pragma: 'no-cache',
                referer: 'https://bylo.ai/features/sora-2',
                'sec-ch-prefers-color-scheme': 'dark',
                'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
                'sec-ch-ua-arch': '""',
                'sec-ch-ua-bitness': '""',
                'sec-ch-ua-full-version': '"137.0.7337.0"',
                'sec-ch-ua-full-version-list': '"Chromium";v="137.0.7337.0", "Not/A)Brand";v="24.0.0.0"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-model': '"SM-F958"',
                'sec-ch-ua-platform': '"Android"',
                'sec-ch-ua-platform-version': '"15.0.0"',
                'sec-ch-ua-wow64': '?0',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
                'x-requested-with': 'XMLHttpRequest',
                uniqueId: crypto.randomUUID().replace(/-/g, '')
            }
        });

        const { data: task } = await api.post('/video/create', {
            prompt: prompt,
            channel: 'SORA2',
            pageId: 536,
            source: 'bylo.ai',
            watermarkFlag: true,
            privateFlag: true,
            isTemp: true,
            vipFlag: true,
            model: 'sora_video2',
            videoType: 'text-to-video',
            aspectRatio: ratio
        });

        // Polling untuk hasil (max 60 detik)
        let retries = 60;
        while (retries > 0) {
            const { data } = await api.get(`/${task.data}?channel=SORA2`);

            if (data.data.state > 0) {
                return JSON.parse(data.data.completeData);
            }

            await new Promise(res => setTimeout(res, 1000));
            retries--;
        }

        throw new Error('Timeout: Video generation took too long');
    } catch (error) {
        throw new Error(error.message);
    }
}

export const handler = {
    command: ['sora', 'soravideo'],
    category: 'ai',
    help: 'Generate video menggunakan AI Sora',
    exec: async ({ sock, m, args }) => {
        try {
            if (!args || args.length === 0) {
                await m.reply(`🎬 *SORA AI VIDEO GENERATOR*\n\nCara penggunaan:\n.sora <prompt> [ratio]\n\n✨ Fitur:\n• Generate video dari text prompt\n• Support portrait dan landscape\n• Powered by Sora 2 AI\n\n⚙️ *Ratio (opsional):*\n• portrait (default)\n• landscape\n\n📝 *Contoh penggunaan:*\n• .sora a woman relaxing on the beach\n• .sora portrait a cat playing with yarn\n• .sora landscape sunset over mountains\n\n⚠️ *Note:* Proses memakan waktu 30-60 detik`);
                return;
            }

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '🎬', key: m.key }
            });

            // Parse args untuk prompt dan ratio
            const input = args.toLowerCase();
            let ratio = 'portrait';
            let prompt = args;

            // Cek jika ada ratio di awal
            if (input.startsWith('portrait ') || input.startsWith('landscape ')) {
                const parts = args.split(' ');
                ratio = parts[0].toLowerCase();
                prompt = parts.slice(1).join(' ');
            }

            if (!prompt || prompt.trim() === '') {
                await m.reply('❌ Prompt tidak boleh kosong!');
                return;
            }

            await m.reply(`🎨 Generating video dengan AI Sora, harap tunggu...\n\n📝 *Prompt:* ${prompt}\n📐 *Ratio:* ${ratio}\n\n_Proses ini memakan waktu 30-60 detik_`);

            // Generate video
            const result = await soraVideoGenerator(prompt, { ratio });

            if (!result || !result.videoUrl) {
                throw new Error('Tidak ada data video yang diterima');
            }

            // Download video dan kirim
            const { data: videoBuffer } = await axios.get(result.videoUrl, {
                responseType: 'arraybuffer',
                timeout: 120000
            });

            const caption = `✅ *VIDEO BERHASIL DIGENERATE!*\n\n📝 *Prompt:* ${prompt}\n📐 *Ratio:* ${ratio}\n⏱️ *Duration:* ${result.duration || 'N/A'}\n🎬 *Model:* Sora 2 AI\n📅 *Generated:* ${new Date().toLocaleString('id-ID')}\n\n_Powered by Bylo.ai_`;

            await sock.sendMessage(m.chat, {
                video: Buffer.from(videoBuffer),
                caption: caption,
                contextInfo: {
                    externalAdReply: {
                        title: '🎬 Sora AI Video Generator',
                        body: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
                        thumbnailUrl: result.coverUrl || `${globalThis.ppUrl}`,
                        sourceUrl: `${globalThis.newsletterUrl}`,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

            // Kirim reaksi sukses
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in sora video generator:', error);

            // Tambahkan reaksi error
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });

            let errorMessage = '❌ Gagal generate video!';

            if (error.message.includes('Prompt is required')) {
                errorMessage = '❌ Prompt tidak boleh kosong!\n\n*Contoh:* .sora a woman relaxing on the beach';
            } else if (error.message.includes('Available ratios')) {
                errorMessage = '❌ Ratio tidak valid!\n\n*Ratio yang tersedia:* portrait, landscape';
            } else if (error.message.includes('Timeout')) {
                errorMessage = '⏱️ Proses timeout!\n\n*Penyebab:* Server membutuhkan waktu terlalu lama (>60s). Coba lagi dengan prompt yang lebih sederhana.';
            } else if (error.message.includes('Tidak ada data video yang diterima')) {
                errorMessage = '❌ Server tidak mengembalikan video.\n\n*Penyebab:* Proses AI gagal atau server sibuk. Coba lagi nanti.';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server API tidak dapat diakses.';
            } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                errorMessage = '⏱️ Koneksi timeout!\n\n*Penyebab:* Download video memakan waktu terlalu lama. Coba lagi.';
            } else if (error.response?.status === 400) {
                errorMessage += '\n\n*Penyebab:* Request tidak valid atau prompt tidak dapat diproses.';
            } else if (error.response?.status === 429) {
                errorMessage += '\n\n*Penyebab:* Terlalu banyak request, coba lagi nanti.';
            } else if (error.response?.status === 500) {
                errorMessage += '\n\n*Penyebab:* Server mengalami error internal. Coba lagi nanti.';
            } else {
                errorMessage += `\n\n*Error:* ${error.message}`;
            }

            await m.reply(errorMessage);
        }
    }
};

export default handler;
