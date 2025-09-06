
export const handler = {
    command: ['family100'],
    category: 'game',
    help: 'Game Family 100 - Tebak jawaban dari pertanyaan survey!\n\nFormat: !family100',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: true,
    exec: async ({ sock, m }) => {
        try {
            if (!m.isGroup) {
                return await m.reply('❌ Game ini hanya bisa dimainkan di grup!');
            }

            let winScore = 10000;
            let id = m.chat;
            
            // Check if there's already an active game
            if (global.family100Game && global.family100Game[id]) {
                return await m.reply('🎮 Masih ada sesi game yang belum diselesaikan!');
            }

            // Initialize global game object if not exists
            if (!global.family100Game) {
                global.family100Game = {};
            }

            // Fetch family100 data from API
            let response;
            try {
                response = await fetch('https://raw.githubusercontent.com/BochilTeam/database/master/games/family100.json');
                if (!response.ok) {
                    throw new Error('Failed to fetch family100 data');
                }
            } catch (error) {
                return await m.reply('❌ Gagal mengambil data game. Coba lagi nanti!');
            }

            const family100Data = await response.json();
            
            // Pick random question
            let randomQuestion = family100Data[Math.floor(Math.random() * family100Data.length)];
            
            let gameText = `🎯 *GAME FAMILY 100* 🎯\n\n`;
            gameText += `📝 *Soal:* ${randomQuestion.soal}\n\n`;
            gameText += `🎁 *Hadiah:* ${winScore.toLocaleString('id-ID')} money\n`;
            gameText += `⏰ *Waktu:* 60 detik\n\n`;
            gameText += `🔍 Terdapat *${randomQuestion.jawaban.length}* jawaban yang harus ditebak!\n`;
            gameText += `${randomQuestion.jawaban.find(v => v.includes(" ")) ? `💡 *(beberapa jawaban terdapat spasi)*` : ""}\n\n`;
            gameText += `💬 Ketik jawaban langsung di chat!`;

            // Store game data
            global.family100Game[id] = {
                id,
                soal: randomQuestion.soal,
                jawaban: randomQuestion.jawaban,
                terjawab: Array.from(randomQuestion.jawaban, () => false),
                winScore,
                startTime: Date.now()
            };

            await m.reply(gameText);

            // Set 60 second timer
            setTimeout(async () => {
                if (global.family100Game && global.family100Game[id]) {
                    let room = global.family100Game[id];

                    // Get users who answered correctly
                    let correctAnswerers = room.terjawab.filter(v => v && v !== false);
                    let uniqueAnswerers = [...new Set(correctAnswerers)];

                    let timeoutCaption = `⏰ *GAME FAMILY100 - WAKTU HABIS!*\n\n`;
                    timeoutCaption += `📝 *Soal:* ${room.soal}\n\n`;
                    timeoutCaption += `✅ *JAWABAN YANG BENAR:*\n`;
                    timeoutCaption += room.jawaban.map((jawaban, index) => {
                        if (room.terjawab[index]) {
                            return `${index + 1}. ${jawaban} ✓ @${room.terjawab[index].split("@")[0]}`;
                        } else {
                            return `${index + 1}. ${jawaban}`;
                        }
                    }).join("\n");
                    
                    if (uniqueAnswerers.length > 0) {
                        timeoutCaption += `\n\n🎉 *Selamat kepada yang berhasil menjawab:*\n`;
                        timeoutCaption += uniqueAnswerers.map(user => `@${user.split("@")[0]}`).join(', ');
                    }
                    
                    timeoutCaption += `\n\n🎮 *Game berakhir karena waktu habis!*`;

                    await sock.sendMessage(id, {
                        text: timeoutCaption,
                        mentions: uniqueAnswerers
                    }, {
                        quoted: m
                    });

                    delete global.family100Game[id];
                }
            }, 60000); // 60 seconds

        } catch (error) {
            console.error('Error in family100 game:', error);
            await m.reply('❌ Terjadi kesalahan saat memulai game. Coba lagi!');
        }
    }
};

export default handler;