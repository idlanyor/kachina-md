import axios from "axios";

// Cooldown storage untuk mencegah spam
const gameCooldowns = new Map();
const GAME_COOLDOWN = 60000; // 1 menit cooldown per grup
const USER_ANSWER_COOLDOWN = 2000; // 2 detik cooldown per user untuk jawaban
const userAnswerCooldowns = new Map();

export const handler = {
    command: ['cerdasCermat', 'cc','lcc'],
    category: 'game',
    help: 'Game Cerdas Cermat',
    desc: 'Game Cerdas Cermat - Bermain cerdas cermat dengan berbagai matapelajaran!\n\nFormat: !cerdasCermat <matapelajaran> <jumlahsoal>\nContoh: !cerdasCermat matematika 5\n\nJawab dengan mengetik jawaban yang tepat!',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: true,
    exec: async ({ sock, m, args }) => {
        try {
            if (!m.isGroup) {
                return await m.reply('❌ Game ini hanya bisa dimainkan di grup!');
            }

            const chatId = m.chat;
            const userId = m.sender;
            const now = Date.now();

            // Check game cooldown untuk grup
            if (gameCooldowns.has(chatId)) {
                const lastGame = gameCooldowns.get(chatId);
                const timeLeft = GAME_COOLDOWN - (now - lastGame);
                if (timeLeft > 0) {
                    const minutes = Math.ceil(timeLeft / 60000);
                    return await m.reply(`⏰ Game cooldown aktif! Tunggu ${minutes} menit lagi sebelum memulai game baru.`);
                }
            }

            // Parameter validation
            if (args.length < 2) {
                let helpText = `🎓 *GAME CERDAS CERMAT* 🎓\n\n`;
                helpText += `📚 Format: !cerdasCermat <matapelajaran> <jumlahsoal>\n`;
                helpText += `📝 Contoh: !cerdasCermat matematika 5\n\n`;
                helpText += `📖 *Mata Pelajaran:*\n`;
                helpText += `• matematika\n• bindo\n• tik\n• pkn\n• bing\n• penjas\n• pai\n• jawa\n• ips\n• ipa\n\n`;
                helpText += `🔢 *Jumlah Soal:* 5-10`;
                return await m.reply(helpText);
            }
            const mataPelajaran = args.split(' ')[0].toLowerCase();
            const jumlahSoal = parseInt(args.split(' ')[1]);

            // Validate mata pelajaran
            const validMataPelajaran = ['matematika', 'bindo', 'tik', 'pkn', 'bing', 'penjas', 'pai', 'jawa', 'ips', 'ipa'];
            if (!validMataPelajaran.includes(mataPelajaran)) {
                return await m.reply(`❌ Mata pelajaran tidak valid!\n\n📖 Mata pelajaran yang tersedia:\n${validMataPelajaran.join(', ')}`);
            }

            // Validate jumlah soal
            if (isNaN(jumlahSoal) || jumlahSoal < 5 || jumlahSoal > 10) {
                return await m.reply('❌ Jumlah soal harus berupa angka antara 5-10!');
            }

            let winScore = jumlahSoal * 1000;
            let id = m.chat;
            
            // Check if there's already an active game dengan race condition protection
            if (global.cerdasCermatGame && global.cerdasCermatGame[id]) {
                return await m.reply('🎮 Masih ada sesi game yang belum diselesaikan!');
            }

            // Initialize global game object if not exists
            if (!global.cerdasCermatGame) {
                global.cerdasCermatGame = {};
            }

            // Set game cooldown
            gameCooldowns.set(chatId, now);

            await m.reply('🔄 Mengambil soal dari server...');

            // Fetch cerdas cermat data from API
            let cerdasCermatData;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    const { data } = await axios.get(`https://api.siputzx.my.id/api/games/cc-sd?matapelajaran=${mataPelajaran}&jumlahsoal=${jumlahSoal}`, {
                        headers: {
                            'accept': '*/*',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        timeout: 10000 // 10 second timeout
                    });
                    
                    // Check if API response is successful
                    if (data.status && data.data && data.data.soal) {
                        cerdasCermatData = data.data;
                        break; // Success, exit retry loop
                    } else {
                        throw new Error('API response status is false or data is missing');
                    }
                } catch (error) {
                    retryCount++;
                    console.log(`Cerdas Cermat API attempt ${retryCount} failed:`, error.message);
                    
                    if (retryCount >= maxRetries) {
                        console.error('All Cerdas Cermat API attempts failed:', error);
                        // Remove cooldown jika gagal
                        gameCooldowns.delete(chatId);
                        return await m.reply('❌ Gagal mengambil data soal. Silakan coba lagi nanti.');
                    }
                    
                    // Wait before retry (progressive delay)
                    await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
                }
            }

            // Store game data dengan race condition protection
            global.cerdasCermatGame[id] = {
                id,
                mataPelajaran: cerdasCermatData.matapelajaran,
                jumlahSoal: cerdasCermatData.jumlah_soal,
                soal: cerdasCermatData.soal,
                currentQuestion: 0,
                score: 0,
                winScore,
                startTime: Date.now(),
                timeout: null,
                participants: new Map(), // Changed to Map to track individual scores
                isActive: true, // Flag untuk mencegah race condition
                answeredUsers: new Set() // Track users yang sudah jawab di soal ini
            };

            // Start the first question
            await startQuestion(sock, m, id);

        } catch (error) {
            console.error('Error in cerdas cermat game:', error);
            // Remove cooldown jika error
            gameCooldowns.delete(m.chat);
            await m.reply('❌ Terjadi kesalahan saat memulai game. Silakan coba lagi.');
        }
    }
};

// Function to start a question
export async function startQuestion(sock, m, chatId) {
    const game = global.cerdasCermatGame[chatId];
    if (!game || !game.isActive) return;

    const currentQ = game.soal[game.currentQuestion];
    if (!currentQ) {
        // Game finished
        await endGame(sock, m, chatId);
        return;
    }

    // Reset answered users untuk soal baru
    game.answeredUsers.clear();

    let questionText = `🎓 *CERDAS CERMAT - ${game.mataPelajaran.toUpperCase()}* 🎓\n\n`;
    questionText += `📝 *Soal ${game.currentQuestion + 1}/${game.jumlahSoal}*\n\n`;
    questionText += `❓ ${currentQ.pertanyaan}\n\n`;
    
    // Add answer options
    currentQ.semua_jawaban.forEach((jawaban, index) => {
        const key = Object.keys(jawaban)[0];
        const value = jawaban[key];
        questionText += `${key.toUpperCase()}. ${value}\n`;
    });
    
    questionText += `\n⏰ *Waktu:* 30 detik\n`;
    questionText += `💰 *Skor saat ini:* ${game.score}\n\n`;
    questionText += `💬 Ketik huruf jawaban (a/b/c/d)!`;

    await sock.sendMessage(chatId, { text: questionText });

    // Set timeout for question
    game.timeout = setTimeout(async () => {
        if (global.cerdasCermatGame[chatId] && global.cerdasCermatGame[chatId].isActive) {
            await sock.sendMessage(chatId, { 
                text: `⏰ Waktu habis! Jawaban yang benar: *${currentQ.jawaban_benar.toUpperCase()}*\n\nLanjut ke soal berikutnya...` 
            });
            
            game.currentQuestion++;
            setTimeout(() => startQuestion(sock, m, chatId), 2000);
        }
    }, 30000); // 30 seconds
}

// Function untuk handle jawaban dengan cooldown protection
export async function handleAnswer(sock, m, answer) {
    const chatId = m.chat;
    const userId = m.sender;
    const now = Date.now();
    
    // Check game exists dan active
    const game = global.cerdasCermatGame[chatId];
    if (!game || !game.isActive) return false;
    
    // Check user answer cooldown
    const userCooldownKey = `${chatId}_${userId}`;
    if (userAnswerCooldowns.has(userCooldownKey)) {
        const lastAnswer = userAnswerCooldowns.get(userCooldownKey);
        if (now - lastAnswer < USER_ANSWER_COOLDOWN) {
            return false; // Ignore jawaban jika masih cooldown
        }
    }
    
    // Check if user sudah jawab soal ini
    if (game.answeredUsers.has(userId)) {
        return false; // User sudah jawab soal ini
    }
    
    // Validate answer format
    const validAnswers = ['a', 'b', 'c', 'd'];
    if (!validAnswers.includes(answer.toLowerCase())) {
        return false;
    }
    
    // Set user answer cooldown
    userAnswerCooldowns.set(userCooldownKey, now);
    
    // Mark user as answered untuk soal ini
    game.answeredUsers.add(userId);
    
    const currentQ = game.soal[game.currentQuestion];
    const isCorrect = answer.toLowerCase() === currentQ.jawaban_benar.toLowerCase();
    
    // Update participant data
    if (!game.participants.has(userId)) {
        game.participants.set(userId, {
            score: 0,
            totalMoney: 0,
            correctAnswers: 0,
            wrongAnswers: 0
        });
    }
    
    const participant = game.participants.get(userId);
    
    if (isCorrect) {
        participant.score++;
        participant.correctAnswers++;
        participant.totalMoney += 1000;
        
        // Clear timeout karena ada yang jawab benar
        if (game.timeout) {
            clearTimeout(game.timeout);
        }
        
        await sock.sendMessage(chatId, {
            text: `✅ *Benar!* @${userId.split('@')[0]}\n\n🎉 Jawaban: *${currentQ.jawaban_benar.toUpperCase()}*\n💰 +1000 money\n\nLanjut ke soal berikutnya...`,
            mentions: [userId]
        });
        
        game.currentQuestion++;
        setTimeout(() => startQuestion(sock, m, chatId), 2000);
    } else {
        participant.wrongAnswers++;
        
        await sock.sendMessage(chatId, {
            text: `❌ *Salah!* @${userId.split('@')[0]}\n\nTetap semangat! 💪`,
            mentions: [userId]
        });
    }
    
    return true;
}

// Function to end game
async function endGame(sock, m, chatId) {
    const game = global.cerdasCermatGame[chatId];
    if (!game) return;
    
    // Set game as inactive
    game.isActive = false;

    let endText = `🏆 *GAME CERDAS CERMAT SELESAI!* 🏆\n\n`;
    endText += `📚 *Mata Pelajaran:* ${game.mataPelajaran.toUpperCase()}\n`;
    endText += `📝 *Total Soal:* ${game.jumlahSoal}\n\n`;
    
    // Show participants and their scores
    if (game.participants.size > 0) {
        endText += `🎯 *HASIL PESERTA:*\n`;
        
        // Sort participants by score (highest first)
        const sortedParticipants = Array.from(game.participants.entries())
            .sort((a, b) => b[1].score - a[1].score);
        
        sortedParticipants.forEach(([userId, data], index) => {
            const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const percentage = Math.round((data.score / game.jumlahSoal) * 100);
            endText += `${rank} @${userId.split('@')[0]} - ${data.score}/${game.jumlahSoal} (${percentage}%) - ${data.totalMoney.toLocaleString('id-ID')} money\n`;
        });
        
        endText += `\n🎉 *Selamat kepada semua peserta!*\n`;
        endText += `💰 *Total hadiah dibagikan:* ${Array.from(game.participants.values()).reduce((sum, p) => sum + p.totalMoney, 0).toLocaleString('id-ID')} money`;
        
        // Send with mentions
        await sock.sendMessage(chatId, {
            text: endText,
            mentions: Array.from(game.participants.keys())
        });
    } else {
        endText += `😔 *Tidak ada peserta yang menjawab.*`;
        await sock.sendMessage(chatId, { text: endText });
    }

    // Clear timeout and delete game
    if (game.timeout) {
        clearTimeout(game.timeout);
    }
    delete global.cerdasCermatGame[chatId];
    
    // Clean up cooldowns (optional, untuk memory management)
    setTimeout(() => {
        // Clean old user answer cooldowns
        const cutoff = Date.now() - USER_ANSWER_COOLDOWN;
        for (const [key, timestamp] of userAnswerCooldowns.entries()) {
            if (timestamp < cutoff) {
                userAnswerCooldowns.delete(key);
            }
        }
    }, USER_ANSWER_COOLDOWN);
}

export default handler;