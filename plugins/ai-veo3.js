import { GoogleGenAI } from "@google/genai";
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const handler = {
    command: ['veo3', 'veo'],
    category: 'ai',
    help: 'AI Video Generator dengan Google Veo 3.1',
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
                await m.reply(`🎬 *VEO 3.1 AI VIDEO GENERATOR*\n\nCara penggunaan:\n1. .veo3 <deskripsi video>\n2. Reply pesan dengan .veo3\n\nContoh:\n.veo3 A close up of two people staring at a cryptic drawing on a wall, torchlight flickering\n.veo3 A beautiful sunset over ocean with waves crashing\n.veo3 A cat playing with a ball in slow motion\n\n💡 Tips:\n• Berikan deskripsi yang detail dan spesifik\n• Jelaskan aksi, gerakan, dan suasana\n• Sebutkan pencahayaan dan angle kamera jika perlu\n• Gunakan bahasa Inggris untuk hasil terbaik\n• Proses video membutuhkan waktu 1-3 menit\n\n_Powered by Google Veo 3.1_`);
                return;
            }

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Kirim pesan proses
            await m.reply(`🎬 Sedang membuat video dengan Google Veo 3.1...\n\n⏰ Proses ini membutuhkan waktu 1-3 menit. Mohon bersabar!`);

            // Validate API key
            if (!globalThis.apiKey?.gemini) {
                throw new Error('API key tidak dikonfigurasi. Hubungi admin bot untuk mengatur API key Google AI di global.js');
            }

            // Initialize Google Gen AI
            const ai = new GoogleGenAI({
                apiKey: globalThis.apiKey.gemini
            });

            // Start video generation
            let operation = await ai.models.generateVideos({
                model: "veo-3.1-generate-preview",
                prompt: prompt,
            });

            // Poll the operation status until the video is ready
            let pollCount = 0;
            const maxPolls = 30; // Max 5 menit (10 detik x 30)
            
            while (!operation.done && pollCount < maxPolls) {
                pollCount++;
                
                // Update setiap 30 detik
                if (pollCount % 3 === 0) {
                    await m.reply(`⏳ Masih dalam proses... (${pollCount * 10} detik)`);
                }
                
                console.log(`Veo3: Waiting for video generation... (${pollCount * 10}s)`);
                await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
                
                operation = await ai.operations.getVideosOperation({
                    operation: operation,
                });
            }

            // Check if timeout
            if (!operation.done) {
                throw new Error('Video generation timeout. Coba lagi dengan prompt yang lebih sederhana.');
            }

            // Check if generation was successful
            if (!operation.response || !operation.response.generatedVideos || !operation.response.generatedVideos[0]) {
                throw new Error('Tidak ada video yang berhasil dibuat');
            }

            // Update status
            await m.reply(`✅ Video berhasil dibuat! Sedang mengunduh...`);

            // Download the generated video
            const tempDir = join(__dirname, '../temp');
            const tempFile = join(tempDir, `veo3_${Date.now()}.mp4`);

            await ai.files.download({
                file: operation.response.generatedVideos[0].video,
                downloadPath: tempFile,
            });

            console.log(`Veo3: Video saved to ${tempFile}`);

            // Get file size
            const stats = fs.statSync(tempFile);
            const fileSizeInMB = stats.size / (1024 * 1024);

            // Kirim video dengan caption
            await sock.sendMessage(m.chat, {
                video: { url: tempFile },
                caption: `🎬 *VEO 3.1 GENERATED VIDEO*\n\n` +
                        `📝 *Prompt:* ${prompt}\n` +
                        `📊 *Ukuran File:* ${fileSizeInMB.toFixed(2)} MB\n` +
                        `⏱️ *Waktu Proses:* ${pollCount * 10} detik\n` +
                        `⏰ *Generated at:* ${new Date().toLocaleString('id-ID')}\n\n` +
                        `_Powered by Google Veo 3.1_`,
                gifPlayback: false,
            }, { quoted: m });

            // Tambahkan reaksi sukses
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

            // Hapus file temporary setelah 2 menit
            setTimeout(() => {
                try {
                    fs.unlinkSync(tempFile);
                    console.log(`Veo3: Deleted temp file ${tempFile}`);
                } catch (err) {
                    console.error('Error deleting temp file:', err);
                }
            }, 120000);

        } catch (error) {
            console.error('Error in veo3 command:', error);

            let errorMessage = '❌ Gagal membuat video!';

            if (error.message.includes('timeout')) {
                errorMessage = '⏱️ Proses timeout!\n\n*Penyebab:* Server membutuhkan waktu terlalu lama. Coba lagi dengan prompt yang lebih sederhana atau tunggu beberapa saat.';
            } else if (error.message.includes('Tidak ada video yang berhasil dibuat')) {
                errorMessage += '\n\n*Penyebab:* Server tidak mengembalikan video yang valid. Coba dengan prompt yang berbeda.';
            } else if (error.message.includes('API key')) {
                errorMessage += '\n\n*Penyebab:* API key tidak valid atau belum dikonfigurasi. Hubungi admin bot.';
            } else if (error.message.includes('quota') || error.message.includes('limit')) {
                errorMessage += '\n\n*Penyebab:* Kuota API habis. Coba lagi nanti.';
            } else if (error.message.includes('content policy') || error.message.includes('safety')) {
                errorMessage += '\n\n*Penyebab:* Prompt mengandung konten yang tidak diizinkan oleh kebijakan Google.';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Tidak dapat terhubung ke server Google AI.';
            } else if (error.code === 'ETIMEDOUT') {
                errorMessage += '\n\n*Penyebab:* Koneksi timeout. Coba lagi nanti.';
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
