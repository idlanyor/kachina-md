import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";

const api_url = "https://firebasevertexai.googleapis.com/v1beta";
const model_url =
    "projects/gemmy-ai-bdc03/locations/us-central1/publishers/google/models";
const headers = {
    "content-type": "application/json",
    "x-goog-api-client": "gl-kotlin/2.1.0-ai fire/16.5.0",
    "x-goog-api-key": `${globalThis.apiKey.gemini}`
};

// Template prompt yang bisa dikustomisasi
const promptTemplates = {
    default: `Kamu adalah asisten AI yang berbicara dengan nada ramah dan natural. Ucapkan teks berikut dengan jelas dan ekspresif.`,
    
    narrator: `Kamu adalah narator profesional dengan suara yang tenang, jelas, dan menenangkan. Bacakan teks berikut seperti membaca audiobook.`,
    
    energetic: `Kamu adalah pembawa acara yang sangat bersemangat dan energik. Ucapkan teks dengan penuh antusiasme dan kegembiraan.`,
    
    calm: `Kamu adalah terapis yang berbicara dengan nada lembut, tenang, dan menenangkan. Ucapkan teks dengan tempo lambat dan santai.`,
    
    news: `Kamu adalah pembaca berita profesional. Bacakan teks dengan nada formal, jelas, dan netral seperti membacakan berita televisi.`,
    
    storyteller: `Kamu adalah pendongeng yang menarik. Bacakan teks dengan intonasi yang bervariasi, dramatis, dan memikat pendengar.`,
    
    teacher: `Kamu adalah guru yang sabar dan jelas dalam menjelaskan. Ucapkan teks dengan tempo sedang dan artikulasi yang baik.`,
    
    robot: `Kamu adalah robot AI dengan suara monoton dan mekanis. Ucapkan teks dengan nada datar dan konsisten.`,
    
    whisper: `Kamu berbisik dengan lembut dan pelan. Ucapkan teks dengan suara berbisik yang intim dan misterius.`,
    
    excited: `Kamu sangat excited dan tidak sabar! Ucapkan teks dengan penuh kegembiraan seperti baru menang lotre!`
};

// Voice options yang tersedia
const voiceOptions = ["Leda", "Zephyr", "Aoede", "Charon", "Fenrir", "Kore", "Puck", "Orus"];

async function tts(
    text,
    { 
        model = "gemini-2.5-flash-preview-tts", 
        delay = 1000,
        prompt = promptTemplates.default,
        voice = "Leda"
    } = {}
) {
    if (!text) throw new Error("Text is required");

    const systemPrompt = `[${JSON.stringify({
        voice_style: "custom",
        description: prompt
    })}]: `;

    const body = {
        contents: [
            {
                role: "model",
                parts: [
                    {
                        text: systemPrompt + text
                    }
                ]
            },
            {
                role: "user",
                parts: [
                    {
                        text: systemPrompt + text
                    }
                ]
            }
        ],
        generationConfig: {
            responseModalities: ["audio"],
            temperature: 1,
            speech_config: {
                voice_config: {
                    prebuilt_voice_config: {
                        voice_name: voice
                    }
                }
            }
        }
    };

    let attempt = 1;

    while (true) {
        try {
            console.log(`TTS attempt ${attempt}...`);

            const response = await axios.post(
                `${api_url}/${model_url}/${model}:generateContent`,
                body,
                { headers }
            );

            if (!response.data?.candidates || !response.data.candidates[0]) {
                throw new Error("No candidates in response");
            }

            if (!response.data.candidates[0]?.content?.parts) {
                throw new Error("No content parts in response");
            }

            const allParts = response.data.candidates[0].content.parts;
            const audioDataParts = allParts.filter(part => part.inlineData);

            if (audioDataParts.length === 0) {
                throw new Error("No audio data found in response");
            }

            const combinedAudioData = audioDataParts
                .map(part => part.inlineData.data)
                .join("");

            const oggBuffer = await convertPCMToOggOpus(combinedAudioData);

            console.log(`TTS berhasil pada attempt ${attempt}`);
            return oggBuffer;
        } catch (e) {
            console.error(`TTS attempt ${attempt} gagal:`, e.message || e);

            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));

            delay = Math.min(delay * 1.2, 60000);
            attempt++;
        }
    }
}

async function convertPCMToOggOpus(base64Data) {
    return new Promise((resolve, reject) => {
        const pcmBuffer = Buffer.from(base64Data, "base64");
        const inputStream = new PassThrough();
        const outputChunks = [];

        inputStream.end(pcmBuffer);

        const outputStream = new PassThrough();

        outputStream.on("data", chunk => {
            outputChunks.push(chunk);
        });

        outputStream.on("end", () => {
            resolve(Buffer.concat(outputChunks));
        });

        outputStream.on("error", reject);

        ffmpeg(inputStream)
            .inputOptions(["-f", "s16le", "-ar", "24000", "-ac", "1"])
            .toFormat("ogg")
            .audioCodec("libopus")
            .audioBitrate(64)
            .audioFrequency(24000)
            .audioChannels(1)
            .outputOptions(["-compression_level", "10"])
            .on("error", error => {
                console.error("FFmpeg error:", error);
                reject(error);
            })
            .on("end", () => {
                console.log("Conversion to OGG Opus completed");
            })
            .pipe(outputStream);
    });
}

function getHelpText() {
    const templateList = Object.keys(promptTemplates).map(k => `• ${k}`).join("\n");
    const voiceList = voiceOptions.join(", ");
    
    return `🎙️ *TTS Template*

*Format:*
.ttstemplate [style] [voice] <teks>

*Style tersedia:*
${templateList}

*Voice tersedia:*
${voiceList}

*Contoh:*
• .ttstemplate narrator Leda Selamat pagi semuanya
• .ttstemplate energetic Zephyr Woohooo kita menang!
• .ttstemplate calm Kore Tarik napas dalam-dalam

*Custom Prompt:*
.ttstemplate custom|<prompt_kamu> <teks>

*Contoh custom:*
.ttstemplate custom|Kamu adalah bajak laut yang galak Ahoy kapten!`;
}

export default {
    rules: {
        owner: false,
        group: false,
        private: false,
        admin: false
    },

    async execute({ sock, m, args, text }) {
        if (!text) {
            return await m.reply(getHelpText());
        }

        let style = "default";
        let voice = "Leda";
        let inputText = text;
        let customPrompt = null;

        // Check for custom prompt format: custom|<prompt> <text>
        if (text.startsWith("custom|")) {
            const afterCustom = text.slice(7);
            const firstSpace = afterCustom.indexOf(" ");
            if (firstSpace === -1) {
                return await m.reply("❌ Format custom salah!\n\nContoh: .ttstemplate custom|Kamu adalah robot Halo dunia");
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
            return await m.reply("❌ Teks tidak boleh kosong!\n\n" + getHelpText());
        }

        await m.react("⌛");

        try {
            const prompt = customPrompt || promptTemplates[style];
            
            const audioBuffer = await tts(inputText, {
                model: "gemini-2.5-pro-preview-tts",
                delay: 2000,
                prompt: prompt,
                voice: voice
            });

            await sock.sendMessage(
                m.chat,
                {
                    audio: audioBuffer,
                    mimetype: "audio/ogg; codecs=opus",
                    ptt: true
                },
                { quoted: m }
            );

            await m.react("✅");
        } catch (error) {
            console.error("TTS Error:", error);
            await m.react("❌");
            await m.reply(`❌ Gagal convert text to speech: ${error.message}`);
        }
    }
};
