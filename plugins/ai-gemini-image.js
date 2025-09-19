import axios from 'axios';

const GEMINI_API_BASE = process.env.GEMINI_API_BASE || 'https://gemini.antidonasi.web.id';

export const handler = {
    command: ['gimage', 'imagen', 'geminiimage'],
    category: 'ai',
    help: 'Generate gambar menggunakan Gemini AI. Gunakan .gimage <prompt>',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ m, args, sock }) => {
        try {
            let prompt = args;

            // Validasi input
            if (!prompt) {
                await m.reply(`🎨 *GEMINI IMAGE GENERATOR*\n\nCara penggunaan:\n.gimage <prompt>\n\nContoh:\n.gimage A beautiful sunset over mountains\n.gimage Cute cat playing with yarn\n.gimage Futuristic city with flying cars\n\n💡 Tips:\n• Gunakan deskripsi yang detail\n• Bahasa Inggris memberikan hasil terbaik\n• Hindari konten yang tidak pantas`);
                return;
            }

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '🎨', key: m.key }
            });

            // Prepare request data
            const requestData = {
                model: 'gemini-2.5-flash',
                prompt: prompt
            };

            // Call Gemini API Wrapper
            const response = await axios.post(`${GEMINI_API_BASE}/image/generate`, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 120000, // 2 menit timeout untuk generate image
                responseType: 'arraybuffer' // Expect binary data
            });

            // Check if response is image data
            if (response.data && response.data.byteLength > 0) {
                // Send image
                await sock.sendMessage(m.chat, {
                    image: Buffer.from(response.data),
                    caption: `🎨 *GEMINI IMAGE GENERATED*\n\n📝 *Prompt:* ${prompt}\n⏰ *Generated:* ${new Date().toLocaleString('id-ID')}`,
                    contextInfo: {
                        externalAdReply: {
                            title: '🎨 Gemini Image Generator',
                            body: prompt,
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
            console.error('Error in gemini image command:', error);
            
            let errorMessage = '❌ Gagal generate gambar!';
            
            if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server API tidak dapat diakses.';
            } else if (error.response?.status === 400) {
                errorMessage += '\n\n*Penyebab:* Prompt tidak valid atau mengandung konten yang dilarang.';
            } else if (error.response?.status === 429) {
                errorMessage += '\n\n*Penyebab:* Terlalu banyak permintaan. Coba lagi nanti.';
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