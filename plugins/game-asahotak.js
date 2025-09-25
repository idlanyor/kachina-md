import axios from "axios";
import User from '../database/models/User.js';

// Cooldown storage untuk mencegah spam
const gameCooldowns = new Map();
const GAME_COOLDOWN = 60000; // 1 menit cooldown per grup

export const handler = {
    command: ['asahotak'],
    category: 'game',
    help: 'Asah Otak',
    desc: 'Game Asah Otak - Asah otakmu dengan pertanyaan seru!\n\nFormat: !asahotak\nContoh: !asahotak\n\nJawab dengan mengetik jawaban yang tepat!',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: true,
    exec: async ({ sock, m }) => {
        try {
            // Get user and set localization
            const user = await User.getById(m.sender);
            const userLang = user.preferences?.language || 'id';
            globalThis.localization.setLocale(userLang);

            if (!m.isGroup) {
                return await m.reply(t('commands.group_only'));
            }

            const chatId = m.chat;
            let id = m.chat;
            let winScore = 5000;

            // Check if there's already an active game
            if (global.asahOtakGame && global.asahOtakGame[id]) {
                return await m.reply(t('game.already_playing'));
            }

            // Initialize global game object if not exists
            if (!global.asahOtakGame) {
                global.asahOtakGame = {};
            }
            
            // Fetch asahotak data from API
            let asahOtakData;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    const { data } = await axios.get('https://api.siputzx.my.id/api/games/asahotak', {
                        headers: {
                            'accept': '*/*',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        timeout: 10000 // 10 second timeout
                    });

                    // Check if API response is successful
                    if (data.status && data.data && data.data.soal && data.data.jawaban) {
                        asahOtakData = data.data;
                        break; // Success, exit retry loop
                    } else {
                        throw new Error('API response status is false or data is missing');
                    }
                } catch (error) {
                    retryCount++;
                    console.log(`AsahOtak API attempt ${retryCount} failed:`, error.message);

                    if (retryCount >= maxRetries) {
                        console.error('All AsahOtak API attempts failed:', error);
                        // Remove cooldown jika gagal
                        gameCooldowns.delete(chatId);
                        return await m.reply('❌ Gagal mengambil data asah otak setelah beberapa percobaan. Jaringan tidak stabil atau server sedang bermasalah. Coba lagi nanti!');
                    }

                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }

            let gameText = `🧠 *ASAH OTAK* 🧠\n\n`;
            gameText += `❓ *Soal:*\n${asahOtakData.soal}\n\n`;
            gameText += `🎁 *Hadiah:* ${winScore.toLocaleString('id-ID')} money\n`;
            gameText += `⏰ *Waktu:* 60 detik\n\n`;
            gameText += `💬 Ketik jawabanmu langsung di chat!`;

            // Store game data
            global.asahOtakGame[id] = {
                id,
                soal: asahOtakData.soal,
                jawaban: Array.isArray(asahOtakData.jawaban) ? asahOtakData.jawaban : [asahOtakData.jawaban],
                winScore,
                startTime: Date.now()
            };
            
            console.log('AsahOtak game started:', global.asahOtakGame[id]);
            await m.reply(gameText);

            // Set 60 second timer
            setTimeout(async () => {
                if (global.asahOtakGame && global.asahOtakGame[id]) {
                    // Get session data instead of using closure variables
                    const gameSession = global.asahOtakGame[id];
                    
                    let timeoutCaption = `⏰ *GAME ASAH OTAK - WAKTU HABIS!*\n\n`;
                    timeoutCaption += `📝 *Soal:* ${gameSession.soal}\n`;
                    timeoutCaption += `✅ *Jawaban:* ${Array.isArray(gameSession.jawaban) ? gameSession.jawaban.join(' / ') : gameSession.jawaban}\n\n`;
                    timeoutCaption += `🎮 *Game berakhir karena waktu habis!*`;

                    await sock.sendMessage(id, {
                        text: timeoutCaption
                    }, {
                        quoted: m
                    });

                    delete global.asahOtakGame[id];
                }
            }, 60000); // 60 seconds

        } catch (error) {
            console.error('Error in asahotak game:', error);
            // Remove cooldown jika error
            gameCooldowns.delete(m.chat);
            await m.reply('❌ Terjadi kesalahan saat memulai game. Coba lagi!');
        }
    }
};

export default handler;