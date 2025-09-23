import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';

export const handler = {
    command: ['hd'],
    category: 'image',
    help: 'Meningkatkan kualitas gambar (upscale) hingga 4x',
    exec: async ({ m, args, sock }) => {
        try {
            let imageUrl = '';
            let buffer;
            let scale = 4; // Default scale

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Parse scale jika ada di args
            if (args && args.trim() && !isNaN(args.trim())) {
                scale = parseInt(args.trim());
                // Batasi skala antara 1-4
                if (scale < 1 || scale > 4) scale = 4;
            }

            // Check if URL provided in args (jika bukan angka)
            if (args && args.trim() && isNaN(args.trim())) {
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
                    await m.reply(`🖼️ *UPSCALE IMAGE*\n\nCara penggunaan:\n1. Kirim gambar dengan caption .upscale [1-4]\n2. Reply gambar dengan .upscale [1-4]\n3. .upscale <url_gambar>\n\n✨ Fitur:\n• Meningkatkan resolusi gambar hingga 4x\n• Memperbaiki kualitas gambar\n• Hasil lebih tajam dan detail\n• Mendukung URL gambar\n\n📸 Format yang didukung:\n• JPG, PNG, WEBP`);
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

            // Call upscale API
            const apiUrl = `https://api.siputzx.my.id/api/tools/upscale?url=${encodeURIComponent(imageUrl)}&scale=${scale}`;
            const response = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 120000 // 2 menit timeout
            });

            // Check if response is image data
            if (response.data && response.data.byteLength > 0) {
                // Send processed image
                await sock.sendMessage(m.chat, {
                    image: Buffer.from(response.data),
                    caption: `🖼️ *IMAGE UPSCALED*\n\n✨ Gambar berhasil di-upscale ${scale}x!\n ⏰ *Processed:* ${new Date().toLocaleString('id-ID')}`,
                    contextInfo: {
                        externalAdReply: {
                            title: '🖼️ Image Upscaler',
                            body: 'Meningkatkan kualitas gambar hingga 4x',
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
            
            // Add error reaction
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            
            let errorMessage = '❌ Gagal melakukan upscale gambar!';
            
            if (error.message.includes('Gagal mengunduh gambar')) {
                errorMessage = '❌ Gagal mengunduh gambar. Pastikan gambar valid.';
            } else if (error.message.includes('File harus berupa gambar')) {
                errorMessage = '❌ File yang dikirim bukan gambar. Gunakan format JPG, PNG, atau WEBP.';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server API tidak dapat diakses.';
            } else if (error.response?.status === 400) {
                errorMessage += '\n\n*Penyebab:* URL gambar tidak valid atau tidak dapat diakses.';
            } else if (error.response?.status === 429) {
                errorMessage += '\n\n*Penyebab:* Terlalu banyak request, coba lagi nanti.';
            } else {
                errorMessage += `\n\n*Error:* ${error.message}`;
            }

            await m.reply(errorMessage);
        }
    }
};