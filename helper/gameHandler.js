// Handler untuk menjawab game sinonim
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

        if (isCorrect) {
            // Mark as answered
            room.terjawab[answerIndex] = m.sender;
            
            // Calculate points based on difficulty and speed
            let timeBonus = Math.max(0, 60 - Math.floor((Date.now() - room.startTime) / 1000));
            let points = Math.floor(room.winScore / room.jawaban.length) + (timeBonus * 20);
            
            // Add money to user (implement your database logic here)
            // await Database.addMoney(m.sender, points);
            
            let correctMsg = `🎉 *JAWABAN BENAR!*\n\n`;
            correctMsg += `✅ *${room.jawaban[answerIndex]}* adalah jawaban yang tepat!\n`;
            correctMsg += `💰 +${points.toLocaleString('id-ID')} money\n`;
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

// Handler untuk game lainnya bisa ditambahkan di sini
export const handleGameAnswers = async (sock, m) => {
    // Check sinonim game
    const sinonimHandled = await handleSinonimAnswer(sock, m);
    if (sinonimHandled) return true;
    
    // Check caklontong game
    const caklontongHandled = await handleCaklontongAnswer(sock, m);
    if (caklontongHandled) return true;
    
    // Check family100 game
    const family100Handled = await handleFamily100Answer(sock, m);
    if (family100Handled) return true;
    
    // Tambahkan handler game lain di sini jika diperlukan
    
    return false;
};