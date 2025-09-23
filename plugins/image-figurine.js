import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';

const GEMINI_API_BASE = process.env.GEMINI_API_BASE || 'http://localhost:3000';

export const handler = {
    command: ['figurine'],
    category: 'image',
    help: 'AI Figure Maker',
    exec: async ({ m, args, sock }) => {
        try {
            let imageUrl = '';
            let buffer;

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '🗿', key: m.key }
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
                    await m.reply(`🗿 *FIGURINE GENERATOR*\n\nCara penggunaan:\n1. Kirim gambar dengan caption .figurine\n2. Reply gambar dengan .figurine\n3. .figurine <url_gambar>\n\n✨ Fitur:\n• Convert gambar menjadi figurine realistis\n• Menggunakan AI untuk transformasi\n• Hasil berkualitas tinggi\n• Mendukung URL gambar\n\n📸 Format yang didukung:\n• JPG, PNG, WEBP`);
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

            // Call Nekolabs API untuk konversi gambar ke figurine
            const response = await axios.get(`https://api.nekolabs.my.id/tools/convert/tofigure`, {
                params: {
                    imageUrl: imageUrl
                },
                timeout: 180000 // 3 menit timeout
            });

            // Check if response contains result URL
            if (response.data && response.data.status && response.data.result) {
                // Download image from result URL
                const imageResponse = await axios.get(response.data.result, {
                    responseType: 'arraybuffer'
                });
                
                // Send processed image
                await sock.sendMessage(m.chat, {
                    image: Buffer.from(imageResponse.data),
                    caption: `🗿 *FIGURINE GENERATED*\n\n✨ Gambar berhasil diubah menjadi figurine realistis!\n🔗 *Source:* ${imageUrl}\n⏰ *Processed:* ${new Date().toLocaleString('id-ID')}`,
                    contextInfo: {
                        externalAdReply: {
                            title: '🗿 Figurine Generator',
                            body: 'AI-powered image transformation',
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
            console.error('Error in figurine command:', error);
            
            // Add error reaction
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            
            let errorMessage = '❌ Gagal membuat figurine!';
            
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

export default handler;