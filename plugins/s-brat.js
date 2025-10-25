import axios from 'axios'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

export const handler = {
    command: ['brat'],
    category:'sticker',
    help: 'Generate gambar/brat text',
    exec: async ({ sock, m, args }) => {
        try {
            if (!args || args.length === 0) {
                await m.reply('Masukkan text untuk brat.\nContoh: !brat hello world');
                return;
            }

            // Get text from args
            let text = Array.isArray(args) ? args.join(' ') : args;
            
            if (!text) {
                await m.reply('Masukkan text untuk brat.\nContoh: !brat hello world');
                return;
            }

            // Kirim reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '🎨', key: m.key }
            });

            // Request ke Ryzumi API
            const apiUrl = `https://api.ryzumi.vip/api/image/brat?text=${encodeURIComponent(text)}`;
            const { data } = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                headers: { 
                    'accept': 'image/png',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // Buat stiker dari gambar
            const sticker = new Sticker(Buffer.from(data), {
                pack: 'Brat Generator',
                author: 'KachinaBot',
                type: StickerTypes.FULL,
                categories: ['✨'],
                id: 'brat',
                quality: 80,
            });
            
            const stickerBuffer = await sticker.toBuffer();
            
            // Kirim stiker ke user
            await sock.sendMessage(m.chat, {
                sticker: stickerBuffer
            }, { quoted: m });
            
            // Kirim reaksi sukses
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });
            
        } catch (error) {
            console.error('Error in brat:', error);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            await m.reply('❌ Gagal generate brat. Pastikan text valid dan coba lagi.');
        }
    }
}

export default handler;