import Database from '../helper/database.js';

export const handler = {
    command: ['antonim'],
    category: 'game',
    help: 'Game Tebak Antonim Kata',
    desc: 'Game tebak antonim kata - Tebak kata-kata yang memiliki arti berlawanan!\n\nFormat: !antonim',
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
            if (global.antonimGame && global.antonimGame[id]) {
                return await m.reply('🎮 Masih ada sesi game yang belum diselesaikan!');
            }

            // Initialize global game object if not exists
            if (!global.antonimGame) {
                global.antonimGame = {};
            }

            // Database antonim kata
            const antonimData = [
                {
                    kata: "BESAR",
                    antonim: ["KECIL", "MUNGIL", "MINI", "CILIK", "IMUT"]
                },
                {
                    kata: "TINGGI",
                    antonim: ["RENDAH", "PENDEK", "DANGKAL", "LANDAI", "BAWAH"]
                },
                {
                    kata: "CEPAT",
                    antonim: ["LAMBAT", "PELAN", "LELET", "SANTAI", "LEMOT"]
                },
                {
                    kata: "PANAS",
                    antonim: ["DINGIN", "SEJUK", "ADEM", "BEKU", "ES"]
                },
                {
                    kata: "TERANG",
                    antonim: ["GELAP", "REMANG", "SURAM", "KELAM", "REDUP"]
                },
                {
                    kata: "KAYA",
                    antonim: ["MISKIN", "MELARAT", "PAPA", "SENGSARA", "FAKIR"]
                },
                {
                    kata: "BAIK",
                    antonim: ["BURUK", "JAHAT", "JELEK", "RUSAK", "BUSUK"]
                },
                {
                    kata: "SENANG",
                    antonim: ["SEDIH", "MURUNG", "DUKA", "PILU", "NESTAPA"]
                },
                {
                    kata: "KERAS",
                    antonim: ["LEMBUT", "LUNAK", "EMPUK", "HALUS", "LENTUR"]
                },
                {
                    kata: "BERAT",
                    antonim: ["RINGAN", "ENTENG", "MUDAH", "GAMPANG", "SIMPLE"]
                },
                {
                    kata: "TUA",
                    antonim: ["MUDA", "BELIA", "REMAJA", "JUNIOR", "BARU"]
                },
                {
                    kata: "LAMA",
                    antonim: ["BARU", "SEGAR", "MODERN", "TERKINI", "MUTAKHIR"]
                },
                {
                    kata: "ATAS",
                    antonim: ["BAWAH", "DASAR", "LANTAI", "ALAS", "FONDASI"]
                },
                {
                    kata: "DEPAN",
                    antonim: ["BELAKANG", "PUNGGUNG", "EKOR", "BUNTUT", "POSTERIOR"]
                },
                {
                    kata: "KANAN",
                    antonim: ["KIRI", "SEBELAH KIRI", "SISI KIRI", "BAGIAN KIRI", "ARAH KIRI"]
                },
                {
                    kata: "DALAM",
                    antonim: ["LUAR", "DANGKAL", "PERMUKAAN", "KULIT", "CETEK"]
                },
                {
                    kata: "BASAH",
                    antonim: ["KERING", "GERSANG", "TANDUS", "ARID", "KEKERINGAN"]
                },
                {
                    kata: "KOTOR",
                    antonim: ["BERSIH", "SUCI", "MURNI", "STERIL", "HIGIENIS"]
                },
                {
                    kata: "RAMAI",
                    antonim: ["SEPI", "SUNYI", "LENGANG", "SENYAP", "HENING"]
                },
                {
                    kata: "PENUH",
                    antonim: ["KOSONG", "HAMPA", "LOWONG", "VAKUM", "NIHIL"]
                },
                {
                    kata: "KUAT",
                    antonim: ["LEMAH", "RAPUH", "RINGKIH", "LEMAS", "LOYO"]
                },
                {
                    kata: "BERANI",
                    antonim: ["TAKUT", "PENGECUT", "CIUT", "GENTAR", "NGERI"]
                },
                {
                    kata: "JUJUR",
                    antonim: ["BOHONG", "DUSTA", "CURANG", "PALSU", "MUNAFIK"]
                },
                {
                    kata: "RAJIN",
                    antonim: ["MALAS", "PEMALAS", "LAMBAN", "OGAH", "ENGGAN"]
                },
                {
                    kata: "PANDAI",
                    antonim: ["BODOH", "DUNGU", "TOLOL", "BEBAL", "BEGO"]
                },
                {
                    kata: "CANTIK",
                    antonim: ["JELEK", "BURUK", "BUSUK", "TIDAK MENARIK", "CULUN"]
                },
                {
                    kata: "GEMUK",
                    antonim: ["KURUS", "LANGSING", "RAMPING", "CEKING", "KEREMPENG"]
                },
                {
                    kata: "MANIS",
                    antonim: ["PAHIT", "GETIR", "SEPET", "KELAT", "MASAM"]
                },
                {
                    kata: "AWAL",
                    antonim: ["AKHIR", "UJUNG", "FINAL", "TAMAT", "SELESAI"]
                },
                {
                    kata: "HIDUP",
                    antonim: ["MATI", "WAFAT", "MENINGGAL", "TEWAS", "GUGUR"]
                },
                {
                    kata: "MENANG",
                    antonim: ["KALAH", "GAGAL", "TUMBANG", "TAKLUK", "MENYERAH"]
                },
                {
                    kata: "NAIK",
                    antonim: ["TURUN", "JATUH", "MEROSOT", "ANJLOK", "TERJUN"]
                },
                {
                    kata: "BUKA",
                    antonim: ["TUTUP", "KUNCI", "SEGEL", "RAPATKAN", "GEMBOK"]
                },
                {
                    kata: "MASUK",
                    antonim: ["KELUAR", "PERGI", "CABUT", "ANGKAT KAKI", "MINGGAT"]
                },
                {
                    kata: "DATANG",
                    antonim: ["PERGI", "BERANGKAT", "PULANG", "CABUT", "TINGGALKAN"]
                },
                {
                    kata: "SIANG",
                    antonim: ["MALAM", "PETANG", "SORE", "GELAP", "MAGRIB"]
                },
                {
                    kata: "PAGI",
                    antonim: ["SORE", "PETANG", "MALAM", "MAGRIB", "SENJA"]
                },
                {
                    kata: "LEBAR",
                    antonim: ["SEMPIT", "SESAK", "CIUT", "KECIL", "PICIK"]
                },
                {
                    kata: "PANJANG",
                    antonim: ["PENDEK", "SINGKAT", "CEBOL", "KERDIL", "KUNTET"]
                },
                {
                    kata: "TEBAL",
                    antonim: ["TIPIS", "GEPENG", "PIPIH", "RATA", "DATAR"]
                },
                {
                    kata: "KASAR",
                    antonim: ["HALUS", "LEMBUT", "MULUS", "LICIN", "RATA"]
                },
                {
                    kata: "TAJAM",
                    antonim: ["TUMPUL", "MAJAL", "BUNTU", "UMPIL", "BODOH"]
                },
                {
                    kata: "MAHAL",
                    antonim: ["MURAH", "TERJANGKAU", "EKONOMIS", "HEMAT", "GRATIS"]
                },
                {
                    kata: "SUKA",
                    antonim: ["BENCI", "TIDAK SUKA", "MUAK", "JIJIK", "ENGGAN"]
                },
                {
                    kata: "CINTA",
                    antonim: ["BENCI", "DENGKI", "IRI", "DENDAM", "MURKA"]
                },
                {
                    kata: "DAMAI",
                    antonim: ["PERANG", "KONFLIK", "RIBUT", "GADUH", "RUSUH"]
                },
                {
                    kata: "AMAN",
                    antonim: ["BAHAYA", "BERBAHAYA", "RISKAN", "GAWAT", "KRITIS"]
                },
                {
                    kata: "SEHAT",
                    antonim: ["SAKIT", "TIDAK SEHAT", "LEMAH", "LEMAS", "LOYO"]
                },
                {
                    kata: "LURUS",
                    antonim: ["BENGKOK", "BELOK", "MELENGKUNG", "BERKELOK", "ZIGZAG"]
                }
            ];

            // Pick random question
            let randomQuestion = antonimData[Math.floor(Math.random() * antonimData.length)];

            let gameText = `🎯 *GAME TEBAK ANTONIM* 🎯\n\n`;
            gameText += `📝 *Kata Utama:* ${randomQuestion.kata}\n\n`;
            gameText += `🎁 *Hadiah:* ${winScore.toLocaleString('id-ID')} money\n`;
            gameText += `⏰ *Waktu:* 60 detik\n\n`;
            gameText += `🔍 Terdapat *${randomQuestion.antonim.length}* antonim yang harus ditebak!\n`;
            gameText += `${randomQuestion.antonim.find(v => v.includes(" ")) ? `💡 *(beberapa jawaban terdapat spasi)*` : ""}\n\n`;
            gameText += `💬 Ketik jawaban langsung di chat!`;

            // Store game data
            global.antonimGame[id] = {
                id,
                kata: randomQuestion.kata,
                antonim: randomQuestion.antonim,
                terjawab: Array.from(randomQuestion.antonim, () => false),
                winScore,
                startTime: Date.now()
            };

            await m.reply(gameText);

            // Set 60 second timer
            setTimeout(async () => {
                if (global.antonimGame && global.antonimGame[id]) {
                    let room = global.antonimGame[id];

                    // Get users who answered correctly
                    let correctAnswerers = room.terjawab.filter(v => v && v !== false);
                    let uniqueAnswerers = [...new Set(correctAnswerers)];

                    let timeoutCaption = `⏰ *GAME ANTONIM - WAKTU HABIS!*\n\n`;
                    timeoutCaption += `📝 *Kata Utama:* ${room.kata}\n\n`;
                    timeoutCaption += `✅ *ANTONIM YANG BENAR:*\n`;
                    timeoutCaption += room.antonim.map((antonim, index) => {
                        if (room.terjawab[index]) {
                            return `${index + 1}. ${antonim} ✓ @${room.terjawab[index].split("@")[0]}`;
                        } else {
                            return `${index + 1}. ${antonim}`;
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

                    delete global.antonimGame[id];
                }
            }, 90000); // 90 seconds

        } catch (error) {
            console.error('Error in antonim game:', error);
            await m.reply('❌ Terjadi kesalahan saat memulai game. Coba lagi!');
        }
    }
};

export default handler;
