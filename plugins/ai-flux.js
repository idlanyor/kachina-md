import axios from 'axios';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fluxlora(prompt, { lora = 'icons' } = {}) {
    try {
        const loras = {
            'icons': 'Flux-Icon-Kit-LoRA',
            'logos': 'FLUX.1-dev-LoRA-Logo-Design',
            'midjourney': 'Flux-Midjourney-Mix2-LoRA',
            'tarot-card': 'flux-tarot-v1',
            'vector-sketch': 'vector-illustration',
            'colored-sketch': 'Flux-Sketch-Ep-LoRA',
            'pencil-sketch': 'shou_xin',
            'anime-sketch': 'anime-blockprint-style'
        };

        if (!prompt) throw new Error('Prompt is required');
        if (!loras[lora]) throw new Error(`Available loras: ${Object.keys(loras).join(', ')}`);

        const { data } = await axios.post('https://www.loras.dev/api/image', {
            prompt: prompt,
            lora: loras[lora],
            userAPIKey: '3b6743c93d84ccd6374f72a30c48c35619df27db1c04727d15d22d22c70aecb5',
            seed: Math.floor(Math.random() * 10000000) + 1
        }, {
            headers: {
                'content-type': 'application/json'
            }
        });

        return data;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const handler = {
    command: ['flux'],
    category: 'ai',
    help: 'AI Flux',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ m, args, sock }) => {
        try {
            // Parse arguments untuk mendapatkan prompt dan lora option
            let prompt = args;
            let lora = 'midjourney'; // Default lora

            // Cek apakah ada parameter lora
            const loraMatch = args.match(/--lora=(\w+)/);
            if (loraMatch) {
                lora = loraMatch[1];
                // Hapus parameter lora dari prompt
                prompt = args.replace(/--lora=\w+/, '').trim();
            }

            // Jika tidak ada prompt tapi ada reply
            if (!prompt && m.quoted) {
                prompt = m.quoted.text || m.quoted.message?.conversation || '';
            }

            // Validasi input
            if (!prompt) {
                const loraList = ['icons', 'logos', 'midjourney', 'tarot-card', 'vector-sketch', 'colored-sketch', 'pencil-sketch', 'anime-sketch'];
                await m.reply(`🎨 *FLUX AI IMAGE GENERATOR*\n\nCara penggunaan:\n1. !flux <deskripsi gambar> --lora=<style>\n2. Reply pesan dengan !flux\n\nStyle yang tersedia:\n${loraList.map(l => `• ${l}`).join('\n')}\n\nContoh:\n!flux A majestic lion with golden mane in sunset --lora=midjourney\n!flux Cyberpunk city at night with neon lights --lora=vector-sketch\n\n💡 Tips:\n• Berikan deskripsi yang detail\n• Sebutkan style yang diinginkan\n• Jelaskan warna dan suasana\n• Semakin detail prompt, semakin bagus hasil`);
                return;
            }

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Kirim pesan proses
            await m.reply(`🎨 Sedang membuat gambar dengan style "${lora}"... Mohon tunggu sebentar`);

            // Proses generate gambar menggunakan fluxlora
            const response = await fluxlora(prompt, { lora });

            if (!response || !response.url) {
                throw new Error('Failed to generate image');
            }

            // Download gambar dari URL
            const imageResponse = await axios.get(response.url, { responseType: 'arraybuffer' });

            // Simpan gambar ke file temporary
            const tempDir = join(__dirname, '../../temp');
            const tempFile = join(tempDir, `flux_${Date.now()}.jpg`);
            await writeFile(tempFile, imageResponse.data);

            // Kirim gambar dengan caption
            await sock.sendMessage(m.chat, {
                image: { url: tempFile },
                caption: `🎨 *FLUX AI GENERATED IMAGE*\n\n` +
                        `📝 *Prompt:* ${prompt}\n` +
                        `🎭 *Style:* ${lora}\n` +
                        `⏰ *Generated at:* ${new Date().toLocaleString('id-ID')}`,
                contextInfo: {
                    externalAdReply: {
                        title: '🎨 Flux AI Image Generator',
                        body: `Style: ${lora}`,
                        thumbnailUrl: tempFile,
                        sourceUrl: 'https://www.loras.dev',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

            // Tambahkan reaksi sukses
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

            // Hapus file temporary setelah 1 menit
            setTimeout(() => {
                try {
                    fs.unlinkSync(tempFile);
                } catch (err) {
                    console.error('Error deleting temp file:', err);
                }
            }, 60000);

        } catch (error) {
            console.error('Error in flux command:', error);

            let errorMessage = '❌ Gagal membuat gambar!';

            if (error.message.includes('Available loras')) {
                const loraList = ['icons', 'logos', 'midjourney', 'tarot-card', 'vector-sketch', 'colored-sketch', 'pencil-sketch', 'anime-sketch'];
                errorMessage += `\n\n*Style yang tersedia:*\n${loraList.map(l => `• ${l}`).join('\n')}`;
            } else if (error.response?.status === 400) {
                errorMessage += '\n\n*Penyebab:* Prompt tidak valid atau terlalu pendek.';
            } else if (error.response?.status === 401) {
                errorMessage += '\n\n*Penyebab:* API key tidak valid.';
            } else if (error.response?.status === 429) {
                errorMessage += '\n\n*Penyebab:* Terlalu banyak permintaan. Coba lagi nanti.';
            } else if (error.code === 'ENOTFOUND') {
                errorMessage += '\n\n*Penyebab:* Tidak dapat terhubung ke server API.';
            } else {
                errorMessage += `\n\n*Error:* ${error.message}`;
            }

            await m.reply(errorMessage);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
        }
    }
};

export default handler;