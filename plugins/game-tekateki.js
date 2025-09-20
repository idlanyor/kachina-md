import axios from "axios";

// Cooldown storage untuk mencegah spam
const gameCooldowns = new Map();
const GAME_COOLDOWN = 60000; // 1 menit cooldown per grup

export const handler = {
    command: ['tekateki'],
    category: 'game',
    help: 'Game Teka-teki - Asah otakmu dengan teka-teki seru!\n\nFormat: !tekateki\nContoh: !tekateki\n\nJawab dengan mengetik jawaban yang tepat!',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: true,
    exec: async ({ sock, m }) => {
        try {
            if (!m.isGroup) {
                return await m.reply('❌ Game ini hanya bisa dimainkan di grup!');
            }

            const chatId = m.chat;

            

            let id = m.chat;
            let winScore = 5000;

            // Check if there's already an active game
            if (global.tekatekiGame && global.tekatekiGame[id]) {
                return await m.reply('🎮 Masih ada sesi game yang belum diselesaikan!');
            }

            // Initialize global game object if not exists
            if (!global.tekatekiGame) {
                global.tekatekiGame = {};
            }


            
            // Fetch tekateki data from API
            let tekatekiData;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    const { data } = await axios.get('https://api.siputzx.my.id/api/games/tekateki', {
                        headers: {
                            'accept': '*/*',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        timeout: 10000 // 10 second timeout
                    });

                    // Check if API response is successful
                    if (data.status && data.data && data.data.soal && data.data.jawaban) {
                        tekatekiData = data.data;
                        break; // Success, exit retry loop
                    } else {
                        throw new Error('API response status is false or data is missing');
                    }
                } catch (error) {
                    retryCount++;
                    console.log(`Tekateki API attempt ${retryCount} failed:`, error.message);

                    if (retryCount >= maxRetries) {
                        console.error('All Tekateki API attempts failed:', error);
                        // Remove cooldown jika gagal
                        gameCooldowns.delete(chatId);
                        return await m.reply('❌ Gagal mengambil data teka-teki setelah beberapa percobaan. Jaringan tidak stabil atau server sedang bermasalah. Coba lagi nanti!');
                    }

                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }

            let gameText = `🧩 *TEKA-TEKI SERU* 🧩\n\n`;
            gameText += `❓ *Soal:*\n${tekatekiData.soal}\n\n`;
            gameText += `🎁 *Hadiah:* ${winScore.toLocaleString('id-ID')} money\n`;
            gameText += `⏰ *Waktu:* 60 detik\n\n`;
            gameText += `💬 Ketik jawabanmu langsung di chat!`;

            // Store game data
            global.tekatekiGame[id] = {
                id,
                soal: tekatekiData.soal,
                jawaban: Array.isArray(tekatekiData.jawaban) ? tekatekiData.jawaban : [tekatekiData.jawaban],
                winScore,
                startTime: Date.now()
            };
            
            console.log('Tekateki game started:', global.tekatekiGame[id]);
            await m.reply(gameText);

            // Set 60 second timer
            setTimeout(async () => {
                if (global.tekatekiGame && global.tekatekiGame[id]) {
                    let timeoutCaption = `⏰ *GAME TEKATEKI - WAKTU HABIS!*\n\n`;
                    timeoutCaption += `📝 *Soal:* ${tekatekiData.soal}\n`;
                    timeoutCaption += `✅ *Jawaban:* ${Array.isArray(tekatekiData.jawaban) ? tekatekiData.jawaban.join(' / ') : tekatekiData.jawaban}\n\n`;
                    timeoutCaption += `🎮 *Game berakhir karena waktu habis!*`;

                    await sock.sendMessage(id, {
                        text: timeoutCaption
                    }, {
                        quoted: m
                    });

                    delete global.tekatekiGame[id];
                }
            }, 60000); // 60 seconds

        } catch (error) {
            console.error('Error in tekateki game:', error);
            // Remove cooldown jika error
            gameCooldowns.delete(m.chat);
            await m.reply('❌ Terjadi kesalahan saat memulai game. Coba lagi!');
        }
    }
};

export default handler;