import FormData from 'form-data';
import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fileTypeFromBuffer } from 'file-type';

export const handler = {
    command: ['vision'],
    category: 'ai',
    help: 'Analisis gambar menggunakan AI Gemini 2.5 Flash.\n\nFormat: Kirim/Reply gambar dengan caption .vision [pertanyaan]',
    
    async exec({ sock, m, args }) {
        try {
            // Initialize Gemini AI
            if (!globalThis.apiKey.gemini) {
                throw new Error('API Key untuk Gemini tidak ditemukan. Silakan atur di globalThis.apiKey.gemini');
            }
            const genAI = new GoogleGenerativeAI(globalThis.apiKey.gemini);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            let buffer;
            let question = args || 'jelaskan gambar ini secara detail dalam bahasa indonesia.';

            // Add waiting reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Handle different message types to get the image buffer
            if (m.quoted && m.quoted.message && m.quoted.message.imageMessage) {
                buffer = await m.quoted.download();
            } else if (m.message && m.message.imageMessage) {
                buffer = await m.download();
            } else {
                await m.reply(`🤖 *AI Vision (Gemini 2.5 Flash)*\n\nCara penggunaan:\n1. Kirim gambar dengan caption *.vision [pertanyaan]*\n2. Reply gambar dengan *.vision [pertanyaan]*\n\nContoh:\n*.vision*\n*.vision apa yang ada di gambar ini?*`);
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

            // Prepare image for Gemini API
            const imagePart = {
                inlineData: {
                    data: buffer.toString('base64'),
                    mimeType: fileType.mime,
                },
            };

            // Call Gemini API
            const result = await model.generateContent([question, imagePart]);
            const response = await result.response;
            const text = response.text();

            // Format and send response
            await m.reply(text);

            // Add success reaction
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in AI Vision:', error);
            
            let errorMessage = '❌ Gagal menganalisis gambar!';
            
            if (error.message.includes('reply to an image') || error.message.includes('No image detected')) {
                errorMessage = '❌ Harap reply atau kirim gambar yang valid.';
            } else if (error.message.includes('File harus berupa gambar')) {
                errorMessage = '❌ File yang Anda kirim bukan format gambar yang didukung.';
            } else if (error.message.includes('API Key')) {
                errorMessage = `❌ ${error.message}`;
            } else {
                // General error from Gemini or elsewhere
                errorMessage += `\n\n*Penyebab:* ${error.message || 'Terjadi kesalahan tidak diketahui.'}`;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            await m.reply(errorMessage);
        }
    }
};

export default handler;