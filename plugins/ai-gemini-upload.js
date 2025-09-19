import axios from 'axios';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';

const GEMINI_API_BASE = process.env.GEMINI_API_BASE || 'https://gemini.antidonasi.web.id';

export const handler = {
    command: ['gupload', 'geminiupload'],
    category: 'ai',
    help: 'Chat dengan Gemini AI menggunakan file upload. Kirim/reply file dengan .gupload <pesan>',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ m, args, sock }) => {
        try {
            let message = args || 'Analisis file ini';
            let buffer;

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Handle file dari quoted message atau message langsung
            if (m.quoted && (m.quoted.message?.imageMessage || m.quoted.message?.documentMessage || m.quoted.message?.audioMessage || m.quoted.message?.videoMessage)) {
                buffer = await m.quoted.download();
            } else if (m.message && (m.message.imageMessage || m.message.documentMessage || m.message.audioMessage || m.message.videoMessage)) {
                buffer = await m.download();
            } else {
                await m.reply(`🤖 *GEMINI FILE UPLOAD*\n\nCara penggunaan:\n1. Kirim file dengan caption .gupload [pesan]\n2. Reply file dengan .gupload [pesan]\n\nContoh:\n.gupload Jelaskan gambar ini\n.gupload Analisis dokumen ini\n\n📎 Mendukung:\n• Gambar (JPG, PNG, GIF)\n• Dokumen (PDF, TXT)\n• Audio (MP3, WAV)\n• Video (MP4, AVI)`);
                return;
            }

            if (!buffer) {
                throw new Error('Gagal mengunduh file!');
            }

            // Detect file type
            const fileType = await fileTypeFromBuffer(buffer);
            if (!fileType) {
                throw new Error('Format file tidak didukung!');
            }

            // Prepare form data
            const formData = new FormData();
            formData.append('message', message);
            formData.append('model', 'gemini-2.5-flash');
            formData.append('sessionId', m.sender);
            formData.append('file', buffer, {
                filename: `file.${fileType.ext}`,
                contentType: fileType.mime
            });

            // Call Gemini API Wrapper
            const response = await axios.post(`${GEMINI_API_BASE}/chat/upload`, formData, {
                headers: {
                    ...formData.getHeaders()
                },
                timeout: 120000 // 2 menit timeout untuk file upload
            });

            let aiResponse = '';
            if (response.data) {
                aiResponse = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            }

            // Format pesan hasil
            let replyMessage = `🤖 *GEMINI FILE ANALYSIS*\n\n`;
            replyMessage += `👤 *Pesan:* ${message}\n`;
            replyMessage += `📎 *File:* ${fileType.ext.toUpperCase()} (${(buffer.length / 1024).toFixed(2)} KB)\n\n`;
            replyMessage += `🤖 *Analisis:*\n${aiResponse}\n\n`;
            replyMessage += `⏰ *Waktu:* ${new Date().toLocaleString('id-ID')}`;

            // Kirim hasil
            if (replyMessage.length > 4096) {
                const headerMessage = `🤖 *GEMINI FILE ANALYSIS*\n\n👤 *Pesan:* ${message}\n📎 *File:* ${fileType.ext.toUpperCase()}\n\n🤖 *Analisis:*\n`;
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
            console.error('Error in gemini upload command:', error);
            
            let errorMessage = '❌ Gagal menganalisis file!';
            
            if (error.message.includes('Gagal mengunduh file')) {
                errorMessage = '❌ Gagal mengunduh file. Pastikan file valid.';
            } else if (error.message.includes('Format file tidak didukung')) {
                errorMessage = '❌ Format file tidak didukung. Gunakan gambar, dokumen, audio, atau video.';
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