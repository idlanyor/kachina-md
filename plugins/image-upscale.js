import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';

export const handler = {
    command: ['hd'],
    category: 'image',
    help: 'Meningkatkan kualitas gambar menggunakan AI upscaler',
    exec: async ({ m, args, sock }) => {
        try {
            let imageUrl = '';
            let buffer;

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Check if URL provided in args
            if (args && args.trim()) {
                try {
                    new URL(args.trim());
                    imageUrl = args.trim();
                } catch {
                    await m.reply('❌ URL tidak valid! Pastikan URL lengkap dengan http:// atau https://');
                    return;
                }
            } else {
                // Handle image dari quoted message atau message langsung
                if (m.quoted && m.quoted.message?.imageMessage) {
                    buffer = await m.quoted.download();
                } else if (m.message && m.message.imageMessage) {
                    buffer = await m.download();
                } else {
                    await m.reply(`🖼️ *AI IMAGE UPSCALER*\n\nCara penggunaan:\n1. Kirim gambar dengan caption .hd\n2. Reply gambar dengan .hd\n3. .hd <url_gambar>\n\n✨ Fitur:\n• Meningkatkan resolusi gambar dengan AI\n• Memperbaiki kualitas gambar\n• Hasil lebih tajam dan detail\n• Mendukung URL gambar\n\n📸 Format yang didukung:\n• JPG, PNG, WEBP\n\n_Powered by NekoLabs PxPic Upscaler_`);
                    return;
                }

                if (!buffer) {
                    throw new Error('Gagal mengunduh gambar!');
                }

                // Validate file type
                const fileType = await fileTypeFromBuffer(buffer);
                if (!fileType || !fileType.mime.startsWith('image/')) {
                    throw new Error('File harus berupa gambar!');
                }

                // Upload to Ryzumi API to get URL
                const FormData = (await import('form-data')).default;
                const formData = new FormData();
                formData.append('file', buffer, {
                    filename: `image.${fileType.ext}`,
                    contentType: fileType.mime
                });

                const uploadResponse = await axios.post('https://api.ryzumi.vip/api/uploader/ryzencdn', formData, {
                    headers: {
                        'accept': 'application/json',
                        ...formData.getHeaders()
                    },
                    timeout: 60000
                });

                if (!uploadResponse.data || !uploadResponse.data.success || !uploadResponse.data.url) {
                    throw new Error('Gagal upload gambar ke server');
                }

                imageUrl = uploadResponse.data.url;
            }

            await m.reply('🔄 Memproses gambar dengan AI, harap tunggu...\n_Proses ini mungkin memakan waktu beberapa detik_');

            // Call upscale API - NekoLabs PxPic
            const apiUrl = `https://api.nekolabs.web.id/tools/pxpic/upscale?imageUrl=${encodeURIComponent(imageUrl)}`;
            const response = await axios.get(apiUrl, {
                timeout: 120000 // 2 menit timeout
            });

            // Validasi response
            if (!response.data || !response.data.success || !response.data.result) {
                throw new Error('Server tidak mengembalikan hasil yang valid');
            }

            // Download gambar hasil upscale
            const imageResponse = await axios.get(response.data.result, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            // Check if response is image data
            if (imageResponse.data && imageResponse.data.byteLength > 0) {
                // Send processed image
                await sock.sendMessage(m.chat, {
                    image: Buffer.from(imageResponse.data),
                    caption: `✅ *GAMBAR BERHASIL DI-UPSCALE!*\n\n📊 *Detail Pemrosesan:*\n• Response Time: ${response.data.responseTime || 'N/A'}\n• Processed: ${new Date().toLocaleString('id-ID')}\n\n_Powered by NekoLabs PxPic Upscaler_`,
                    contextInfo: {
                        externalAdReply: {
                            title: '🖼️ AI Image Upscaler',
                            body: 'Meningkatkan kualitas gambar dengan AI',
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
            console.error('Error in upscale command:', error);

            // Tambahkan reaksi error
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });

            let errorMessage = '❌ Gagal melakukan upscale gambar!';

            if (error.message.includes('Gagal mengunduh gambar')) {
                errorMessage = '❌ Gagal mengunduh gambar. Pastikan gambar valid.';
            } else if (error.message.includes('File harus berupa gambar')) {
                errorMessage = '❌ File yang dikirim bukan gambar. Gunakan format JPG, PNG, atau WEBP.';
            } else if (error.message.includes('Gagal upload gambar ke server')) {
                errorMessage = '❌ Gagal upload gambar ke CDN.\n\n*Penyebab:* Server upload sedang bermasalah.';
            } else if (error.message.includes('Server tidak mengembalikan hasil yang valid')) {
                errorMessage = '❌ Server tidak mengembalikan hasil yang valid.\n\n*Penyebab:* API gagal memproses gambar. Coba lagi nanti.';
            } else if (error.message.includes('Tidak ada data gambar yang diterima')) {
                errorMessage = '❌ Tidak dapat mengunduh hasil upscale.\n\n*Penyebab:* Server tidak mengembalikan gambar yang valid.';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server API tidak dapat diakses.';
            } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                errorMessage = '⏱️ Proses timeout!\n\n*Penyebab:* Server membutuhkan waktu terlalu lama. Coba lagi dengan gambar yang lebih kecil.';
            } else if (error.response?.status === 400) {
                errorMessage += '\n\n*Penyebab:* URL gambar tidak valid atau tidak dapat diakses.';
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