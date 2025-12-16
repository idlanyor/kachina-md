import { getHelpText, parseTextInput, generateTTS, convertToMp3 } from '../lib/scraper/ai-tts3.js';

export const handler = {
    command: ['tts3'],
    category: 'ai',
    help: 'AI Text-to-speech dengan template prompt yang bisa dikustomisasi',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ m, args, sock }) => {
        try {
            let text = args;
            if (!text && m.quoted) {
                text = m.quoted.text || m.quoted.message?.conversation || '';
            }
            if (!text) {
                await m.reply(getHelpText());
                return;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            let parsedInput;
            try {
                parsedInput = parseTextInput(text);
            } catch (error) {
                await sock.sendMessage(m.chat, {
                    react: { text: '❌', key: m.key }
                });
                return await m.reply(`❌ ${error.message}\n\n${getHelpText()}`);
            }

            const { style, voice, inputText, customPrompt } = parsedInput;

            const audioBuffer = await generateTTS(inputText, globalThis.apiKey.gemini, {
                style,
                voice,
                customPrompt
            });

            const mp3Buffer = await convertToMp3(audioBuffer);

            await sock.sendMessage(m.chat, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: 'Text to Speech by Gemini',
                        body: `${style.charAt(0).toUpperCase() + style.slice(1)} Voice - ${voice}`,
                        thumbnailUrl: 'https://files.catbox.moe/5lzdmq.png',
                        sourceUrl: 'https://ai.google.dev',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });
        } catch (error) {
            console.error('Error in TTS3:', error);
            let errorMessage = '❌ Gagal melakukan text-to-speech!';
            if (error.message?.includes('API key')) {
                errorMessage += '\n\n*Penyebab:* API key Gemini tidak valid atau tidak ditemukan.';
            } else if (error.message?.includes('network')) {
                errorMessage += '\n\n*Penyebab:* Masalah koneksi jaringan. Coba lagi nanti.';
            } else if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
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
