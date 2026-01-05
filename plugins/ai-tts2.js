import axios from 'axios';
import fs from 'fs';
import path from 'path';

export const handler = {
    command: ['tts2'],
    category: 'ai',
    help: 'AI Text-to-speech dengan berbagai voice options',
    exec: async ({ m, args, sock }) => {
        try {
            let text = args;
            let voice = 'Kore'; // Default voice

            // Parse arguments untuk mendapatkan text dan voice option
            if (args) {
                // Cek apakah ada parameter voice
                const voiceMatch = args.match(/--voice=(\w+)/);
                if (voiceMatch) {
                    voice = voiceMatch[1];
                    // Hapus parameter voice dari text
                    text = args.replace(/--voice=\w+/, '').trim();
                }
            }

            // Jika tidak ada text tapi ada reply
            if (!text && m.quoted) {
                text = m.quoted.text || m.quoted.message?.conversation || '';
            }

            // Validasi input
            if (!text) {
                const voiceList = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Aoede', 'Fenrir'];
                await m.reply(`🔊 *TEXT TO SPEECH TTS2*\n\nCara penggunaan:\n1. .tts2 <teks> --voice=<nama_voice>\n2. Reply pesan dengan .tts2 --voice=<nama_voice>\n\nVoice yang tersedia:\n${voiceList.map(v => `• ${v}`).join('\n')}\n\nContoh:\n.tts2 Halo, apa kabar? --voice=Kore\n.tts2 Pembukaan UUD 1945 adalah bagian awal --voice=Zephyr\n\n💡 Tips:\n• Pilih voice yang sesuai dengan kebutuhan\n• Text yang lebih panjang akan memakan waktu lebih lama\n• Default voice: Kore\n\n_Powered by Gemini TTS_`);
                return;
            }

            // Validasi voice options
            const validVoices = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Aoede', 'Fenrir'];
            if (!validVoices.includes(voice)) {
                await m.reply(`❌ Voice "${voice}" tidak valid!\n\nVoice yang tersedia:\n${validVoices.map(v => `• ${v}`).join('\n')}\n\nContoh penggunaan:\n.tts2 Halo --voice=Kore`);
                return;
            }

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Kirim pesan proses
            await m.reply(`🔄 Sedang mengkonversi text ke speech dengan voice "${voice}"... Mohon tunggu sebentar`);

            // Encode text untuk URL
            const encodedText = encodeURIComponent(text);
            
            // Call TTS API
            const apiUrl = `https://aduhai.kanata.web.id/api/ai/tts?text=${encodedText}&voice=${voice}`;
            const response = await axios.get(apiUrl, {
                timeout: 120000 // 2 menit timeout
            });

            // Validasi response
            if (!response.data || response.data.status !== 'success') {
                throw new Error('Server tidak mengembalikan hasil yang valid');
            }

            // Download audio file
            const audioFile = response.data.audioFiles[0];
            if (!audioFile || !audioFile.filePath) {
                throw new Error('Tidak ada file audio yang diterima');
            }

            const audioResponse = await axios.get(audioFile.filePath, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            // Check if response is audio data
            if (audioResponse.data && audioResponse.data.byteLength > 0) {
                // Simpan audio ke file temporary
                const tempDir = path.join(process.cwd(), 'temp');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                
                const tempFile = path.join(tempDir, `tts2_${Date.now()}.mp3`);
                await fs.promises.writeFile(tempFile, Buffer.from(audioResponse.data));

                // Send audio file
                await sock.sendMessage(m.chat, {
                    audio: fs.readFileSync(tempFile),
                    mimetype: 'audio/mpeg',
                    ptt: false,
                    contextInfo: {
                        externalAdReply: {
                            title: '🔊 Text to Speech TTS2',
                            body: `Voice: ${voice} | Provider: ${response.data.provider}`,
                            thumbnailUrl: `${globalThis.ppUrl}`,
                            sourceUrl: `${globalThis.newsletterUrl}`,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m });

                // Tambahkan reaksi sukses
                await sock.sendMessage(m.chat, {
                    react: { text: '✅', key: m.key }
                });

                // Hapus file temporary setelah 1 menit
                setTimeout(() => {
                    try {
                        fs.unlinkSync(tempFile);
                    } catch (err) {
                        console.error('Error deleting temp file:', err);
                    }
                }, 60000);
            } else {
                throw new Error('Tidak ada data audio yang diterima');
            }

        } catch (error) {
            console.error('Error in tts2 command:', error);

            // Tambahkan reaksi error
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });

            let errorMessage = '❌ Gagal melakukan text-to-speech!';

            if (error.message.includes('Server tidak mengembalikan hasil yang valid')) {
                errorMessage += '\n\n*Penyebab:* API gagal memproses text. Coba lagi nanti.';
            } else if (error.message.includes('Tidak ada file audio yang diterima')) {
                errorMessage += '\n\n*Penyebab:* Server tidak mengembalikan file audio yang valid.';
            } else if (error.message.includes('Tidak ada data audio yang diterima')) {
                errorMessage += '\n\n*Penyebab:* Tidak dapat mengunduh hasil audio.';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server API tidak dapat diakses.';
            } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                errorMessage = '⏱️ Proses timeout!\n\n*Penyebab:* Server membutuhkan waktu terlalu lama. Coba lagi dengan text yang lebih pendek.';
            } else if (error.response?.status === 400) {
                errorMessage += '\n\n*Penyebab:* Text tidak valid atau terlalu panjang.';
            } else if (error.response?.status === 429) {
                errorMessage += '\n\n*Penyebab:* Terlalu banyak request, coba lagi nanti.';
            } else if (error.response?.status === 500) {
                errorMessage += '\n\n*Penyebab:* Server mengalami error internal. Coba lagi nanti.';
            } else {
                errorMessage += `\n\n*Error:* ${error.message}`;
            }

            await m.reply(errorMessage);
        }
    }
};

export default handler;