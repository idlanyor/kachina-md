import User from '../database/models/User.js';
import { handleAnswer } from '../plugins/game-cerdasCermat.js';

export const handleSinonimAnswer = async (sock, m) => {
    try {
        if (!global.sinonimGame || !global.sinonimGame[m.chat]) {
            return false;
        }

        let room = global.sinonimGame[m.chat];

        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toUpperCase().trim();

        if (!text) return false;

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
            room.terjawab[answerIndex] = m.sender;

            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let points = Math.floor(room.winScore / room.sinonim.length) + (timeBonus * 10);


            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `✅ *${room.sinonim[answerIndex]}* adalah sinonim dari *${room.kata}*\n`;
            correctMsg += `💰 +${points.toLocaleString('id-ID')} money\n`;
            correctMsg += `⚡ Bonus waktu: +${timeBonus * 10} poin\n\n`;

            let allAnswered = room.terjawab.every(v => v !== false);
            if (allAnswered) {
                let winners = [...new Set(room.terjawab)];
                correctMsg += `🏆 *GAME SELESAI!*\n`;
                correctMsg += `🎊 Semua sinonim berhasil ditebak!\n`;
                correctMsg += `🏅 Pemenang: ${winners.map(w => `@${w.split('@')[0]}`).join(', ')}`;

                delete global.sinonimGame[m.chat];
            } else {
                let remaining = room.sinonim.filter((_, i) => !room.terjawab[i]);
                correctMsg += `📝 Sisa ${remaining.length} sinonim lagi`;
            }

            try {
                await User.addBalance(m.sender, points, 'Sinonim game win');
            } catch (error) {
                console.error('Error adding balance:', error);
            }

            await sock.sendMessage(m.chat, {
                text: correctMsg,
                mentions: allAnswered ? [...new Set(room.terjawab)] : [m.sender]
            }, { quoted: m });

            return true;
        }

        return false;

    } catch (error) {
        console.error('Error handling sinonim answer:', error);
        return false;
    }
};

export const handleCaklontongAnswer = async (sock, m) => {
    try {
        if (!global.caklontongGame || !global.caklontongGame[m.chat]) {
            return false;
        }

        let room = global.caklontongGame[m.chat];

        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();
        if (!text) return false;

        const isCorrect = text === room.jawaban.toLowerCase();

        if (isCorrect) {
            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let reward = room.winScore + (timeBonus * 50);
            
            try {
                await User.addBalance(m.sender, reward, 'Caklontong game win');
            } catch (error) {
                console.error('Error adding balance:', error);
            }

            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `✅ Jawaban: *${room.jawaban}*\n`;
            correctMsg += `💰 +Rp ${reward.toLocaleString('id-ID')}\n`;
            correctMsg += `⚡ Bonus waktu: +${timeBonus * 50} poin\n`;
            correctMsg += `🏆 Selamat @${m.sender.split('@')[0]}!`;

            await sock.sendMessage(m.chat, {
                text: correctMsg,
                mentions: [m.sender]
            }, { quoted: m });

            delete global.caklontongGame[m.chat];
            return true;
        }

        return false;

    } catch (error) {
        console.error('Error handling caklontong answer:', error);
        return false;
    }
};

export const handleFamily100Answer = async (sock, m) => {
    try {
        if (!global.family100Game || !global.family100Game[m.chat]) {
            return false;
        }

        let room = global.family100Game[m.chat];

        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();
        if (!text || text.length < 2) return false;

        let isCorrect = false;
        let answerIndex = -1;

        for (let i = 0; i < room.jawaban.length; i++) {
            if (room.jawaban[i].toLowerCase().includes(text) && !room.terjawab[i]) {
                isCorrect = true;
                answerIndex = i;
                break;
            }
        }

        if (isCorrect) {
            room.terjawab[answerIndex] = m.sender;

            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let points = Math.floor(room.winScore / room.jawaban.length) + (timeBonus * 10);

            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `✅ *${room.jawaban[answerIndex]}*\n`;
            correctMsg += `💰 +${points.toLocaleString('id-ID')} money\n`;
            correctMsg += `⚡ Bonus waktu: +${timeBonus * 10} poin\n\n`;

            let allAnswered = room.terjawab.every(v => v !== false);
            if (allAnswered) {
                let winners = [...new Set(room.terjawab)];
                correctMsg += `🏆 *GAME SELESAI!*\n`;
                correctMsg += `🎊 Semua jawaban berhasil ditebak!\n`;
                correctMsg += `🏅 Pemenang: ${winners.map(w => `@${w.split('@')[0]}`).join(', ')}`;

                delete global.family100Game[m.chat];
            } else {
                let remaining = room.jawaban.filter((_, i) => !room.terjawab[i]);
                correctMsg += `📝 Sisa ${remaining.length} jawaban lagi`;
            }

            try {
                await User.addBalance(m.sender, points, 'Family100 game win');
            } catch (error) {
                console.error('Error adding balance:', error);
            }

            await sock.sendMessage(m.chat, {
                text: correctMsg,
                mentions: allAnswered ? [...new Set(room.terjawab)] : [m.sender]
            }, { quoted: m });

            return true;
        }

        return false;

    } catch (error) {
        console.error('Error handling family100 answer:', error);
        return false;
    }
};

export const handleCerdasCermatAnswer = async (sock, m) => {
    try {
        if (!global.cerdasCermatGame || !global.cerdasCermatGame[m.chat]) {
            return false;
        }

        let room = global.cerdasCermatGame[m.chat];

        // Prevent race condition: Check if game has been running for at least 2 seconds
        const gameRunTime = Date.now() - room.startTime;
        if (gameRunTime < 2000) {
            console.log(`Game too fast, ignoring answer. Runtime: ${gameRunTime}ms`);
            return false;
        }

        // Check if game is still active
        if (!room.isActive) {
            return false;
        }

        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();
        if (!text) return false;

        // Validate answer format (a, b, c, d)
        const validAnswers = ['a', 'b', 'c', 'd'];
        if (!validAnswers.includes(text)) {
            return false;
        }

        // Use the handleAnswer function from the cerdasCermat plugin
        return await handleAnswer(sock, m, text);

    } catch (error) {
        console.error('Error handling cerdasCermat answer:', error);
        return false;
    }
};

export const handleTekatekiAnswer = async (sock, m) => {
    try {
        if (!global.tekatekiGame || !global.tekatekiGame[m.chat]) {
            return false;
        }

        let room = global.tekatekiGame[m.chat];

        // Prevent race condition: Check if game has been running for at least 2 seconds
        const gameRunTime = Date.now() - room.startTime;
        if (gameRunTime < 2000) {
            console.log(`Game too fast, ignoring answer. Runtime: ${gameRunTime}ms`);
            return false;
        }

        // Atomic check: Ensure session still exists after time validation
        if (!global.tekatekiGame[m.chat]) {
            return false;
        }

        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();
        if (!text || text.length < 2) return false;

        let isCorrect = false;
        for (let correctAnswer of room.jawaban) {
            if (text === correctAnswer.toLowerCase().trim()) {
                isCorrect = true;
                break;
            }
        }

        if (isCorrect) {
            // Atomic operation: Mark as answered to prevent double processing
            if (room.answered) {
                return false; // Already answered
            }
            room.answered = true;

            let reward = room.winScore || 5000;
            
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

            delete global.tekatekiGame[m.chat];
            return true;
        }

        return false;

    } catch (error) {
        console.error('Error handling tekateki answer:', error);
        return false;
    }
};

export const handleAsahOtakAnswer = async (sock, m) => {
    try {
        if (!global.asahOtakGame || !global.asahOtakGame[m.chat]) {
            return false;
        }

        let room = global.asahOtakGame[m.chat];

        // Prevent race condition: Check if game has been running for at least 2 seconds
        const gameRunTime = Date.now() - room.startTime;
        if (gameRunTime < 2000) {
            console.log(`Game too fast, ignoring answer. Runtime: ${gameRunTime}ms`);
            return false;
        }

        // Atomic check: Ensure session still exists after time validation
        if (!global.asahOtakGame[m.chat]) {
            return false;
        }

        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();
        if (!text || text.length < 2) return false;

        let isCorrect = false;
        for (let correctAnswer of room.jawaban) {
            if (text === correctAnswer.toLowerCase().trim()) {
                isCorrect = true;
                break;
            }
        }

        if (isCorrect) {
            // Atomic operation: Mark as answered to prevent double processing
            if (room.answered) {
                return false; // Already answered
            }
            room.answered = true;

            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let reward = room.winScore + (timeBonus * 50);
            
            try {
                await User.addBalance(m.sender, reward, 'AsahOtak game win');
            } catch (error) {
                console.error('Error adding balance:', error);
            }

            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `✅ Jawaban: *${room.jawaban[0]}*\n`;
            correctMsg += `💰 +Rp ${reward.toLocaleString('id-ID')}\n`;
            correctMsg += `⚡ Bonus waktu: +${timeBonus * 50} poin\n`;
            correctMsg += `🏆 Selamat @${m.sender.split('@')[0]}!`;

            await sock.sendMessage(m.chat, {
                text: correctMsg,
                mentions: [m.sender]
            }, { quoted: m });

            delete global.asahOtakGame[m.chat];
            return true;
        }

        return false;

    } catch (error) {
        console.error('Error handling asahotak answer:', error);
        return false;
    }
};

export const handleTebakWarnaAnswer = async (sock, m) => {
    try {
        if (!global.tebakWarnaGame || !global.tebakWarnaGame[m.chat]) {
            return false;
        }

        let room = global.tebakWarnaGame[m.chat];

        // Prevent race condition: Check if game has been running for at least 2 seconds
        const gameRunTime = Date.now() - room.startTime;
        if (gameRunTime < 2000) {
            console.log(`Game too fast, ignoring answer. Runtime: ${gameRunTime}ms`);
            return false;
        }

        // Atomic check: Ensure session still exists after time validation
        if (!global.tebakWarnaGame[m.chat]) {
            return false;
        }

        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.trim();
        if (!text) return false;

        const isCorrect = text === room.jawaban;

        if (isCorrect) {
            // Atomic operation: Mark as answered to prevent double processing
            if (room.answered) {
                return false; // Already answered
            }
            room.answered = true;

            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let reward = room.winScore + (timeBonus * 50);
            
            try {
                await User.addBalance(m.sender, reward, 'TebakWarna game win');
            } catch (error) {
                console.error('Error adding balance:', error);
            }

            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `✅ Jawaban: *${room.jawaban}*\n`;
            correctMsg += `💰 +Rp ${reward.toLocaleString('id-ID')}\n`;
            correctMsg += `⚡ Bonus waktu: +${timeBonus * 50} poin\n`;
            correctMsg += `🏆 Selamat @${m.sender.split('@')[0]}!`;

            if (room.messageId) {
                try {
                    await sock.sendMessage(m.chat, { 
                        delete: room.messageId 
                    });
                } catch (error) {
                    console.error('Error deleting image message:', error);
                }
            }

            await sock.sendMessage(m.chat, {
                text: correctMsg,
                mentions: [m.sender]
            }, { quoted: m });

            delete global.tebakWarnaGame[m.chat];
            return true;
        }

        return false;

    } catch (error) {
        console.error('Error handling tebakwarna answer:', error);
        return false;
    }
};

export const handleTebakkataAnswer = async (sock, m) => {
    try {
        if (!global.tebakkataGame || !global.tebakkataGame[m.chat]) {
            return false;
        }

        let room = global.tebakkataGame[m.chat];

        // Prevent race condition: Check if game has been running for at least 2 seconds
        const gameRunTime = Date.now() - room.startTime;
        if (gameRunTime < 2000) {
            console.log(`Game too fast, ignoring answer. Runtime: ${gameRunTime}ms`);
            return false;
        }

        // Atomic check: Ensure session still exists after time validation
        if (!global.tebakkataGame[m.chat]) {
            return false;
        }

        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();
        if (!text) return false;

        const isCorrect = text === room.jawaban.toLowerCase();

        if (isCorrect) {
            // Atomic operation: Mark as answered to prevent double processing
            if (room.answered) {
                return false; // Already answered
            }
            room.answered = true;

            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let reward = room.winScore + (timeBonus * 50);
            
            try {
                await User.addBalance(m.sender, reward, 'Tebakkata game win');
            } catch (error) {
                console.error('Error adding balance:', error);
            }

            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `🎯 *Petunjuk:* ${room.soal}\n`;
            correctMsg += `✅ *Jawaban:* ${room.jawaban}\n`;
            correctMsg += `💰 +Rp ${reward.toLocaleString('id-ID')}\n`;
            correctMsg += `⚡ Bonus waktu: +${timeBonus * 50} poin\n`;
            correctMsg += `🏆 Selamat @${m.sender.split('@')[0]}!`;

            if (room.messageId) {
                try {
                    await sock.sendMessage(m.chat, { 
                        delete: room.messageId 
                    });
                } catch (error) {
                    console.error('Error deleting question message:', error);
                }
            }

            await sock.sendMessage(m.chat, {
                text: correctMsg,
                mentions: [m.sender]
            }, { quoted: m });

            delete global.tebakkataGame[m.chat];
            return true;
        }

        return false;

    } catch (error) {
        console.error('Error handling tebakkata answer:', error);
        return false;
    }
};

export const handleTebakKalimatAnswer = async (sock, m) => {
    try {
        if (!global.tebakKalimatGame || !global.tebakKalimatGame[m.chat]) {
            return false;
        }

        let room = global.tebakKalimatGame[m.chat];

        // Prevent race condition: Check if game has been running for at least 2 seconds
        const gameRunTime = Date.now() - room.startTime;
        if (gameRunTime < 2000) {
            console.log(`Game too fast, ignoring answer. Runtime: ${gameRunTime}ms`);
            return false;
        }

        // Atomic check: Ensure session still exists after time validation
        if (!global.tebakKalimatGame[m.chat]) {
            return false;
        }

        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();
        if (!text) return false;

        const isCorrect = text === room.jawaban.toLowerCase();

        if (isCorrect) {
            // Atomic operation: Mark as answered to prevent double processing
            if (room.answered) {
                return false; // Already answered
            }
            room.answered = true;

            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let reward = room.winScore + (timeBonus * 50);
            
            try {
                await User.addBalance(m.sender, reward, 'TebakKalimat game win');
            } catch (error) {
                console.error('Error adding balance:', error);
            }

            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `✅ Jawaban: *${room.jawaban}*\n`;
            correctMsg += `💰 +Rp ${reward.toLocaleString('id-ID')}\n`;
            correctMsg += `⚡ Bonus waktu: +${timeBonus * 50} poin\n`;
            correctMsg += `🏆 Selamat @${m.sender.split('@')[0]}!`;

            if (room.messageId) {
                try {
                    await sock.sendMessage(m.chat, { 
                        delete: room.messageId 
                    });
                } catch (error) {
                    console.error('Error deleting question message:', error);
                }
            }

            await sock.sendMessage(m.chat, {
                text: correctMsg,
                mentions: [m.sender]
            }, { quoted: m });

            delete global.tebakKalimatGame[m.chat];
            return true;
        }

        return false;

    } catch (error) {
        console.error('Error handling tebakkalimat answer:', error);
        return false;
    }
};

export const handleSiapakahakuAnswer = async (sock, m) => {
    try {
        if (!global.siapakahakuGame || !global.siapakahakuGame[m.chat]) {
            return false;
        }

        let room = global.siapakahakuGame[m.chat];

        // Prevent race condition: Check if game has been running for at least 2 seconds
        const gameRunTime = Date.now() - room.startTime;
        if (gameRunTime < 2000) {
            console.log(`Game too fast, ignoring answer. Runtime: ${gameRunTime}ms`);
            return false;
        }

        // Atomic check: Ensure session still exists after time validation
        if (!global.siapakahakuGame[m.chat]) {
            return false;
        }

        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();
        if (!text) return false;

        const isCorrect = text === room.jawaban.toLowerCase();

        if (isCorrect) {
            // Atomic operation: Mark as answered to prevent double processing
            if (room.answered) {
                return false; // Already answered
            }
            room.answered = true;

            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let reward = room.winScore + (timeBonus * 50);
            
            try {
                await User.addBalance(m.sender, reward, 'Siapakahaku game win');
            } catch (error) {
                console.error('Error adding balance:', error);
            }

            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `✅ Jawaban: *${room.jawaban}*\n`;
            correctMsg += `💰 +Rp ${reward.toLocaleString('id-ID')}\n`;
            correctMsg += `⚡ Bonus waktu: +${timeBonus * 50} poin\n`;
            correctMsg += `🏆 Selamat @${m.sender.split('@')[0]}!`;

            if (room.messageId) {
                try {
                    await sock.sendMessage(m.chat, { 
                        delete: room.messageId 
                    });
                } catch (error) {
                    console.error('Error deleting question message:', error);
                }
            }

            await sock.sendMessage(m.chat, {
                text: correctMsg,
                mentions: [m.sender]
            }, { quoted: m });

            delete global.siapakahakuGame[m.chat];
            return true;
        }

        return false;

    } catch (error) {
        console.error('Error handling siapakahaku answer:', error);
        return false;
    }
};

export const handleSusunkataAnswer = async (sock, m) => {
    try {
        if (!global.susunkataGame || !global.susunkataGame[m.chat]) {
            return false;
        }

        let room = global.susunkataGame[m.chat];

        // Prevent race condition: Check if game has been running for at least 2 seconds
        const gameRunTime = Date.now() - room.startTime;
        if (gameRunTime < 2000) {
            console.log(`Game too fast, ignoring answer. Runtime: ${gameRunTime}ms`);
            return false;
        }

        // Atomic check: Ensure session still exists after time validation
        if (!global.susunkataGame[m.chat]) {
            return false;
        }

        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();
        if (!text) return false;

        const isCorrect = text === room.jawaban.toLowerCase();

        if (isCorrect) {
            // Atomic operation: Mark as answered to prevent double processing
            if (room.answered) {
                return false; // Already answered
            }
            room.answered = true;

            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let reward = room.winScore + (timeBonus * 50);
            
            try {
                await User.addBalance(m.sender, reward, 'Susunkata game win');
            } catch (error) {
                console.error('Error adding balance:', error);
            }

            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `🔤 *Soal:* ${room.soal}\n`;
            correctMsg += `✅ *Jawaban:* ${room.jawaban}\n`;
            correctMsg += `💰 +Rp ${reward.toLocaleString('id-ID')}\n`;
            correctMsg += `⚡ Bonus waktu: +${timeBonus * 50} poin\n`;
            correctMsg += `🏆 Selamat @${m.sender.split('@')[0]}!`;

            if (room.messageId) {
                try {
                    await sock.sendMessage(m.chat, { 
                        delete: room.messageId 
                    });
                } catch (error) {
                    console.error('Error deleting question message:', error);
                }
            }

            await sock.sendMessage(m.chat, {
                text: correctMsg,
                mentions: [m.sender]
            }, { quoted: m });

            delete global.susunkataGame[m.chat];
            return true;
        }

        return false;

    } catch (error) {
        console.error('Error handling susunkata answer:', error);
        return false;
    }
};

export const handleTebakkimiaAnswer = async (sock, m) => {
    try {
        if (!global.tebakkimiaGame || !global.tebakkimiaGame[m.chat]) {
            return false;
        }

        let room = global.tebakkimiaGame[m.chat];

        // Prevent race condition: Check if game has been running for at least 2 seconds
        const gameRunTime = Date.now() - room.startTime;
        if (gameRunTime < 2000) {
            console.log(`Game too fast, ignoring answer. Runtime: ${gameRunTime}ms`);
            return false;
        }

        // Atomic check: Ensure session still exists after time validation
        if (!global.tebakkimiaGame[m.chat]) {
            return false;
        }

        let text = '';
        if (m.message?.conversation) {
            text = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            text = m.message.extendedTextMessage.text;
        }

        text = text?.toLowerCase().trim();
        if (!text) return false;

        const isCorrect = text === room.jawaban.toLowerCase();

        if (isCorrect) {
            // Atomic operation: Mark as answered to prevent double processing
            if (room.answered) {
                return false; // Already answered
            }
            room.answered = true;

            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let reward = room.winScore + (timeBonus * 50);
            
            try {
                await User.addBalance(m.sender, reward, 'Tebakkimia game win');
            } catch (error) {
                console.error('Error adding balance:', error);
            }

            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `⚗️ *Unsur:* ${room.unsur}\n`;
            correctMsg += `✅ *Lambang:* ${room.jawaban.toUpperCase()}\n`;
            correctMsg += `💰 +Rp ${reward.toLocaleString('id-ID')}\n`;
            correctMsg += `⚡ Bonus waktu: +${timeBonus * 50} poin\n`;
            correctMsg += `🏆 Selamat @${m.sender.split('@')[0]}!`;

            if (room.messageId) {
                try {
                    await sock.sendMessage(m.chat, { 
                        delete: room.messageId 
                    });
                } catch (error) {
                    console.error('Error deleting question message:', error);
                }
            }

            await sock.sendMessage(m.chat, {
                text: correctMsg,
                mentions: [m.sender]
            }, { quoted: m });

            delete global.tebakkimiaGame[m.chat];
            return true;
        }

        return false;

    } catch (error) {
        console.error('Error handling tebakkimia answer:', error);
        return false;
    }
};

export const handleGameAnswers = async (sock, m) => {
    const handlers = [
        handleSinonimAnswer,
        handleCaklontongAnswer,
        handleFamily100Answer,
        handleCerdasCermatAnswer,
        handleTekatekiAnswer,
        handleAsahOtakAnswer,
        handleTebakWarnaAnswer,
        handleTebakkataAnswer,
        handleTebakKalimatAnswer,
        handleSiapakahakuAnswer,
        handleSusunkataAnswer,
        handleTebakkimiaAnswer
    ];

    for (const handler of handlers) {
        try {
            const handled = await handler(sock, m);
            if (handled) {
                return true;
            }
        } catch (error) {
            console.error(`Error in game handler:`, error);
        }
    }

    return false;
};

export async function handleGameMessage(sock, m) {
    try {
        return await handleGameAnswers(sock, m);
    } catch (error) {
        console.error('Error handling game message:', error);
        return false;
    }
}