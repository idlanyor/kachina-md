import axios from "axios";
export const handler = {
    command: ['family100'],
    category: 'game',
    help: 'Game Family 100',
    desc: 'Game Family 100 - Tebak jawaban dari pertanyaan survey!\n\nFormat: !family100',
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

            // Fetch family100 data from new API
            let family100Data;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    const { data } = await axios.get('https://api.siputzx.my.id/api/games/family100', {
                        headers: {
                            'accept': '*/*',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        timeout: 10000 // 10 second timeout
                    });
                    
                    // Check if API response is successful
                    if (data.status && data.data) {
                        family100Data = data.data;
                        break; // Success, exit retry loop
                    } else {
                        throw new Error('API response status is false or data is missing');
                    }
                } catch (error) {
                    retryCount++;
                    console.log(`Attempt ${retryCount} failed:`, error.message);
                    
                    if (retryCount >= maxRetries) {
                        console.log('All retry attempts failed:', error);
                        return await m.reply('❌ Gagal mengambil data game setelah beberapa percobaan. Jaringan tidak stabil atau server sedang bermasalah. Coba lagi nanti!');
                    }
                    
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }
            
            let gameText = `🎯 *GAME FAMILY 100* 🎯\n\n`;
            gameText += `📝 *Soal:* ${family100Data.soal}\n\n`;
            gameText += `🎁 *Hadiah:* ${winScore.toLocaleString('id-ID')} money\n`;
            gameText += `⏰ *Waktu:* 60 detik\n\n`;
            gameText += `🔍 Terdapat *${family100Data.jawaban.length}* jawaban yang harus ditebak!\n`;
            gameText += `${family100Data.jawaban.find(v => v.includes(" ")) ? `💡 *(beberapa jawaban terdapat spasi)*` : ""}\n\n`;
            gameText += `💬 Ketik jawaban langsung di chat!`;

            // Store game data
            global.family100Game[id] = {
                id,
                soal: family100Data.soal,
                jawaban: family100Data.jawaban,
                terjawab: Array.from(family100Data.jawaban, () => false),
                winScore,
                startTime: Date.now()
            };
            console.log('Family100 game started:', global.family100Game[id]);
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
            }, 90000); // 90 seconds

        } catch (error) {
            console.error('Error in family100 game:', error);
            await m.reply('❌ Terjadi kesalahan saat memulai game. Coba lagi!');
        }
    }
};

export default handler;