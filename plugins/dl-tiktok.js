import axios from 'axios';

export const handler = {
    command: ['tt'],
    help: 'Download video TikTok',
    category: 'downloader',
    
    async exec({ m, args, sock }) {
        try {
            let url = args;
            let isAudioOnly = false;
            
            // Cek flag --audio
            if (typeof args === 'string') {
                if (args.includes('--audio')) {
                    isAudioOnly = true;
                    url = args.replace('--audio', '').trim();
                }
            } else if (Array.isArray(args)) {
                if (args.includes('--audio')) {
                    isAudioOnly = true;
                    url = args.filter(arg => arg !== '--audio').join(' ');
                }
            }
            
            // Jika tidak ada URL tapi ada reply
            if (!url && m.quoted) {
                url = m.quoted.text || m.quoted.message?.conversation || '';
            }
            
            // Validasi input
            if (!url) {
                await m.reply(`📱 *TIKTOK DOWNLOADER*\n\nCara penggunaan:\n1. !tiktok <url>\n2. Reply pesan dengan !tiktok\n\nFlag:\n--audio : Download audio saja\n\nContoh:\n!tiktok https://www.tiktok.com/@user/video/1234567890\n!tiktok --audio https://www.tiktok.com/@user/video/1234567890`);
                return;
            }
            
            // Validasi URL
            if (!url.includes('tiktok.com')) {
                await m.reply('❌ URL tidak valid! URL harus dari TikTok.');
                return;
            }
            
            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });
            
            // Proses download menggunakan TikWM API
            const encodedUrl = encodeURIComponent(url);
            const apiUrl = `https://tikwm.com/api/?url=${encodedUrl}`;
            const response = await axios.get(apiUrl);
            
            if (response.data.code !== 0) {
                throw new Error(response.data.msg || 'Gagal mendapatkan video TikTok');
            }
            
            const result = response.data;
            
            // Format caption
            let caption = `📱 *TIKTOK DOWNLOADER*\n\n` +
                         `*Author:* ${result.data.author.nickname}\n` +
                         `*Username:* @${result.data.author.unique_id}\n` +
                         `*Caption:* ${result.data.title}\n\n`;
            
            if (isAudioOnly) {
                // Download audio saja
                if (result.data.music) {
                    await sock.sendMessage(m.chat, {
                        audio: { url: result.data.music },
                        mimetype: 'audio/mpeg',
                        caption: caption
                    });
                } else {
                    throw new Error('Audio tidak tersedia');
                }
            } else {
                // Download video
                if (result.data.play) {
                    await sock.sendMessage(m.chat, {
                        video: { url: result.data.play },
                        caption: caption,
                        thumbnail: result.data.cover
                    });
                } else {
                    throw new Error('Video tidak tersedia');
                }
            }
            
            // Tambahkan reaksi sukses
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });
            
        } catch (error) {
            console.error('Error in tiktok command:', error);
            await m.reply(`❌ Error: ${error.message}`);
            
            // Tambahkan reaksi error
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
        }
    }
};