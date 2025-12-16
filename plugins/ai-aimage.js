import axios from 'axios';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const handler = {
    command: ['aimage'],
    category: 'ai',
    help: 'AI Image Generator dengan Nano Banana',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ m, args, sock }) => {
        try {
            let prompt = args;

            // Jika tidak ada prompt tapi ada reply
            if (!prompt && m.quoted) {
                prompt = m.quoted.text || m.quoted.message?.conversation || '';
            }

            // Validasi input
            if (!prompt) {
                await m.reply(`🎨 *AI IMAGE GENERATOR (NANO BANANA)*\n\nCara penggunaan:\n1. .aimage <deskripsi gambar>\n2. Reply pesan dengan .aimage\n\nContoh:\n.aimage design a birthday card\n.aimage beautiful sunset over mountains\n.aimege cute cat wearing glasses\n\n💡 Tips:\n• Berikan deskripsi yang detail\n• Sebutkan objek, warna, dan suasana\n• Gunakan bahasa Inggris untuk hasil terbaik\n• Semakin detail prompt, semakin bagus hasil\n\n_Powered by Gemini 2.5 Flash Image (Nano Banana)_`);
                return;
            }

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Kirim pesan proses
            await m.reply(`🎨 Sedang membuat gambar dengan AI Nano Banana... Mohon tunggu sebentar`);

            // Encode prompt untuk URL
            const encodedPrompt = encodeURIComponent(prompt);

            // Call Nano Banana API
            const apiUrl = `https://aduhai.kanata.web.id/api/ai/nano-banana?prompt=${encodedPrompt}`;
            const response = await axios.get(apiUrl, {
                timeout: 180000 // 3 menit timeout
            });

            // Validasi response
            if (!response.data || response.data.status !== 'success') {
                throw new Error('Server tidak mengembalikan hasil yang valid');
            }

            // Download gambar dari URL
            const imageData = response.data.images[0];
            if (!imageData || !imageData.filePath) {
                throw new Error('Tidak ada gambar yang diterima');
            }

            const imageResponse = await axios.get(imageData.filePath, { 
                responseType: 'arraybuffer',
                timeout: 60000 
            });

            // Simpan gambar ke file temporary
            const tempDir = join(__dirname, '../temp');
            const tempFile = join(tempDir, `aimage_${Date.now()}.png`);
            await writeFile(tempFile, imageResponse.data);

            // Kirim gambar dengan caption
            await sock.sendMessage(m.chat, {
                image: { url: tempFile },
                caption: `🎨 *AI GENERATED IMAGE (NANO BANANA)*\n\n` +
                        `📝 *Prompt:* ${prompt}\n` +
                        `🤖 *Provider:* ${response.data.provider}\n` +
                        `📊 *Ukuran File:* ${(imageData.size / 1024 / 1024).toFixed(2)} MB\n` +
                        `⏰ *Generated at:* ${new Date().toLocaleString('id-ID')}\n\n` +
                        `${response.data.text || ''}`,
                contextInfo: {
                    externalAdReply: {
                        title: '🎨 AI Image Generator',
                        body: 'Powered by Gemini 2.5 Flash Image (Nano Banana)',
                        thumbnailUrl: tempFile,
                        sourceUrl: `${globalThis.newsletterUrl}`,
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
            console.error('Error in aimage command:', error);

            let errorMessage = '❌ Gagal membuat gambar!';

            if (error.message.includes('Server tidak mengembalikan hasil yang valid')) {
                errorMessage += '\n\n*Penyebab:* API gagal memproses prompt. Coba lagi nanti.';
            } else if (error.message.includes('Tidak ada gambar yang diterima')) {
                errorMessage += '\n\n*Penyebab:* Server tidak mengembalikan gambar yang valid.';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server API tidak dapat diakses.';
            } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                errorMessage = '⏱️ Proses timeout!\n\n*Penyebab:* Server membutuhkan waktu terlalu lama. Coba lagi dengan prompt yang lebih sederhana.';
            } else if (error.response?.status === 400) {
                errorMessage += '\n\n*Penyebab:* Prompt tidak valid atau mengandung konten yang tidak diizinkan.';
            } else if (error.response?.status === 429) {
                errorMessage += '\n\n*Penyebab:* Terlalu banyak permintaan. Coba lagi nanti.';
            } else if (error.response?.status === 500) {
                errorMessage += '\n\n*Penyebab:* Server mengalami error internal. Coba lagi nanti.';
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