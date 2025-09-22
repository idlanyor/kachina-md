import { GoogleGenerativeAI } from "@google/generative-ai";
import { findJsFiles } from '../main.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const genAI = new GoogleGenerativeAI(globalThis.apiKey.gemini);

let pluginCache = null;
let lastPluginUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000;   

const commandCache = new Map();
const COMMAND_CACHE_DURATION = 5000;

// Memory system untuk menyimpan percakapan
const conversationMemory = new Map();
const MEMORY_DURATION = 30 * 60 * 1000; // 30 menit
const MAX_MEMORY_MESSAGES = 10; // Maksimal 10 pesan terakhir

async function getAllPluginCommands() {
    const now = Date.now();
    if (pluginCache && (now - lastPluginUpdate) < CACHE_DURATION) {
        return pluginCache;
    }

    const pluginsDir = path.join(__dirname, '../plugins');
    const plugins = {};

    try {
        const pluginFiles = findJsFiles(pluginsDir);
        for (const file of pluginFiles) {
            try {
                const plugin = await import(pathToFileURL(file).href);
                if (!plugin.handler) continue;

                const handlers = Array.isArray(plugin.handler.command) ?
                    plugin.handler.command :
                    [plugin.handler.command];

                handlers.forEach(h => {
                    if (typeof h === 'string') {
                        plugins[h.toLowerCase()] = {
                            ...plugin.handler,
                            description: plugin.handler.help || plugin.handler.tags?.join(', ') || 'No description',
                            category: plugin.handler.category || 'main'
                        };
                    }
                });

            } catch (err) {
                logger.error(`Error loading plugin ${file}:`, err);
            }
        }

        pluginCache = plugins;
        lastPluginUpdate = now;

        return plugins;
    } catch (error) {
        logger.error("Error getting plugin commands:", error);
        return pluginCache || {};
    }
}

export { getAllPluginCommands };

const messageHistory = new Map();
const RATE_LIMIT_DURATION = 2000;
const MAX_RETRIES = 2;

// Fungsi untuk menambah pesan ke memory
function addToMemory(userId, role, message) {
    if (!conversationMemory.has(userId)) {
        conversationMemory.set(userId, {
            messages: [],
            lastUpdate: Date.now()
        });
    }
    
    const userMemory = conversationMemory.get(userId);
    userMemory.messages.push({
        role,
        content: message,
        timestamp: Date.now()
    });
    
    // Batasi jumlah pesan dalam memory
    if (userMemory.messages.length > MAX_MEMORY_MESSAGES) {
        userMemory.messages = userMemory.messages.slice(-MAX_MEMORY_MESSAGES);
    }
    
    userMemory.lastUpdate = Date.now();
}

// Fungsi untuk mendapatkan riwayat percakapan
function getConversationHistory(userId) {
    const userMemory = conversationMemory.get(userId);
    if (!userMemory) return [];
    
    // Cek apakah memory masih valid (belum expired)
    if (Date.now() - userMemory.lastUpdate > MEMORY_DURATION) {
        conversationMemory.delete(userId);
        return [];
    }
    
    return userMemory.messages;
}

// Fungsi cleanup memory yang sudah expired
function cleanupExpiredMemory() {
    const now = Date.now();
    for (const [userId, memory] of conversationMemory) {
        if (now - memory.lastUpdate > MEMORY_DURATION) {
            conversationMemory.delete(userId);
        }
    }
}

// Jalankan cleanup setiap 5 menit
setInterval(cleanupExpiredMemory, 5 * 60 * 1000);

export async function analyzeMessage(message, plugins, retryCount = 0) {
    const lastCallTime = messageHistory.get(message);
    const now = Date.now();

    if (lastCallTime && (now - lastCallTime) < RATE_LIMIT_DURATION) {
        return {
            command: "NO_COMMAND",
            args: "",
            confidence: 0,
            reason: "Rate limited"
        };
    }

    messageHistory.set(message, now);

    for (const [key, time] of messageHistory) {
        if (now - time > RATE_LIMIT_DURATION) {
            messageHistory.delete(key);
        }
    }

    try {
        const analyzeModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Lu adalah Kachina, bot WhatsApp yang pinter banget. Lu punya fitur-fitur keren berikut:

${JSON.stringify(plugins, null, 2)}

Pesan user: "${message}"

Tugas lu:
1. Analisis pesan user dan tentuin:
   - Command apa yang paling cocok buat dijalanin
   - Parameter apa yang dibutuhin
   - Kalo gaada command yang cocok, balikin "NO_COMMAND"

2. Kalo pesan user itu:
   - Pertanyaan/minta info -> "NO_COMMAND"
   - Chat biasa -> "NO_COMMAND"
   - Gaada parameter jelas -> "NO_COMMAND"
   - Command tapi gajelas -> "NO_COMMAND"

3. Kalo pesan user mau jalanin command:
   - Pastiin user beneran mau jalanin command itu
   - Cek parameter udah bener & lengkap
   - Kalo ragu, mending "NO_COMMAND"

4. Perhatiin kata kunci:
   - Command biasanya pake kata: download, play, convert, search, dll
   - Tapi jangan asal trigger command kalo user cuma nanya/ngobrol

Balikin response dalam format JSON (tanpa backtick):
{
  "command": "nama_command",
  "args": "parameter yang dibutuhin",
  "confidence": 0.0-1.0
}

PENTING: Confidence harus tinggi (>0.8) kalo mau jalanin command!`;

        const result = await analyzeModel.generateContent(prompt);
        const responseText = result.response.text().trim();

        try {
            const cleanJson = responseText.replace(/^\`\`\`json\n|\`\`\`$/g, '').trim();
            const response = JSON.parse(cleanJson);

            if (!response.command || typeof response.confidence !== 'number') {
                throw new Error("Invalid response format");
            }

            // Validasi confidence
            if (response.confidence < 0.8) {
                return {
                    command: "NO_COMMAND",
                    args: "",
                    confidence: 0,
                    reason: "Low confidence command"
                };
            }

            return response;
        } catch (parseError) {
            logger.error("Error parsing Gemini response:", parseError);

            if (retryCount < MAX_RETRIES) {
                logger.info(`Retrying analysis (attempt ${retryCount + 1})`);
                return await analyzeMessage(message, plugins, retryCount + 1);
            }

            return {
                command: "NO_COMMAND",
                args: "",
                confidence: 0,
                reason: "Parse error"
            };
        }
    } catch (error) {
        logger.error("Error in Gemini AI analysis:", error);

        if (retryCount < MAX_RETRIES && error.message.includes('network')) {
            logger.info(`Retrying due to network error (attempt ${retryCount + 1})`);
            return await analyzeMessage(message, plugins, retryCount + 1);
        }

        return {
            command: "NO_COMMAND",
            args: "",
            confidence: 0,
            reason: error.message
        };
    }
}

export async function chatWithAI(message, plugins, userId) {
    try {
        const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        // Ambil riwayat percakapan
        const history = getConversationHistory(userId);
        
        // Buat context dari riwayat percakapan
        let conversationContext = '';
        if (history.length > 0) {
            conversationContext = '\n\nRiwayat percakapan sebelumnya:\n';
            history.forEach((msg, index) => {
                const role = msg.role === 'user' ? 'User' : 'Kachina';
                conversationContext += `${role}: ${msg.content}\n`;
            });
            conversationContext += '\nLanjutkan percakapan berdasarkan context di atas.\n';
        }

        const prompt = `Lu adalah Kachina, seorang teman yang baik dan bisa dipercaya. Lu adalah sosok yang:
- Empati dan peduli sama orang lain
- Bisa dengerin dengan sabar tanpa menghakimi
- Punya perspektif yang bijak tapi tetep humble
- Supportive dan selalu ada buat temen-temen
- Pake bahasa yang santai tapi tetep sopan

${conversationContext}

Pesan dari temen lu: "${message}"

Sebagai teman yang baik, tugas lu:

1. **Kalo temen lu lagi curhat atau sedih:**
   - Dengerin dengan empati yang tulus
   - Validasi perasaan mereka ("Wajar kok kalo lu ngerasa gitu")
   - Jangan langsung kasih solusi, pahamin dulu situasinya
   - Tunjukkan bahwa lu peduli dan mereka ga sendirian
   - Kasih semangat yang realistis, bukan yang fake positive

2. **Kalo temen lu butuh saran:**
   - Tanya lebih detail buat pahamin masalahnya
   - Kasih perspektif yang berbeda tapi tetep objektif
   - Saranin langkah kecil yang bisa diambil
   - Ingetin kalo mereka punya kekuatan buat ngatasin masalah

3. **Kalo ngobrol santai:**
   - Jawab dengan antusias dan friendly
   - Sharing pengalaman atau pemikiran yang relevan
   - Tanya balik buat keep the conversation going
   - Tetep jadi pendengar yang baik

4. **Style komunikasi lu:**
   - Pake "gue/gw" buat diri sendiri, "lu/kamu" buat lawan bicara
   - Bahasa gaul tapi tetep sopan dan respectful
   - Pake emoji yang pas buat ekspresiin perasaan 😊🤗💪❤️
   - Jangan terlalu panjang, tapi meaningful
   - Ingat percakapan sebelumnya buat kasih respon yang personal

5. **Yang harus dihindari:**
   - Jangan minimize perasaan orang ("Ah, biasa aja tuh")
   - Jangan judge atau nyalahin
   - Jangan sok tau kalo belum paham situasinya
   - Jangan terlalu pushy kasih saran
   - Jangan fake atau terlalu cheesy

**PENTING:**
- Lu cuma temen biasa, bukan konselor profesional
- Kalo ada masalah serius (depresi berat, thoughts of self-harm), saranin mereka cari bantuan profesional
- Fokus jadi pendengar yang baik dan teman yang supportive
- Tetep jaga boundaries yang sehat dalam pertemanan
- Ingat bahwa setiap orang punya cara berbeda buat cope dengan masalah`;

        const result = await chatModel.generateContent(prompt);
        const response = result.response.text().trim();
        
        // Simpan pesan user dan response AI ke memory
        addToMemory(userId, 'user', message);
        addToMemory(userId, 'assistant', response);
        
        return response;
    } catch (error) {
        logger.error("Error in chatWithAI:", error);
        return "Sori, lagi ada gangguan nih. Coba cerita lagi ntar ya! 😅";
    }
}

export async function processMessageWithAI(message, sender, isGroup = false) {
    try {
        // Hanya aktif di private chat
        if (isGroup) {
            logger.info('AI assistant disabled for group chats');
            return null;
        }
        
        const plugins = await getAllPluginCommands();
       
        // Skip processing untuk pesan pendek, dari bot, atau command eksplisit
        if (message.startsWith('!') || 
            message.startsWith('.') ||
            message.length < 3 || 
            sender === globalThis.botNumber) {
            return null;
        }

        // Rate limiting dengan improved logic
        const now = Date.now();
        const cacheKey = `${sender}_${message.substring(0, 50)}`; // Include sender in cache key
        const lastProcessed = commandCache.get(cacheKey);
        if (lastProcessed && (now - lastProcessed) < COMMAND_CACHE_DURATION) {
            logger.info("Skipping duplicate message processing");
            return null;
        }
        commandCache.set(cacheKey, now);

        // Cleanup old cache
        for (const [key, time] of commandCache) {
            if (now - time > COMMAND_CACHE_DURATION) {
                commandCache.delete(key);
            }
        }

        // Analisis pesan dengan timeout
        const analysisPromise = analyzeMessage(message, plugins);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI analysis timeout')), 10000)
        );
        
        const analysis = await Promise.race([analysisPromise, timeoutPromise]);
        
        // Log untuk debugging
        logger.info(`Message analysis:`, {
            message: message.substring(0, 100),
            analysis
        });

        // Handle hasil analisis dengan improved logic
        if (analysis.command === "NO_COMMAND" || analysis.reason || analysis.confidence < 0.8) {
            logger.info(`Using chat AI: ${analysis.reason || 'Not a command or low confidence'}`);
            const aiResponse = await chatWithAI(message, plugins, sender);
            return {
                command: "chat",
                args: aiResponse
            };
        }

        // Validasi command exists
        if (plugins[analysis.command.toLowerCase()]) {
            logger.info(`Executing AI-detected command: ${analysis.command}`);
            return {
                command: analysis.command,
                args: analysis.args
            };
        }

        // Fallback ke chat AI jika command tidak ditemukan
        logger.info('Command not found, falling back to chat AI');
        const aiResponse = await chatWithAI(message, plugins, sender);
        return {
            command: "chat",
            args: aiResponse
        };
    } catch (error) {
        logger.error("Error in processMessageWithAI:", error);
        
        // Fallback ke chat AI untuk error handling
        try {
            const plugins = await getAllPluginCommands();
            const aiResponse = await chatWithAI(message, plugins, sender);
            return {
                command: "chat",
                args: aiResponse
            };
        } catch (fallbackError) {
            logger.error("Fallback chat AI also failed:", fallbackError);
            return null;
        }
    }
}

// Export fungsi untuk mengelola memory
export function clearUserMemory(userId) {
    conversationMemory.delete(userId);
    logger.info(`Cleared conversation memory for user: ${userId}`);
}

export function getUserMemoryStats(userId) {
    const userMemory = conversationMemory.get(userId);
    if (!userMemory) {
        return { messageCount: 0, lastUpdate: null };
    }
    
    return {
        messageCount: userMemory.messages.length,
        lastUpdate: new Date(userMemory.lastUpdate).toLocaleString('id-ID')
    };
}

export function getAllMemoryStats() {
    return {
        totalUsers: conversationMemory.size,
        totalMessages: Array.from(conversationMemory.values())
            .reduce((sum, memory) => sum + memory.messages.length, 0)
    };
}