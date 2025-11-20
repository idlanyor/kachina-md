import axios from 'axios';
import FormData from 'form-data';

class IlariaUpscaler {
    constructor() {
        this.api_url = 'https://thestinger-ilaria-upscaler.hf.space/gradio_api';
        this.file_url = 'https://thestinger-ilaria-upscaler.hf.space/gradio_api/file=';
    }

    generateSession() {
        return Math.random().toString(36).substring(2);
    }

    async upload(buffer) {
        try {
            const upload_id = this.generateSession();
            const orig_name = `rynn_${Date.now()}.jpg`;
            const form = new FormData();
            form.append('files', buffer, orig_name);
            const { data } = await axios.post(`${this.api_url}/upload?upload_id=${upload_id}`, form, {
                headers: {
                    ...form.getHeaders()
                }
            });

            return {
                orig_name,
                path: data[0],
                url: `${this.file_url}${data[0]}`
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async process(buffer, options = {}) {
        try {
            const {
                model = 'RealESRGAN_x4plus',
                denoice_strength = 0.5,
                resolution = 4,
                fase_enhancement = false
            } = options;

            const _model = ['RealESRGAN_x4plus', 'RealESRNet_x4plus', 'RealESRGAN_x4plus_anime_6B', 'RealESRGAN_x2plus', 'realesr-general-x4v3'];

            if (!Buffer.isBuffer(buffer)) throw new Error('Image buffer is required');
            if (!_model.includes(model)) throw new Error(`Available models: ${_model.join(', ')}`);
            if (denoice_strength > 1) throw new Error('Max denoice strength: 1');
            if (resolution > 6) throw new Error('Max resolution: 6');
            if (typeof fase_enhancement !== 'boolean') throw new Error('Fase enhancement must be boolean');

            const image_url = await this.upload(buffer);
            const session_hash = this.generateSession();
            await axios.post(`${this.api_url}/queue/join?`, {
                data: [
                    {
                        path: image_url.path,
                        url: image_url.url,
                        orig_name: image_url.orig_name,
                        size: buffer.length,
                        mime_type: 'image/jpeg',
                        meta: {
                            _type: 'gradio.FileData'
                        }
                    },
                    model,
                    denoice_strength,
                    fase_enhancement,
                    resolution
                ],
                event_data: null,
                fn_index: 1,
                trigger_id: 20,
                session_hash: session_hash
            });

            const { data } = await axios.get(`${this.api_url}/queue/data?session_hash=${session_hash}`);

            let result;
            const lines = data.split('\n\n');
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    try {
                        const d = JSON.parse(line.substring(6));
                        if (d.msg === 'process_completed') {
                            // Cek jika ada error dari server
                            if (d.success === false || (d.output && d.output.error)) {
                                const errorMsg = d.output?.error || d.title || 'Unknown error from server';
                                throw new Error(errorMsg);
                            }

                            // Validasi struktur response untuk hasil sukses
                            if (d.output && d.output.data && Array.isArray(d.output.data) && d.output.data.length > 0) {
                                result = d.output.data[0].url;
                            }
                        }
                    } catch (parseError) {
                        // Jika ini adalah Error yang kita throw, lempar lagi
                        if (parseError instanceof Error && parseError.message !== 'Unexpected token') {
                            throw parseError;
                        }
                        // Skip jika ada error parsing JSON
                        continue;
                    }
                }
            }

            if (!result) {
                throw new Error('Tidak dapat memproses gambar. Server tidak mengembalikan hasil yang valid.');
            }

            return result;
        } catch (error) {
            // Berikan pesan error yang lebih deskriptif
            if (error.response) {
                throw new Error(`API Error: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.request) {
                throw new Error('Tidak dapat terhubung ke server upscaler. Periksa koneksi internet Anda.');
            } else {
                throw new Error(error.message || 'Terjadi kesalahan saat memproses gambar');
            }
        }
    }
}

export const handler = {
    command: ['hd2', 'upscale2', 'enhance2'],
    category: 'tools',
    help: 'Tingkatkan kualitas gambar menggunakan AI (HD Upscaler V2)',
    exec: async ({ sock, m, args }) => {
        try {
            let buffer;

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Parse options dari args
            let options = {
                model: 'RealESRGAN_x4plus',
                denoice_strength: 0.5,
                resolution: 4,
                fase_enhancement: false
            };

            if (args && args.length > 0) {
                const input = args.toLowerCase();

                // Check untuk model anime
                if (input.includes('anime')) {
                    options.model = 'RealESRGAN_x4plus_anime_6B';
                }

                // Check untuk face enhancement
                if (input.includes('face') || input.includes('wajah')) {
                    options.fase_enhancement = true;
                }

                // Check untuk resolution
                const resMatch = input.match(/res(?:olution)?[\s:]*(\d)/);
                if (resMatch) {
                    options.resolution = Math.min(parseInt(resMatch[1]), 6);
                }
            }

            // Handle image dari quoted message atau message langsung
            if (m.quoted && m.quoted.message?.imageMessage) {
                buffer = await m.quoted.download();
            } else if (m.message && m.message.imageMessage) {
                buffer = await m.download();
            } else {
                await m.reply(`🖼️ *AI IMAGE UPSCALER V2*\n\nCara penggunaan:\n1. Kirim gambar dengan caption .hd2 [options]\n2. Reply gambar dengan .hd2 [options]\n\n✨ Fitur:\n• Upscale gambar hingga 6x resolusi\n• Model khusus untuk anime\n• Face enhancement untuk wajah\n• Berbagai pilihan model AI\n\n⚙️ *Options (opsional):*\n• anime - Gunakan model anime\n• face/wajah - Aktifkan face enhancement\n• res:1-6 - Set resolusi (default: 4)\n\n📸 *Contoh penggunaan:*\n• .hd2\n• .hd2 anime\n• .hd2 face\n• .hd2 anime face res:6\n\n🤖 *Model tersedia:*\n• RealESRGAN_x4plus (default)\n• RealESRGAN_x4plus_anime_6B\n• RealESRNet_x4plus\n• RealESRGAN_x2plus\n• realesr-general-x4v3`);
                return;
            }

            if (!buffer) {
                throw new Error('Gagal mengunduh gambar!');
            }

            await m.reply('🔄 Memproses gambar dengan AI, harap tunggu...\n_Proses ini mungkin memakan waktu beberapa detik_');

            // Proses upscale
            const upscaler = new IlariaUpscaler();
            const resultUrl = await upscaler.process(buffer, options);

            if (!resultUrl) {
                throw new Error('Tidak ada data gambar yang diterima');
            }

            // Download hasil dan kirim
            const { data: resultBuffer } = await axios.get(resultUrl, {
                responseType: 'arraybuffer'
            });

            await sock.sendMessage(m.chat, {
                image: Buffer.from(resultBuffer),
                caption: `✅ *GAMBAR BERHASIL DI-UPSCALE!*\n\n📊 *Detail Pemrosesan:*\n• Model: ${options.model}\n• Resolution: ${options.resolution}x\n• Face Enhancement: ${options.fase_enhancement ? 'Ya' : 'Tidak'}\n• Processed: ${new Date().toLocaleString('id-ID')}\n\n_Powered by Ilaria Upscaler_`,
                contextInfo: {
                    externalAdReply: {
                        title: '🖼️ AI Image Upscaler V2',
                        body: 'Tingkatkan kualitas gambar menggunakan AI',
                        thumbnailUrl: `${globalThis.ppUrl}`,
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
            console.error('Error in hd2 upscaler:', error);

            // Tambahkan reaksi error
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });

            let errorMessage = '❌ Gagal melakukan upscale gambar!';

            if (error.message.includes('GPU quota exceeded') || error.message.includes('exceeded your GPU quota')) {
                // Extract waktu tunggu jika ada
                const timeMatch = error.message.match(/Try again in (\d+:\d+:\d+)/);
                const waitTime = timeMatch ? timeMatch[1] : 'beberapa saat';
                errorMessage = `⏱️ *Server sedang sibuk!*\n\n*Penyebab:* GPU quota server telah habis.\n*Solusi:* Coba lagi dalam ${waitTime}\n\nℹ️ Service ini menggunakan free tier GPU yang memiliki batasan penggunaan.`;
            } else if (error.message.includes('Gagal mengunduh gambar')) {
                errorMessage = '❌ Gagal mengunduh gambar. Pastikan gambar valid.';
            } else if (error.message.includes('Image buffer is required')) {
                errorMessage = '❌ Buffer gambar tidak valid.';
            } else if (error.message.includes('Available models')) {
                errorMessage = `❌ Model tidak valid.\n\n*Error:* ${error.message}`;
            } else if (error.message.includes('Max denoice strength')) {
                errorMessage = '❌ Denoice strength maksimal adalah 1.';
            } else if (error.message.includes('Max resolution')) {
                errorMessage = '❌ Resolusi maksimal adalah 6.';
            } else if (error.message.includes('Tidak ada data gambar yang diterima') || error.message.includes('Tidak dapat memproses gambar')) {
                errorMessage = '❌ Server tidak mengembalikan hasil yang valid. Coba lagi nanti.';
            } else if (error.message.includes('Tidak dapat terhubung ke server upscaler')) {
                errorMessage = '❌ Tidak dapat terhubung ke server upscaler.\n\n*Penyebab:* Periksa koneksi internet Anda.';
            } else if (error.message.includes('API Error')) {
                errorMessage = `❌ Terjadi kesalahan pada server.\n\n*Error:* ${error.message}`;
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server API tidak dapat diakses.';
            } else if (error.response?.status === 400) {
                errorMessage += '\n\n*Penyebab:* Request tidak valid atau gambar tidak dapat diproses.';
            } else if (error.response?.status === 429) {
                errorMessage += '\n\n*Penyebab:* Terlalu banyak request, coba lagi nanti.';
            } else {
                errorMessage += `\n\n*Error:* ${error.message}`;
            }

            await m.reply(errorMessage);
        }
    }
};

export default handler;
