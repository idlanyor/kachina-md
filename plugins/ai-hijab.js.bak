import axios from 'axios';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';

const GEMINI_API_BASE = process.env.GEMINI_API_BASE || 'https://gemini.antidonasi.web.id';

export const handler = {
    command: ['hijab', 'hijabkan'],
    category: 'ai',
    help: 'Convert rambut dalam gambar menjadi hijab putih gaya Indonesia. Kirim/reply gambar dengan .hijab',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ m, args, sock }) => {
        try {
            let buffer;

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '🧕', key: m.key }
            });

            // Handle image dari quoted message atau message langsung
            if (m.quoted && m.quoted.message?.imageMessage) {
                buffer = await m.quoted.download();
            } else if (m.message && m.message.imageMessage) {
                buffer = await m.download();
            } else {
                await m.reply(`🧕 *HIJAB GENERATOR*\n\nCara penggunaan:\n1. Kirim gambar dengan caption .hijab\n2. Reply gambar dengan .hijab\n\n✨ Fitur:\n• Convert rambut menjadi hijab putih\n• Gaya hijab Indonesia yang rapi\n• Menggunakan AI untuk transformasi natural\n\n📸 Format yang didukung:\n• JPG, PNG, WEBP\n\n⚠️ Catatan:\n• Pastikan wajah terlihat jelas\n• Hasil terbaik untuk foto portrait`);
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

            // Prepare form data
            const formData = new FormData();
            formData.append('image', buffer, {
                filename: `image.${fileType.ext}`,
                contentType: fileType.mime
            });

            // Call Gemini API Wrapper
            const response = await axios.post(`${GEMINI_API_BASE}/hijabkan/`, formData, {
                headers: {
                    ...formData.getHeaders()
                },
                timeout: 180000, // 3 menit timeout
                responseType: 'arraybuffer'
            });

            // Check if response is image data
            if (response.data && response.data.byteLength > 0) {
                // Send processed image
                await sock.sendMessage(m.chat, {
                    image: Buffer.from(response.data),
                    caption: `🧕 *HIJAB GENERATED*\n\n✨ Rambut berhasil diubah menjadi hijab putih gaya Indonesia!\n⏰ *Processed:* ${new Date().toLocaleString('id-ID')}`,
                    contextInfo: {
                        externalAdReply: {
                            title: '🧕 Hijab Generator',
                            body: 'AI-powered hijab transformation',
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
            console.error('Error in hijab command:', error);
            
            let errorMessage = '❌ Gagal membuat hijab!';
            
            if (error.message.includes('Gagal mengunduh gambar')) {
                errorMessage = '❌ Gagal mengunduh gambar. Pastikan gambar valid.';
            } else if (error.message.includes('File harus berupa gambar')) {
                errorMessage = '❌ File yang dikirim bukan gambar. Gunakan format JPG, PNG, atau WEBP.';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server API tidak dapat diakses.';
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