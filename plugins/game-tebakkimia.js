import axios from "axios";
import User from '../database/models/User.js';

// Cooldown storage untuk mencegah spam
const gameCooldowns = new Map();
const GAME_COOLDOWN = 60000; // 1 menit cooldown per grup

export const handler = {
    command: ['tebakkimia'],
    category: 'game',
    help: 'Tebak Kimia',
    desc: 'Game Tebak Kimia - Tebak lambang unsur kimia berdasarkan nama unsur!\n\nFormat: !tebakkimia\nContoh: !tebakkimia\n\nJawab dengan mengetik lambang unsur yang tepat!',
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
            if (global.tebakkimiaGame && global.tebakkimiaGame[id]) {
                return await m.reply(t('game.already_playing'));
            }

            // Initialize global game object if not exists
            if (!global.tebakkimiaGame) {
                global.tebakkimiaGame = {};
            }
            
            // Fetch tebakkimia data from API
            let tebakkimiaData;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    const { data } = await axios.get('https://api.siputzx.my.id/api/games/tebakkimia', {
                        headers: {
                            'accept': '*/*',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        timeout: 10000 // 10 second timeout
                    });

                    // Check if API response is successful
                    if (data.status && data.data && data.data.unsur && data.data.lambang) {
                        tebakkimiaData = data.data;
                        break; // Success, exit retry loop
                    } else {
                        throw new Error('API response status is false or data is missing');
                    }
                } catch (error) {
                    retryCount++;
                    console.log(`Tebakkimia API attempt ${retryCount} failed:`, error.message);

                    if (retryCount >= maxRetries) {
                        console.error('All Tebakkimia API attempts failed:', error);
                        // Remove cooldown jika gagal
                        gameCooldowns.delete(chatId);
                        return await m.reply('❌ Gagal mengambil data tebak kimia setelah beberapa percobaan. Jaringan tidak stabil atau server sedang bermasalah. Coba lagi nanti!');
                    }

                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }

            let gameText = `🧪 *TEBAK KIMIA* 🧪\n\n`;
            gameText += `⚗️ *Unsur:* ${tebakkimiaData.unsur}\n\n`;
            gameText += `🎁 *Hadiah:* ${winScore.toLocaleString('id-ID')} money\n`;
            gameText += `⏰ *Waktu:* 60 detik\n\n`;
            gameText += `💬 Tebak lambang unsur kimia dari nama unsur di atas!`;

            // Store game data
            global.tebakkimiaGame[id] = {
                id,
                unsur: tebakkimiaData.unsur,
                jawaban: tebakkimiaData.lambang.toLowerCase(),
                winScore,
                startTime: Date.now(),
                messageId: null
            };
            
            console.log('Tebakkimia game started:', global.tebakkimiaGame[id]);
            
            // Send game text
            const sentMsg = await sock.sendMessage(id, {
                text: gameText
            }, { quoted: m });
            
            // Simpan ID pesan untuk penghapusan nanti jika diperlukan
            if (sentMsg && sentMsg.key) {
                global.tebakkimiaGame[id].messageId = sentMsg.key;
            }

            // Set 60 second timer
            setTimeout(async () => {
                if (global.tebakkimiaGame && global.tebakkimiaGame[id]) {
                    // Get session data instead of using closure variables
                    const gameSession = global.tebakkimiaGame[id];
                    
                    let timeoutCaption = `⏰ *GAME TEBAK KIMIA - WAKTU HABIS!*\n\n`;
                    timeoutCaption += `⚗️ *Unsur:* ${gameSession.unsur}\n`;
                    timeoutCaption += `✅ *Lambang:* ${gameSession.jawaban.toUpperCase()}\n\n`;
                    timeoutCaption += `🎮 *Game berakhir karena waktu habis!*`;

                    await sock.sendMessage(id, {
                        text: timeoutCaption
                    }, {
                        quoted: m
                    });

                    delete global.tebakkimiaGame[id];
                }
            }, 90000); // 90 seconds

        } catch (error) {
            console.error('Error in tebakkimia game:', error);
            await m.reply('❌ Terjadi kesalahan saat memulai game. Silakan coba lagi nanti!');
        }
    }
};