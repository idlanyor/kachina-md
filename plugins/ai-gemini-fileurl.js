import axios from 'axios';

const GEMINI_API_BASE = process.env.GEMINI_API_BASE || 'http://localhost:3000';

export const handler = {
    command: ['gfileurl', 'geminifileurl'],
    category: 'ai',
    help: 'Chat dengan Gemini AI menggunakan file dari URL\n\nFormat: .gfileurl <url> <pesan>',
    exec: async ({ sock, m, args }) => {
        try {
            const input = args.join(' ').split(' ');
            
            if (input.length < 2) {
                await m.reply(`🤖 *GEMINI FILE URL CHAT*\n\nCara penggunaan:\n.gfileurl <url> <pesan>\n\nContoh:\n.gfileurl https://example.com/image.jpg Jelaskan gambar ini\n.gfileurl https://example.com/doc.pdf Ringkas dokumen ini\n\n📎 Mendukung:\n• URL gambar (JPG, PNG, GIF, WEBP)\n• URL dokumen (PDF, TXT)\n• URL file lainnya\n\n⚠️ Catatan:\n• URL harus dapat diakses publik\n• File tidak boleh terlalu besar`);
                return;
            }

            const fileUrl = input[0];
            const message = input.slice(1).join(' ');

            // Validasi URL
            try {
                new URL(fileUrl);
            } catch {
                await m.reply('❌ URL tidak valid! Pastikan URL lengkap dengan http:// atau https://');
                return;
            }

            // Add waiting reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Call Gemini API Wrapper dengan GET method
            const response = await axios.get(`${GEMINI_API_BASE}/chat/with-file`, {
                params: {
                    model: 'gemini-2.0-flash-exp',
                    sessionId: m.sender,
                    message: message,
                    file: fileUrl
                },
                timeout: 120000 // 2 menit timeout
            });

            let aiResponse = '';
            if (response.data && response.data.response) {
                aiResponse = response.data.response;
            } else if (response.data) {
                aiResponse = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            } else {
                throw new Error('No response from API');
            }

            // Format response message
            let replyMessage = `🤖 *GEMINI FILE URL ANALYSIS*\n\n`;
            replyMessage += `👤 *Pesan:* ${message}\n`;
            replyMessage += `🔗 *File URL:* ${fileUrl}\n\n`;
            replyMessage += `🤖 *Analisis:*\n${aiResponse}\n\n`;
            replyMessage += `⏰ *Waktu:* ${new Date().toLocaleString('id-ID')}`;

            // Send result - split if too long
            if (replyMessage.length > 4096) {
                const headerMessage = `🤖 *GEMINI FILE URL ANALYSIS*\n\n👤 *Pesan:* ${message}\n🔗 *File:* ${fileUrl}\n\n🤖 *Analisis:*\n`;
                await m.reply(headerMessage);
                await m.reply(aiResponse);
            } else {
                await m.reply(replyMessage);
            }

            // Add success reaction
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in gemini file url command:', error);
            
            // Add error reaction
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            
            let errorMessage = '❌ Gagal menganalisis file dari URL!';
            
            if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server Gemini API wrapper tidak dapat diakses.';
            } else if (error.response?.status === 400) {
                errorMessage += '\n\n*Penyebab:* URL file tidak valid atau tidak dapat diakses.';
            } else if (error.response?.status === 404) {
                errorMessage += '\n\n*Penyebab:* File tidak ditemukan di URL tersebut.';
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