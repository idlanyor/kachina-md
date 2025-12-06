import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';
import FormData from 'form-data';

export const handler = {
    command: ['editimg'],
    category: 'ai',
    help: 'Edit gambar menggunakan AI',
    exec: async ({ m, args, sock }) => {
        try {
            let buffer;
            let prompt = args || 'buatkan design isometric untuk gambar ini, bernuansa warna instagram';

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Handle image dari quoted message atau message langsung
            if (m.quoted && m.quoted.message?.imageMessage) {
                buffer = await m.quoted.download();
            } else if (m.message && m.message.imageMessage) {
                buffer = await m.download();
            } else {
                await m.reply(`🎨 *AI IMAGE EDITOR*\n\nCara penggunaan:\n1. Kirim gambar dengan caption *.editimg [prompt]*\n2. Reply gambar dengan *.editimg [prompt]*\n\nContoh:\n*.editimg*\n*.editimg buatkan design isometric untuk gambar ini, bernuansa warna instagram*\n*.editimg ubah menjadi anime style*\n\n✨ Fitur:\n• Edit gambar dengan AI\n• Berbagai gaya editing\n• Hasil berkualitas tinggi\n\n_Powered by Gemini 2.5 Flash Image_`);
                return;
            }

            if (!buffer) {
                throw new Error('No image detected!');
            }

            // Validate file type
            const fileType = await fileTypeFromBuffer(buffer);
            if (!fileType || !fileType.mime.startsWith('image/')) {
                throw new Error('File harus berupa gambar!');
            }

            // Kirim pesan proses
            await m.reply('🔄 Sedang mengedit gambar dengan AI, harap tunggu...\n_Proses ini mungkin memakan waktu beberapa menit_');

            // Buat FormData untuk request ke API
            const formData = new FormData();
            formData.append('image', buffer, {
                filename: `image.${fileType.ext}`,
                contentType: fileType.mime
            });
            formData.append('prompt', prompt);

            // Kirim request ke API edit image
            const response = await axios.post('https://aduhai.kanata.web.id/api/ai/edit-image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...formData.getHeaders()
                },
                timeout: 180000 // 3 menit timeout
            });

            // Validasi response
            if (!response.data || response.data.status !== 'success') {
                throw new Error('Server tidak mengembalikan hasil yang valid');
            }

            // Download gambar hasil edit
            const editedImage = response.data.editedImages[0];
            if (!editedImage || !editedImage.filePath) {
                throw new Error('Tidak ada gambar hasil edit yang diterima');
            }

            const imageResponse = await axios.get(editedImage.filePath, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            // Check if response is image data
            if (imageResponse.data && imageResponse.data.byteLength > 0) {
                // Send processed image
                await sock.sendMessage(m.chat, {
                    image: Buffer.from(imageResponse.data),
                    caption: `✅ *GAMBAR BERHASIL DIEDIT!*\n\n📝 *Prompt:* ${prompt}\n🤖 *Provider:* ${response.data.provider}\n📊 *Ukuran File:* ${(editedImage.size / 1024 / 1024).toFixed(2)} MB\n⏰ *Processed:* ${new Date().toLocaleString('id-ID')}\n\n${response.data.text || ''}`,
                    contextInfo: {
                        externalAdReply: {
                            title: '🎨 AI Image Editor',
                            body: 'Edit gambar dengan AI',
                            thumbnailUrl: `${globalThis.ppUrl}`,
                            sourceUrl: `${globalThis.newsletterUrl}`,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                });

                // Tambahkan reaksi sukses
                await sock.sendMessage(m.chat, {
                    react: { text: '✅', key: m.key }
                });
            } else {
                throw new Error('Tidak ada data gambar yang diterima');
            }

        } catch (error) {
            console.error('Error in editimg command:', error);

            // Tambahkan reaksi error
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });

            let errorMessage = '❌ Gagal mengedit gambar!';

            if (error.message.includes('No image detected')) {
                errorMessage = '❌ Harap reply atau kirim gambar yang valid.';
            } else if (error.message.includes('File harus berupa gambar')) {
                errorMessage = '❌ File yang Anda kirim bukan format gambar yang didukung.';
            } else if (error.message.includes('Server tidak mengembalikan hasil yang valid')) {
                errorMessage = '❌ Server tidak mengembalikan hasil yang valid.\n\n*Penyebab:* API gagal memproses gambar. Coba lagi nanti.';
            } else if (error.message.includes('Tidak ada gambar hasil edit yang diterima')) {
                errorMessage = '❌ Tidak ada gambar hasil edit yang diterima.\n\n*Penyebab:* API tidak mengembalikan gambar yang valid.';
            } else if (error.message.includes('Tidak ada data gambar yang diterima')) {
                errorMessage = '❌ Tidak dapat mengunduh hasil edit.\n\n*Penyebab:* Server tidak mengembalikan gambar yang valid.';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server API tidak dapat diakses.';
            } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                errorMessage = '⏱️ Proses timeout!\n\n*Penyebab:* Server membutuhkan waktu terlalu lama. Coba lagi dengan gambar yang lebih kecil.';
            } else if (error.response?.status === 400) {
                errorMessage += '\n\n*Penyebab:* Permintaan tidak valid. Pastikan gambar dan prompt sesuai.';
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