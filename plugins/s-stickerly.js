import StickerLy from '../helper/stickerly.js';
import { createSticker, StickerTypes } from 'wa-sticker-formatter';
import axios from 'axios';

const stickerly = new StickerLy();

export const handler = {
    command: ['stickerly', 'stickerlyget', 'getsticker'],
    category: 'sticker',
    help: 'Cari dan download sticker pack dari Sticker.ly',
    exec: async ({ sock, m, args, usedPrefix }) => {
        try {
            if (!args) {
                await m.reply(`🎨 *STICKER.LY*

*Penggunaan:*
${usedPrefix}stickerly <query> - Cari sticker pack
${usedPrefix}stickerly <url> - Download sticker pack

*Contoh:*
${usedPrefix}stickerly anime
${usedPrefix}stickerly https://sticker.ly/s/XXXXXX`);
                return;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '🔍', key: m.key }
            });

            if (args.includes('sticker.ly/s/')) {
                await m.reply('⏳ Mengambil sticker pack...');
                
                const pack = await stickerly.detail(args.trim());
                
                let text = `🎨 *${pack.name}*\n`;
                text += `👤 Author: ${pack.author.name} (@${pack.author.username})\n`;
                text += `📊 ${pack.stickerCount} stickers | 👁️ ${pack.viewCount} views\n`;
                text += `📤 ${pack.exportCount} exports\n`;
                text += `${pack.isAnimated ? '🎬 Animated' : '🖼️ Static'}\n`;
                text += `━━━━━━━━━━━━━━━\n`;

                await m.reply(text);

                // Download stickers (max 30, raw buffers)
                const stickersToDownload = pack.stickers.slice(0, 30);
                const downloadedStickers = [];

                await m.reply(`⏳ Downloading ${stickersToDownload.length} stickers...`);

                for (const stck of stickersToDownload) {
                    try {
                        const { data: imgBuffer } = await axios.get(stck.imageUrl, { responseType: 'arraybuffer' });
                        downloadedStickers.push(Buffer.from(imgBuffer));
                    } catch (e) {
                        console.error('Failed to download sticker:', e.message);
                    }
                }

                if (downloadedStickers.length === 0) {
                    await m.reply('❌ Gagal download sticker');
                    return;
                }

                // Send individual stickers (max 15)
                const maxStickers = Math.min(downloadedStickers.length, 15);
                await m.reply(`⏳ Mengirim ${maxStickers} sticker...`);
                
                for (let i = 0; i < maxStickers; i++) {
                    try {
                        const sticker = await createSticker(downloadedStickers[i], {
                            pack: pack.name,
                            author: pack.author.name,
                            quality: 80,
                            type: StickerTypes.FULL
                        });
                        await sock.sendMessage(m.chat, { sticker }, { quoted: m });
                    } catch (err) {
                        console.error('Failed to send sticker:', err.message);
                    }
                }

                await sock.sendMessage(m.chat, {
                    react: { text: '✅', key: m.key }
                });

            } else {
                const results = await stickerly.search(args.trim());

                if (!results || results.length === 0) {
                    await m.reply(`❌ Tidak ditemukan sticker pack untuk "${args}"`);
                    await sock.sendMessage(m.chat, {
                        react: { text: '❌', key: m.key }
                    });
                    return;
                }

                let text = `🎨 *STICKER.LY SEARCH*\n`;
                text += `🔍 Query: ${args}\n`;
                text += `📊 Ditemukan ${results.length} pack\n`;
                text += `━━━━━━━━━━━━━━━\n\n`;

                results.slice(0, 10).forEach((pack, i) => {
                    text += `*${i + 1}. ${pack.name}*\n`;
                    text += `👤 ${pack.author}\n`;
                    text += `📊 ${pack.stickerCount} stickers | 👁️ ${pack.viewCount} views\n`;
                    text += `${pack.isAnimated ? '🎬 Animated' : '🖼️ Static'}${pack.isPaid ? ' | 💰 Paid' : ''}\n`;
                    text += `🔗 ${pack.url}\n\n`;
                });

                text += `_Gunakan ${usedPrefix}stickerly <url> untuk download_`;

                await m.reply(text);

                await sock.sendMessage(m.chat, {
                    react: { text: '✅', key: m.key }
                });
            }

        } catch (error) {
            console.error('Error in stickerly:', error);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            await m.reply('❌ Gagal: ' + error.message);
        }
    }
};

export default handler;
