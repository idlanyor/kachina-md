import axios from "axios";
import User from '../database/models/User.js';

// Cooldown storage untuk mencegah spam
const gameCooldowns = new Map();
const GAME_COOLDOWN = 60000; // 1 menit cooldown per grup

export const handler = {
    command: ['tebakkata'],
    category: 'game',
    help:'Tebak Kata',
    desc: 'Game Tebak Kata - Tebak kata berdasarkan petunjuk yang diberikan!\n\nFormat: !tebakkata\nContoh: !tebakkata\n\nJawab dengan mengetik kata yang tepat!',
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
            if (global.tebakkataGame && global.tebakkataGame[id]) {
                return await m.reply(t('game.already_playing'));
            }

            // Initialize global game object if not exists
            if (!global.tebakkataGame) {
                global.tebakkataGame = {};
            }
            
            // Fetch tebakkata data from API
            let tebakkataData;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    const { data } = await axios.get('https://api.siputzx.my.id/api/games/tebakkata', {
                        headers: {
                            'accept': '*/*',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        timeout: 10000 // 10 second timeout
                    });

                    // Check if API response is successful
                    if (data.status && data.data && data.data.soal && data.data.jawaban) {
                        tebakkataData = data.data;
                        break; // Success, exit retry loop
                    } else {
                        throw new Error('API response status is false or data is missing');
                    }
                } catch (error) {
                    retryCount++;
                    console.log(`Tebakkata API attempt ${retryCount} failed:`, error.message);

                    if (retryCount >= maxRetries) {
                        console.error('All Tebakkata API attempts failed:', error);
                        // Remove cooldown jika gagal
                        gameCooldowns.delete(chatId);
                        return await m.reply('❌ Gagal mengambil data tebak kata setelah beberapa percobaan. Jaringan tidak stabil atau server sedang bermasalah. Coba lagi nanti!');
                    }

                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }

            let gameText = `🔤 *TEBAK KATA* 🔤\n\n`;
            gameText += `🎯 *Petunjuk:* ${tebakkataData.soal}\n\n`;
            gameText += `🎁 *Hadiah:* ${winScore.toLocaleString('id-ID')} money\n`;
            gameText += `⏰ *Waktu:* 60 detik\n\n`;
            gameText += `💬 Tebak kata berdasarkan petunjuk di atas!`;

            // Store game data
            global.tebakkataGame[id] = {
                id,
                soal: tebakkataData.soal,
                jawaban: tebakkataData.jawaban.toLowerCase(),
                winScore,
                startTime: Date.now(),
                messageId: null
            };
            
            console.log('Tebakkata game started:', global.tebakkataGame[id]);
            
            // Send game text
            const sentMsg = await sock.sendMessage(id, {
                text: gameText
            }, { quoted: m });
            
            // Simpan ID pesan untuk penghapusan nanti jika diperlukan
            if (sentMsg && sentMsg.key) {
                global.tebakkataGame[id].messageId = sentMsg.key;
            }

            // Set 60 second timer
            setTimeout(async () => {
                if (global.tebakkataGame && global.tebakkataGame[id]) {
                    // Get session data instead of using closure variables
                    const gameSession = global.tebakkataGame[id];
                    
                    let timeoutCaption = `⏰ *GAME TEBAK KATA - WAKTU HABIS!*\n\n`;
                    timeoutCaption += `🎯 *Petunjuk:* ${gameSession.soal}\n`;
                    timeoutCaption += `✅ *Jawaban:* ${gameSession.jawaban}\n\n`;
                    timeoutCaption += `🎮 *Game berakhir karena waktu habis!*`;

                    await sock.sendMessage(id, {
                        text: timeoutCaption
                    }, {
                        quoted: m
                    });

                    delete global.tebakkataGame[id];
                }
            }, 60000); // 60 seconds

        } catch (error) {
            console.error('Error in tebakkata game:', error);
            await m.reply('❌ Terjadi kesalahan saat memulai game. Silakan coba lagi nanti!');
        }
    }
};