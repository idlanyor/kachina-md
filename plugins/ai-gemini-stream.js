import axios from 'axios';

// Base URL untuk Gemini API Wrapper - sesuaikan dengan server Anda
const GEMINI_API_BASE = process.env.GEMINI_API_BASE || 'https://gemini.antidonasi.web.id';

export const handler = {
    command: ['gstream', 'geministream'],
    category: 'ai',
    help: 'Chat dengan Gemini AI menggunakan streaming response. Gunakan .gstream <pesan>',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ m, args, sock }) => {
        try {
            let message = args;

            // Validasi input
            if (!message) {
                await m.reply(`🤖 *GEMINI STREAMING CHAT*\n\nCara penggunaan:\n.gstream <pesan>\n\nContoh:\n.gstream Jelaskan tentang AI\n.gstream Buat puisi tentang teknologi\n\n💡 Fitur:\n• Response streaming real-time\n• Mendukung tools dan thinking mode\n• Session management`);
                return;
            }

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Prepare request data
            const requestData = {
                model: 'gemini-2.5-flash',
                sessionId: m.sender, // Gunakan sender sebagai session ID
                message: message,
                useTools: true,
                useThinking: false
            };

            // Call Gemini API Wrapper
            const response = await axios.post(`${GEMINI_API_BASE}/chat/`, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60 detik timeout
            });

            let aiResponse = '';
            
            // Handle streaming response
            if (response.data) {
                aiResponse = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            }

            // Format pesan hasil
            let replyMessage = `🤖 *GEMINI STREAMING RESPONSE*\n\n`;
            replyMessage += `👤 *Pesan:* ${message}\n\n`;
            replyMessage += `🤖 *Jawaban:*\n${aiResponse}\n\n`;
            replyMessage += `⏰ *Waktu:* ${new Date().toLocaleString('id-ID')}`;

            // Kirim hasil (split jika terlalu panjang)
            if (replyMessage.length > 4096) {
                const headerMessage = `🤖 *GEMINI STREAMING RESPONSE*\n\n👤 *Pesan:* ${message}\n\n🤖 *Jawaban:*\n`;
                await m.reply(headerMessage);
                await m.reply(aiResponse);
            } else {
                await m.reply(replyMessage);
            }

            // Tambahkan reaksi sukses
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in gemini stream command:', error);
            
            let errorMessage = '❌ Gagal mendapatkan respons dari Gemini API!';
            
            if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server API tidak dapat diakses. Pastikan server Gemini API wrapper berjalan.';
            } else if (error.response?.status === 404) {
                errorMessage += '\n\n*Penyebab:* Endpoint tidak ditemukan. Periksa konfigurasi API.';
            } else if (error.code === 'ENOTFOUND') {
                errorMessage += '\n\n*Penyebab:* Host tidak ditemukan. Periksa URL API.';
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