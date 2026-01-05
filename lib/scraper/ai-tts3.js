import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { execSync } from 'child_process';

// Template prompt yang bisa dikustomisasi
export const promptTemplates = {
    default: `Suara perempuan dewasa muda, gaya Onee-chan anime Jepang. Tone lembut, hangat, perhatian, sedikit menggoda tapi tetap sopan. Bicara secara pelan dan ramah, dengan intonasi khas karakter kakak yang sayang adiknya.`,
    
    narrator: `Kamu adalah narator profesional dengan suara yang tenang, jelas, dan menenangkan. Bacakan teks berikut seperti membaca audiobook.`,
    
    energetic: `Kamu adalah pembawa acara yang sangat bersemangat dan energik. Ucapkan teks dengan penuh antusiasme dan kegembiraan.`,
    
    calm: `Kamu adalah terapis yang berbicara dengan nada lembut, tenang, dan menenangkan. Ucapkan teks dengan tempo lambat dan santai.`,
    
    news: `Kamu adalah pembaca berita profesional. Bacakan teks dengan nada formal, jelas, dan netral seperti membacakan berita televisi.`,
    
    storyteller: `Kamu adalah pendongeng yang menarik. Bacakan teks dengan intonasi yang bervariasi, dramatis, dan memikat pendengar.`,
    
    teacher: `Kamu adalah guru yang sabar dan jelas dalam menjelaskan. Ucapkan teks dengan tempo sedang dan artikulasi yang baik.`,
    
    robot: `Kamu adalah robot AI dengan suara monoton dan mekanis. Ucapkan teks dengan nada datar dan konsisten.`,
    
    whisper: `Kamu berbisik dengan lembut dan pelan. Ucapkan teks dengan suara berbisik yang intim dan misterius.`,
    
    excited: `Kamu sangat excited dan tidak sabar! Ucapkan teks dengan penuh kegembiraan seperti baru menang lotre!`,
    
    oneesan: `Suara perempuan dewasa muda, gaya Onee-chan anime Jepang. Tone lembut, hangat, perhatian, sedikit menggoda tapi tetap sopan. Bicara secara pelan dan ramah, dengan intonasi khas karakter kakak yang sayang adiknya. Tambahkan sedikit ekspresi seperti 'ara ara~', 'nee~', 'yoshi yoshi~' atau desahan manja halus khas anime, tanpa berlebihan.`,
    
    tsundere: `Suara gadis tsundere anime. Kadang galak dan jutek, kadang malu-malu. Sering bilang "B-baka!" atau "I-ini bukan karena aku peduli!". Intonasi naik turun sesuai emosi.`,
    
    kawaii: `Suara gadis kawaii imut anime. Sangat ceria, manis, dan menggemaskan. Sering pakai kata-kata lucu dan nada tinggi yang imut.`
};

// Voice options yang tersedia
export const voiceOptions = ["Leda", "Zephyr", "Aoede", "Charon", "Fenrir", "Kore", "Puck", "Orus"];

export function getHelpText() {
    const templateList = Object.keys(promptTemplates).map(k => `• ${k}`).join("\n");
    const voiceList = voiceOptions.join(", ");
    
    return `🎙️ *TTS3 - Text to Speech Template*

*Format:*
.tts3 [style] [voice] <teks>

*Style tersedia:*
${templateList}

*Voice tersedia:*
${voiceList}

*Contoh:*
• .tts3 narrator Leda Selamat pagi semuanya
• .tts3 energetic Zephyr Woohooo kita menang!
• .tts3 oneesan Kore Ara ara adik-kun~
• .tts3 Halo tanpa style (pakai default)

*Custom Prompt:*
.tts3 custom|<prompt_kamu> <teks>

*Contoh custom:*
.tts3 custom|Kamu adalah bajak laut yang galak Ahoy kapten!`;
}

export function parseTextInput(text) {
    let style = "default";
    let voice = "Kore";
    let inputText = text;
    let customPrompt = null;

    // Check for custom prompt format: custom|<prompt> <text>
    if (text.startsWith("custom|")) {
        const afterCustom = text.slice(7);
        const firstSpace = afterCustom.indexOf(" ");
        if (firstSpace === -1) {
            throw new Error("Format custom salah!\n\nContoh: .tts3 custom|Kamu adalah robot Halo dunia");
        }
        customPrompt = afterCustom.slice(0, firstSpace);
        inputText = afterCustom.slice(firstSpace + 1).trim();
    } else {
        // Parse style and voice from args
        const parts = text.split(" ");
        
        if (parts.length >= 1 && promptTemplates[parts[0]]) {
            style = parts[0];
            parts.shift();
        }
        
        if (parts.length >= 1 && voiceOptions.includes(parts[0])) {
            voice = parts[0];
            parts.shift();
        }
        
        inputText = parts.join(" ");
    }

    if (!inputText.trim()) {
        throw new Error("Teks tidak boleh kosong!");
    }

    return { style, voice, inputText, customPrompt };
}

export async function generateTTS(text, apiKey, options = {}) {
    const { style = "default", voice = "Kore", customPrompt = null } = options;

    const ai = new GoogleGenAI({ apiKey });

    const voiceStyle = customPrompt || promptTemplates[style];

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
                    prebuiltVoiceConfig: {
                        voiceName: voice
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

    if (mimeType && !mimeType.includes('wav') && !mimeType.includes('mp3') && !mimeType.includes('mpeg')) {
        audioBuffer = convertToWav(audioBuffer, mimeType);
    }

    return audioBuffer;
}

export async function convertToMp3(audioBuffer, outputPath = null) {
    const wavFile = outputPath || path.join('temp', `tts3_${Date.now()}.wav`);
    const mp3File = wavFile.replace('.wav', '.mp3');
    
    await fs.promises.writeFile(wavFile, audioBuffer);
    execSync(`ffmpeg -y -i "${wavFile}" -codec:a libmp3lame -qscale:a 2 "${mp3File}"`);
    
    const mp3Buffer = fs.readFileSync(mp3File);
    
    fs.unlinkSync(wavFile);
    fs.unlinkSync(mp3File);
    
    return mp3Buffer;
}

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
