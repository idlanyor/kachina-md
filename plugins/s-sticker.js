import { createSticker, StickerTypes } from "wa-sticker-formatter"
import { fileTypeFromBuffer } from 'file-type'

export const handler = {
    command: ['sticker', 's'],
    category: 'sticker',
    help: 'Membuat sticker dari gambar/video',
    exec: async ({ sock, m }) => {
        try {
            let buffer = null;

            const qType = m.quoted ? (typeof m.quoted.type === 'object' ? m.quoted.type.type : m.quoted.type) : null
            const mType = typeof m.type === 'object' ? m.type.type : m.type

            if (m.quoted) {
                if (/image|video|sticker|viewOnce/.test(qType)) {
                    buffer = await m.quoted.download();
                }
            } else if (/image|video|sticker|viewOnce/.test(mType)) {
                buffer = await m.download();
            }

            if (!buffer) {
                await sock.sendMessage(m.chat, { text: '❌ Reply gambar/video untuk dijadikan sticker' }, { quoted: m });
                return;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            const type = await fileTypeFromBuffer(buffer);
            const isAnimated = type?.mime?.startsWith('video') || type?.mime?.includes('gif');

            let stickerOptions = {
                pack: 'Kachina Bot',
                author: 'V2',
                quality: isAnimated ? 30 : 100,
                type: StickerTypes.FULL
            }

            const sticker = await createSticker(buffer, stickerOptions);

            await sock.sendMessage(m.chat, { sticker }, { quoted: m });

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in sticker:', error);
            await sock.sendMessage(m.chat, { text: '❌ Gagal membuat sticker' }, { quoted: m });
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
        }
    }
}

export default handler