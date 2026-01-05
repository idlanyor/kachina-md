import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { execSync } from 'child_process';

export const handler = {
    command: ['tts'],
    category: 'ai',
    help: 'AI Text-to-speech menggunakan Gemini TTS',
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
                await m.reply(`🔊 *TEXT TO SPEECH (TTS)*\n\nCara penggunaan:\n1. !tts <teks>\n2. Reply pesan dengan !tts\n\nContoh:\n!tts Selamat pagi, ini suara dari AI\n!tts Halo, apa kabar?`);
                return;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            const ai = new GoogleGenAI({
                apiKey: globalThis.apiKey.gemini,
            });

            const voiceStyle = `Suara perempuan dewasa muda, gaya Onee-chan anime Jepang. Tone lembut, hangat, perhatian, sedikit menggoda tapi tetap sopan. Bicara secara pelan dan ramah, dengan intonasi khas karakter kakak yang sayang adiknya. Tambahkan sedikit ekspresi seperti 'ara ara~', 'nee~', 'yoshi yoshi~' atau desahan manja halus khas anime, tanpa berlebihan. Suara harus terdengar halus, empuk, dan penuh kasih sayang seperti kakak yang lagi ngomong ke adiknya.`;


            const model = 'gemini-2.5-pro-preview-tts';
            const contents = [
                {
                    role: 'user',
                    parts: [{ text: `${voiceStyle}\n ${text}` }],
                },
            ];

            const response = await ai.models.generateContentStream({
                model,
                config: {
                    temperature: 1,
                    responseModalities: ['audio'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig:{
                                voiceName:'Kore'
                            }
                        }
                    },
                },
                contents,
            });

            const audioChunks = [];
            let mimeType = '';

            for await (const chunk of response) {
                if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
                    continue;
                }
                if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
                    const inlineData = chunk.candidates[0].content.parts[0].inlineData;
                    mimeType = inlineData.mimeType || '';
                    const buffer = Buffer.from(inlineData.data || '', 'base64');
                    audioChunks.push(buffer);
                }
            }

            if (audioChunks.length === 0) {
                throw new Error('Tidak ada audio yang dihasilkan');
            }

            let audioBuffer = Buffer.concat(audioChunks);

            // Convert raw audio to WAV if needed
            if (mimeType && !mimeType.includes('wav') && !mimeType.includes('mp3') && !mimeType.includes('mpeg')) {
                audioBuffer = convertToWav(audioBuffer, mimeType);
            }

            const wavFile = path.join('temp', `tts_${Date.now()}.wav`);
            const mp3File = wavFile.replace('.wav', '.mp3');
            await fs.promises.writeFile(wavFile, audioBuffer);

            // Convert ke mp3 pakai ffmpeg
            execSync(`ffmpeg -y -i "${wavFile}" -codec:a libmp3lame -qscale:a 2 "${mp3File}"`);

            await sock.sendMessage(m.chat, {
                audio: fs.readFileSync(mp3File),
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: 'Text to Speech by Gemini',
                        body: 'Kore Voice (TTS)',
                        thumbnailUrl: 'https://files.catbox.moe/5lzdmq.png',
                        sourceUrl: 'https://ai.google.dev',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

            fs.unlinkSync(wavFile);
            fs.unlinkSync(mp3File);

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });
        } catch (error) {
            console.error('Error in TTS:', error);
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

function parseMimeType(mimeType) {
    const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
    const [_, format] = fileType.split('/');

    const options = {
        numChannels: 1,
        sampleRate: 24000,
        bitsPerSample: 16,
    };

    if (format && format.startsWith('L')) {
        const bits = parseInt(format.slice(1), 10);
        if (!isNaN(bits)) {
            options.bitsPerSample = bits;
        }
    }

    for (const param of params) {
        const [key, value] = param.split('=').map(s => s.trim());
        if (key === 'rate') {
            options.sampleRate = parseInt(value, 10);
        }
    }

    return options;
}

function createWavHeader(dataLength, options) {
    const { numChannels, sampleRate, bitsPerSample } = options;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const buffer = Buffer.alloc(44);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);

    return buffer;
}

function convertToWav(rawBuffer, mimeType) {
    const options = parseMimeType(mimeType);
    const wavHeader = createWavHeader(rawBuffer.length, options);
    return Buffer.concat([wavHeader, rawBuffer]);
}

export default handler;
