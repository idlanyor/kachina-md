import Database from '../helper/database.js';
import axios from 'axios';

export const handler = {
    command: ['caklontong'],
    category: 'game',
    help: 'Game tebak cak lontong',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: true,
    exec: async ({ sock, m }) => {
        try {
            if (!m.isGroup) {
                return await m.reply('❌ Game ini hanya bisa dimainkan di grup!');
            }

            let winScore = 5000;
            let id = m.chat;
            
            // Check if there's already an active game
            if (global.caklontongGame && global.caklontongGame[id]) {
                return await m.reply('🎮 Masih ada sesi game yang belum diselesaikan!');
            }

            // Initialize global game object if not exists
            if (!global.caklontongGame) {
                global.caklontongGame = {};
            }

            try {
                // Fetch questions from API
                const response = await axios.get('https://raw.githubusercontent.com/BochilTeam/database/master/games/caklontong.json');
                const questions = response.data;
                
                // Pick random question
                let randomQuestion = questions[Math.floor(Math.random() * questions.length)];
                
                let gameText = `🧩 *GAME CAK LONTONG* 🧩\n\n`;
                gameText += `❓ *Pertanyaan:*\n${randomQuestion.soal}\n\n`;
                gameText += `🎁 *Hadiah:* ${winScore.toLocaleString('id-ID')} money\n`;
                gameText += `⏰ *Waktu:* 60 detik\n\n`;
                gameText += `💬 Ketik jawaban langsung di chat!`;

                // Store game data
                global.caklontongGame[id] = {
                    id,
                    soal: randomQuestion.soal,
                    jawaban: randomQuestion.jawaban.toLowerCase(),
                    deskripsi: randomQuestion.deskripsi,
                    winScore,
                    startTime: Date.now(),
                    answered: false
                };

                await m.reply(gameText);

                // Set 60 second timer
                setTimeout(async () => {
                    if (global.caklontongGame && global.caklontongGame[id] && !global.caklontongGame[id].answered) {
                        let room = global.caklontongGame[id];

                        let timeoutCaption = `⏰ *GAME CAK LONTONG - WAKTU HABIS!*\n\n`;
                        timeoutCaption += `❓ *Pertanyaan:* ${room.soal}\n\n`;
                        timeoutCaption += `✅ *Jawaban:* ${room.jawaban}\n`;
                        timeoutCaption += `📝 *Deskripsi:* ${room.deskripsi}\n\n`;
                        timeoutCaption += `🎮 *Game berakhir karena waktu habis!*\n`;
                        timeoutCaption += `Ingin bermain lagi? Ketik !caklontong`;

                        await sock.sendMessage(id, {
                            text: timeoutCaption
                        }, {
                            quoted: m
                        });

                        delete global.caklontongGame[id];
                    }
                }, 60000); // 60 seconds

            } catch (error) {
                console.error('Error fetching caklontong questions:', error);
                await m.reply('❌ Gagal mengambil data pertanyaan. Coba lagi nanti!');
            }

        } catch (error) {
            console.error('Error in caklontong game:', error);
            await m.reply('❌ Terjadi kesalahan saat memulai game. Coba lagi!');
        }
    }
};

export default handler;