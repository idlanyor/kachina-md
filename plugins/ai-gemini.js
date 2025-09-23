import { chatWithAI, analyzeMessage, getAllPluginCommands } from '../helper/gemini.js';
import User from '../database/models/User.js';

export const handler = {
    command: ['gemini'],
    category: 'ai',
    help: 'AI Gemini',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ m, args, sock }) => {
        try {
            // Get user and set localization
            const user = await User.getById(m.sender);
            const userLang = user.preferences?.language || 'id';
            globalThis.localization.setLocale(userLang);

            let question = args;

            // Jika tidak ada pertanyaan tapi ada reply
            if (!question && m.quoted) {
                question = m.quoted.text || m.quoted.message?.conversation || '';
            }

            // Validasi input
            if (!question) {
                const helpText = `🤖 *${t('ai.gemini_chat')}*\n\n` +
                    `${t('ai.usage')}:\n` +
                    `1. !gemini <${t('ai.question')}>\n` +
                    `2. ${t('ai.reply_message')} !gemini\n\n` +
                    `${t('common.example')}:\n` +
                    `!gemini ${t('ai.example_question_1')}\n` +
                    `!gemini ${t('ai.example_question_2')}\n` +
                    `!gemini ${t('ai.example_question_3')}\n\n` +
                    `💡 ${t('common.tips')}:\n` +
                    `• ${t('ai.tips_1')}\n` +
                    `• ${t('ai.tips_2')}\n` +
                    `• ${t('ai.tips_3')}`;

                await m.reply(helpText);
                return;
            }

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Ambil semua plugin commands untuk context
            const plugins = await getAllPluginCommands();

            // Proses dengan Gemini AI
            const aiResponse = await chatWithAI(question, plugins);

            // Format pesan hasil
            let message = `🤖 *GEMINI AI RESPONSE*\n\n`;
            message += `👤 *Pertanyaan:* ${question}\n\n`;
            message += `🤖 *Jawaban:*\n`;
            message += `${aiResponse}\n\n`;
            message += `⏰ *Dijawab pada:* ${new Date().toLocaleString('id-ID')}`;

            // Kirim hasil (split jika terlalu panjang)
            if (message.length > 4096) {
                // Split pesan jika terlalu panjang
                const headerMessage = `🤖 *GEMINI AI RESPONSE*\n\n` +
                    `👤 *Pertanyaan:* ${question}\n\n` +
                    `🤖 *Jawaban:*\n`;

                const responseMessage = `${aiResponse}`;

                await m.reply(headerMessage);
                await m.reply(responseMessage);
            } else {
                await m.reply(message);
            }

            // Tambahkan reaksi sukses
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in gemini command:', error);
            
            let errorMessage = '❌ Gagal mendapatkan respons dari Gemini AI!';
            
            if (error.message.includes('API key')) {
                errorMessage += '\n\n*Penyebab:* API key Gemini tidak valid atau tidak ditemukan.';
            } else if (error.message.includes('network')) {
                errorMessage += '\n\n*Penyebab:* Masalah koneksi jaringan. Coba lagi nanti.';
            } else if (error.message.includes('rate limit')) {
                errorMessage += '\n\n*Penyebab:* Terlalu banyak permintaan. Coba lagi dalam beberapa menit.';
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