import axios from 'axios';

export const handler = {
    command: ['aigen'],
    category: 'ai',
    help: 'AI Chat dengan Gemini Flash',
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
                await m.reply(`🤖 *AI CHAT GEMINI FLASH GROUNDING*\n\nCara penggunaan:\n1. .aigen <pesan/pertanyaan>\n2. Reply pesan dengan .aigen\n\nContoh:\n.aigen berita hangat hari ini\n.aigen ceritakan tentang sejarah Indonesia\n.aigen buatkan puisi tentang alam\n.aigen jelaskan tentang teknologi AI\n\n💡 Fitur:\n• Chat dengan AI menggunakan Gemini Flash\n• Akses informasi terkini (real-time)\n• Grounding dengan sumber terpercaya\n• Jawaban dalam bahasa Indonesia\n• Support untuk berbagai topik\n\n_Powered by Gemini Flash with Grounding_`);
                return;
            }

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Encode prompt untuk URL
            const encodedPrompt = encodeURIComponent(prompt);

            // Call Gemini Flash API
            const apiUrl = `https://aduhai.kanata.web.id/api/ai/gemini-flash?prompt=${encodedPrompt}`;
            const response = await axios.get(apiUrl, {
                timeout: 120000 // 2 menit timeout
            });

            // Validasi response
            if (!response.data || !response.data.text) {
                throw new Error('Server tidak mengembalikan hasil yang valid');
            }

            const aiResponse = response.data.text;
            const groundingMetadata = response.data.groundingMetadata || {};

            // Format pesan hasil
            let formattedResponse = ``;
            formattedResponse += `${aiResponse}`;

            // Tambahkan informasi grounding jika ada
            if (groundingMetadata.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
                formattedResponse += `\n\n🔍 *Pencarian Terkait:*\n`;
                groundingMetadata.webSearchQueries.slice(0, 3).forEach((query, index) => {
                    formattedResponse += `${index + 1}. ${query}\n`;
                });
            }

            // Tambahkan sumber jika ada
            if (groundingMetadata.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
                formattedResponse += `\n\n📚 *Sumber:*\n`;
                groundingMetadata.groundingChunks.slice(0, 5).forEach((chunk, index) => {
                    if (chunk.web && chunk.web.title) {
                        formattedResponse += `${index + 1}. ${chunk.web.title}\n`;
                    }
                });
            }

            // Kirim hasil (split jika terlalu panjang)
            if (formattedResponse.length > 4096) {
                // Split pesan jika terlalu panjang
                await m.reply(aiResponse);
                
                // Kirim informasi tambahan jika ada
                let additionalInfo = '';
                if (groundingMetadata.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
                    additionalInfo += `\n\n🔍 *Pencarian Terkait:*\n`;
                    groundingMetadata.webSearchQueries.slice(0, 3).forEach((query, index) => {
                        additionalInfo += `${index + 1}. ${query}\n`;
                    });
                }
                
                if (groundingMetadata.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
                    additionalInfo += `\n\n📚 *Sumber:*\n`;
                    groundingMetadata.groundingChunks.slice(0, 5).forEach((chunk, index) => {
                        if (chunk.web && chunk.web.title) {
                            additionalInfo += `${index + 1}. ${chunk.web.title}\n`;
                        }
                    });
                }
                
                if (additionalInfo) {
                    await m.reply(additionalInfo);
                }
                
            } else {
                await m.reply(formattedResponse);
            }

            // Tambahkan reaksi sukses
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in aigen command:', error);

            let errorMessage = '❌ Gagal mendapatkan respons dari AI!';

            if (error.message.includes('Server tidak mengembalikan hasil yang valid')) {
                errorMessage += '\n\n*Penyebab:* API gagal memproses prompt. Coba lagi nanti.';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server API tidak dapat diakses.';
            } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                errorMessage = '⏱️ Proses timeout!\n\n*Penyebab:* Server membutuhkan waktu terlalu lama. Coba lagi dengan pertanyaan yang lebih sederhana.';
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