import User from '../database/models/User.js';
import { handleAnswer } from '../plugins/game-cerdasCermat.js';

export const handleSinonimAnswer = async (sock, m) => {
    try {
        if (!global.sinonimGame || !global.sinonimGame[m.chat]) {
            return false; // No active game
        }

        let room = global.sinonimGame[m.chat];

        // Perbaikan: ambil teks dari message object yang benar
        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toUpperCase().trim();

        if (!text) return false;

        // Check if answer matches any sinonim
        let isCorrect = false;
        let answerIndex = -1;

        for (let i = 0; i < room.sinonim.length; i++) {
            if (room.sinonim[i].toUpperCase() === text && !room.terjawab[i]) {
                isCorrect = true;
                answerIndex = i;
                break;
            }
        }

        if (isCorrect) {
            // Mark as answered
            room.terjawab[answerIndex] = m.sender;

            // Calculate points based on difficulty and speed
            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let points = Math.floor(room.winScore / room.sinonim.length) + (timeBonus * 10);

            // Add money to user (implement your database logic here)
            // await Database.addMoney(m.sender, points);

            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `✅ *${room.sinonim[answerIndex]}* adalah sinonim dari *${room.kata}*\n`;
            correctMsg += `💰 +${points.toLocaleString('id-ID')} money\n`;
            correctMsg += `⚡ Bonus waktu: +${timeBonus * 10} poin\n\n`;

            // Check if all answered
            let allAnswered = room.terjawab.every(v => v !== false);
            if (allAnswered) {
                let winners = [...new Set(room.terjawab)];
                correctMsg += `🏆 *GAME SELESAI!*\n`;
                correctMsg += `🎊 Semua sinonim berhasil ditebak!\n`;
                correctMsg += `👏 Selamat untuk semua pemenang: ${winners.map(w => `@${w.split('@')[0]}`).join(', ')}`;

                await sock.sendMessage(m.chat, {
                    text: correctMsg,
                    mentions: winners
                }, { quoted: m });

                delete global.sinonimGame[m.chat];
            } else {
                let remaining = room.terjawab.filter(v => v === false).length;
                correctMsg += `🔍 Masih ada ${remaining} sinonim lagi yang belum ditebak!`;

                await sock.sendMessage(m.chat, {
                    text: correctMsg,
                    mentions: [m.sender]
                }, { quoted: m });
            }

            return true; // Message handled
        }

        return false; // Not a correct answer

    } catch (error) {
        console.error('Error handling sinonim answer:', error);
        return false;
    }
};

// Handler untuk menjawab game caklontong
export const handleCaklontongAnswer = async (sock, m) => {
    try {
        if (!global.caklontongGame || !global.caklontongGame[m.chat]) {
            return false; // No active game
        }

        let room = global.caklontongGame[m.chat];

        // Ambil teks dari message object yang benar
        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();

        if (!text) return false;

        // Check if answer is correct
        if (text === room.jawaban) {
            // Mark as answered
            room.answered = true;

            // Calculate points based on speed
            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let points = room.winScore + (timeBonus * 50);

            // Add money to user (implement your database logic here)
            // await Database.addMoney(m.sender, points);

            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `✅ *Jawaban:* ${room.jawaban}\n`;
            correctMsg += `📝 *Deskripsi:* ${room.deskripsi}\n\n`;
            correctMsg += `💰 +${points.toLocaleString('id-ID')} money\n`;
            correctMsg += `⚡ Bonus waktu: +${timeBonus * 50} poin\n\n`;
            correctMsg += `🏆 Selamat @${m.sender.split('@')[0]}!\n`;
            correctMsg += `Ingin bermain lagi? Ketik !caklontong`;

            await sock.sendMessage(m.chat, {
                text: correctMsg,
                mentions: [m.sender]
            }, { quoted: m });

            delete global.caklontongGame[m.chat];
            return true; // Message handled
        }

        return false; // Not a correct answer

    } catch (error) {
        console.error('Error handling caklontong answer:', error);
        return false;
    }
};

// Handler untuk menjawab game family100
export const handleFamily100Answer = async (sock, m) => {
    try {
        if (!global.family100Game || !global.family100Game[m.chat]) {
            return false; // No active game
        }

        let room = global.family100Game[m.chat];

        // Ambil teks dari message object yang benar
        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();

        if (!text) return false;

        // Check if answer matches any jawaban
        let isCorrect = false;
        let answerIndex = -1;

        for (let i = 0; i < room.jawaban.length; i++) {
            if (room.jawaban[i].toLowerCase() === text && !room.terjawab[i]) {
                isCorrect = true;
                answerIndex = i;
                break;
            }
        }

        // Di dalam handleFamily100Answer
        if (isCorrect) {
            // Mark as answered
            room.terjawab[answerIndex] = m.sender;

            // Calculate points based on difficulty and speed
            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let points = Math.floor(room.winScore / room.jawaban.length) + (timeBonus * 20);

            // Add balance to user
            try {
                await User.addBalance(m.sender, points, 'Family100 game win');
            } catch (error) {
                console.error('Error adding balance:', error);
            }

            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `✅ *${room.jawaban[answerIndex]}* adalah jawaban yang tepat!\n`;
            correctMsg += `💰 +Rp ${points.toLocaleString('id-ID')}\n`;
            correctMsg += `⚡ Bonus waktu: +${timeBonus * 20} poin\n\n`;

            // Check if all answered
            let allAnswered = room.terjawab.every(v => v !== false);
            if (allAnswered) {
                let winners = [...new Set(room.terjawab)];
                correctMsg += `🏆 *GAME SELESAI!*\n`;
                correctMsg += `🎊 Semua jawaban berhasil ditebak!\n`;
                correctMsg += `👏 Selamat untuk semua pemenang: ${winners.map(w => `@${w.split('@')[0]}`).join(', ')}`;

                await sock.sendMessage(m.chat, {
                    text: correctMsg,
                    mentions: winners
                }, { quoted: m });

                delete global.family100Game[m.chat];
            } else {
                let remaining = room.terjawab.filter(v => v === false).length;
                correctMsg += `🔍 Masih ada ${remaining} jawaban lagi yang belum ditebak!`;

                await sock.sendMessage(m.chat, {
                    text: correctMsg,
                    mentions: [m.sender]
                }, { quoted: m });
            }

            return true; // Message handled
        }

        return false; // Not a correct answer

    } catch (error) {
        console.error('Error handling family100 answer:', error);
        return false;
    }
};

// Handler untuk menjawab game cerdas cermat
export const handleCerdasCermatAnswer = async (sock, m) => {
    try {
        if (!global.cerdasCermatGame || !global.cerdasCermatGame[m.chat]) {
            return false; // No active game
        }

        let room = global.cerdasCermatGame[m.chat];

        // Get text from message
        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();

        if (!text) return false;

        // Check if it's a valid answer (a, b, c, d)
        if (!['a', 'b', 'c', 'd'].includes(text)) {
            return false;
        }

        const currentQ = room.soal[room.currentQuestion];
        if (!currentQ) return false;

        // Clear timeout
        if (room.timeout) {
            clearTimeout(room.timeout);
            room.timeout = null;
        }

        // Initialize participant if not exists
        if (!room.participants.has(m.sender)) {
            room.participants.set(m.sender, {
                score: 0,
                totalMoney: 0,
                answers: []
            });
        }

        const participant = room.participants.get(m.sender);

        // Check if answer is correct
        const isCorrect = text === currentQ.jawaban_benar.toLowerCase();

        let responseText = '';
        if (isCorrect) {
            room.score++;
            participant.score++;

            // Calculate points
            let points = 1000;
            participant.totalMoney += points;

            // Add balance to user
            try {
                await User.addBalance(m.sender, points, 'Cerdas Cermat game win');
            } catch (error) {
                console.error('Error adding balance:', error);
            }

            responseText = `🎉 *JAWABAN BENAR!*\n\n`;
            responseText += `✅ Jawaban: *${text.toUpperCase()}*\n`;
            responseText += `💰 +${points.toLocaleString('id-ID')} money\n`;
            responseText += `📊 Skor @${m.sender.split('@')[0]}: ${participant.score}/${room.jumlahSoal}`;
        } else {
            responseText = `❌ *JAWABAN SALAH!*\n\n`;
            responseText += `❌ Jawabanmu: *${text.toUpperCase()}*\n`;
            responseText += `✅ Jawaban benar: *${currentQ.jawaban_benar.toUpperCase()}*\n`;
            responseText += `📊 Skor @${m.sender.split('@')[0]}: ${participant.score}/${room.jumlahSoal}`;
        }

        // Record the answer
        participant.answers.push({
            question: room.currentQuestion + 1,
            answer: text,
            correct: isCorrect
        });

        await sock.sendMessage(m.chat, {
            text: responseText,
            mentions: [m.sender],
        }, { quoted: m });

        // Move to next question
        room.currentQuestion++;

        // Wait 3 seconds before next question
        setTimeout(async () => {
            if (global.cerdasCermatGame[m.chat]) {
                const { startQuestion } = await import('../plugins/game-cerdasCermat.js');
                await startQuestion(sock, m, m.chat);
            }
        }, 3000);

        return true;
    } catch (error) {
        console.error('Error in handleCerdasCermatAnswer:', error);
        return false;
    }
};

// Handler untuk game lainnya bisa ditambahkan di sini
// Add new tekateki answer handler function
export const handleTekatekiAnswer = async (sock, m) => {
    try {
        if (!global.tekatekiGame || !global.tekatekiGame[m.chat]) {
            return false; // No active game
        }

        let room = global.tekatekiGame[m.chat];

        // Get text from message object
        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();
        if (!text || text.length < 2) return false;

        // Check if answer matches any jawaban
        let isCorrect = false;
        for (let correctAnswer of room.jawaban) {
            if (text === correctAnswer.toLowerCase().trim()) {
                isCorrect = true;
                break;
            }
        }

        if (isCorrect) {
            // Calculate reward
            let reward = room.winScore || 5000;
            
            // Add balance to user
            try {
                await User.addBalance(m.sender, reward, 'Tekateki game win');
            } catch (error) {
                console.error('Error adding balance:', error);
            }

            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `✅ Jawaban: *${room.jawaban[0]}*\n`;
            correctMsg += `💰 +Rp ${reward.toLocaleString('id-ID')}\n`;
            correctMsg += `🏆 Selamat @${m.sender.split('@')[0]}!`;

            await sock.sendMessage(m.chat, {
                text: correctMsg,
                mentions: [m.sender]
            }, { quoted: m });

            // End game
            delete global.tekatekiGame[m.chat];
            return true;
        }

        return false; // Not a correct answer

    } catch (error) {
        console.error('Error handling tekateki answer:', error);
        return false;
    }
};

export const handleGameAnswers = async (sock, m) => {
    // Try each game handler
    const handlers = [
        handleSinonimAnswer,
        handleCaklontongAnswer,
        handleFamily100Answer,
        handleCerdasCermatAnswer,
        handleTekatekiAnswer 
    ];

    for (const handler of handlers) {
        try {
            const handled = await handler(sock, m);
            if (handled) {
                return true; // Message was handled by this game
            }
        } catch (error) {
            console.error('Error in game handler:', error);
        }
    }

    return false; // No game handled this message
};

// Tambahkan di function yang handle message
export async function handleGameMessage(sock, m) {
    // Handle cerdas cermat answers
    if (global.cerdasCermatGame && global.cerdasCermatGame[m.chat]) {
        const answer = m.text?.trim().toLowerCase();
        if (['a', 'b', 'c', 'd'].includes(answer)) {
            await handleAnswer(sock, m, answer);
            return true; // Message handled
        }
    }
    
    // Remove tekateki handling from here since it's now in handleGameAnswers

    return false; // Message not handled
}