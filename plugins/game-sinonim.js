import Database from '../helper/database.js';

export const handler = {
    command: ['sinonim'],
    category: 'game',
    help: 'Game Tebak Sinonim Kata',
    desc: 'Game tebak sinonim kata - Tebak kata-kata yang memiliki arti sama!\n\nFormat: !sinonim',
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
            if (global.sinonimGame && global.sinonimGame[id]) {
                return await m.reply('🎮 Masih ada sesi game yang belum diselesaikan!');
            }

            // Initialize global game object if not exists
            if (!global.sinonimGame) {
                global.sinonimGame = {};
            }

            // Database sinonim kata (bisa dipindah ke file JSON terpisah)
            const sinonimData = [
                {
                    kata: "BAHAGIA",
                    sinonim: ["GEMBIRA", "SENANG", "RIANG", "SUKA CITA", "GIRANG"]
                },
                {
                    kata: "CANTIK",
                    sinonim: ["INDAH", "ELOK", "MOLEK", "AYU", "JELITA"]
                },
                {
                    kata: "PINTAR",
                    sinonim: ["CERDAS", "PANDAI", "BIJAK", "GENIUS", "JENIUS"]
                },
                {
                    kata: "MARAH",
                    sinonim: ["MURKA", "GERAM", "BERANG", "KESAL", "JENGKEL"]
                },
                {
                    kata: "BESAR",
                    sinonim: ["RAKSASA", "JUMBO", "BONGSOR", "AGUNG", "LUAS"]
                },
                {
                    kata: "KECIL",
                    sinonim: ["MUNGIL", "MINI", "CILIK", "IMUT", "KERDIL"]
                },
                {
                    kata: "CEPAT",
                    sinonim: ["KILAT", "LAJU", "DERAS", "GESIT", "TANGKAS"]
                },
                {
                    kata: "LAMBAT",
                    sinonim: ["PELAN", "LELET", "SANTAI", "PERLAHAN", "LEMOT"]
                }
            ];

            // Pick random question
            let randomQuestion = sinonimData[Math.floor(Math.random() * sinonimData.length)];
            
            let gameText = `🎯 *GAME TEBAK SINONIM* 🎯\n\n`;
            gameText += `📝 *Kata Utama:* ${randomQuestion.kata}\n\n`;
            gameText += `🎁 *Hadiah:* ${winScore.toLocaleString('id-ID')} money\n`;
            gameText += `⏰ *Waktu:* 60 detik\n\n`;
            gameText += `🔍 Terdapat *${randomQuestion.sinonim.length}* sinonim yang harus ditebak!\n`;
            gameText += `${randomQuestion.sinonim.find(v => v.includes(" ")) ? `💡 *(beberapa jawaban terdapat spasi)*` : ""}\n\n`;
            gameText += `💬 Ketik jawaban langsung di chat!`;

            // Store game data
            global.sinonimGame[id] = {
                id,
                kata: randomQuestion.kata,
                sinonim: randomQuestion.sinonim,
                terjawab: Array.from(randomQuestion.sinonim, () => false),
                winScore,
                startTime: Date.now()
            };

            await m.reply(gameText);

            // Set 60 second timer
            setTimeout(async () => {
                if (global.sinonimGame && global.sinonimGame[id]) {
                    let room = global.sinonimGame[id];

                    // Get users who answered correctly
                    let correctAnswerers = room.terjawab.filter(v => v && v !== false);
                    let uniqueAnswerers = [...new Set(correctAnswerers)];

                    let timeoutCaption = `⏰ *GAME SINONIM - WAKTU HABIS!*\n\n`;
                    timeoutCaption += `📝 *Kata Utama:* ${room.kata}\n\n`;
                    timeoutCaption += `✅ *SINONIM YANG BENAR:*\n`;
                    timeoutCaption += room.sinonim.map((sinonim, index) => {
                        if (room.terjawab[index]) {
                            return `${index + 1}. ${sinonim} ✓ @${room.terjawab[index].split("@")[0]}`;
                        } else {
                            return `${index + 1}. ${sinonim}`;
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

                    delete global.sinonimGame[id];
                }
            }, 90000); // 90 seconds

        } catch (error) {
            console.error('Error in sinonim game:', error);
            await m.reply('❌ Terjadi kesalahan saat memulai game. Coba lagi!');
        }
    }
};

export default handler;