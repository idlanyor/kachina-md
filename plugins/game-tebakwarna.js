import axios from "axios";
import User from '../database/models/User.js';

// Cooldown storage untuk mencegah spam
const gameCooldowns = new Map();
const GAME_COOLDOWN = 60000; // 1 menit cooldown per grup

export const handler = {
    command: ['tebakwarna'],
    category: 'game',
    help: 'Game Tebak Warna',
    desc: 'Game Tebak Warna - Tebak warna dari gambar!\n\nFormat: !tebakwarna\nContoh: !tebakwarna\n\nJawab dengan mengetik warna yang tepat!',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: true,
    exec: async ({ sock, m }) => {
        try {
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
            if (global.tebakWarnaGame && global.tebakWarnaGame[id]) {
                return await m.reply(t('game.already_playing'));
            }

            // Initialize global game object if not exists
            if (!global.tebakWarnaGame) {
                global.tebakWarnaGame = {};
            }
            
            // Fetch tebakwarna data from API
            let tebakWarnaData;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    const { data } = await axios.get('https://api.siputzx.my.id/api/games/tebakwarna', {
                        headers: {
                            'accept': '*/*',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        timeout: 10000 // 10 second timeout
                    });

                    // Check if API response is successful
                    if (data.status && data.data && data.data.plate && data.data.correct && data.data.image) {
                        tebakWarnaData = data.data;
                        break; // Success, exit retry loop
                    } else {
                        throw new Error('API response status is false or data is missing');
                    }
                } catch (error) {
                    retryCount++;
                    console.log(`TebakWarna API attempt ${retryCount} failed:`, error.message);

                    if (retryCount >= maxRetries) {
                        console.error('All TebakWarna API attempts failed:', error);
                        // Remove cooldown jika gagal
                        gameCooldowns.delete(chatId);
                        return await m.reply('❌ Gagal mengambil data tebak warna setelah beberapa percobaan. Jaringan tidak stabil atau server sedang bermasalah. Coba lagi nanti!');
                    }

                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }

            let gameText = `🎨 *TEBAK WARNA* 🎨\n\n`;
            gameText += `🔍 *Petunjuk:* Lihat gambar dan sebutkan angka yang kamu lihat\n`;
            gameText += `🎁 *Hadiah:* ${winScore.toLocaleString('id-ID')} money\n`;
            gameText += `⏰ *Waktu:* 60 detik\n\n`;
            gameText += `💬 Ketik jawabanmu langsung di chat!`;

            // Store game data
            global.tebakWarnaGame[id] = {
                id,
                plate: tebakWarnaData.plate,
                jawaban: tebakWarnaData.correct,
                winScore,
                startTime: Date.now()
            };
            
            console.log('TebakWarna game started:', global.tebakWarnaGame[id]);
            
            // Send image and game text
            const sentMsg = await sock.sendMessage(id, {
                image: { url: tebakWarnaData.image },
                caption: gameText
            }, { quoted: m });
            
            // Simpan ID pesan untuk penghapusan nanti
            if (sentMsg && sentMsg.key) {
                global.tebakWarnaGame[id].messageId = sentMsg.key;
            }

            // Set 60 second timer
            setTimeout(async () => {
                if (global.tebakWarnaGame && global.tebakWarnaGame[id]) {
                    let timeoutCaption = `⏰ *GAME TEBAK WARNA - WAKTU HABIS!*\n\n`;
                    timeoutCaption += `📝 *Plate:* ${tebakWarnaData.plate}\n`;
                    timeoutCaption += `✅ *Jawaban:* ${tebakWarnaData.correct}\n\n`;
                    timeoutCaption += `🎮 *Game berakhir karena waktu habis!*`;

                    // Hapus pesan gambar sebelumnya
                    if (global.tebakWarnaGame[id].messageId) {
                        try {
                            await sock.sendMessage(id, { 
                                delete: global.tebakWarnaGame[id].messageId 
                            });
                        } catch (error) {
                            console.error('Error deleting image message:', error);
                        }
                    }

                    await sock.sendMessage(id, {
                        text: timeoutCaption
                    }, {
                        quoted: m
                    });

                    delete global.tebakWarnaGame[id];
                }
            }, 60000); // 60 seconds

        } catch (error) {
            console.error('Error in tebakwarna game:', error);
            // Remove cooldown jika error
            gameCooldowns.delete(m.chat);
            await m.reply('❌ Terjadi kesalahan saat memulai game. Coba lagi!');
        }
    }
};

export default handler;