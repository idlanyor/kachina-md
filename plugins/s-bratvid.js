import axios from 'axios'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

export const handler = {
    command: ['bratvid', 'bratanimated'],
    category: 'sticker',
    help: 'Generate animated Brat-style GIF',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, args }) => {
        try {
            if (!args) {
                await m.reply('📋 Format:\n!bratvid <text>\n\nContoh: !bratvid hello world')
                return
            }

            // Add waiting reaction
            await sock.sendMessage(m.chat, {
                react: { text: '🎨', key: m.key }
            })

            // Generate animated Brat GIF using Ryzumi API
            const text = encodeURIComponent(args)
            const apiUrl = `https://api.ryzumi.vip/api/image/brat/animated?text=${text}`
            
            const response = await axios.get(apiUrl, {
                headers: {
                    'accept': 'image/gif',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                responseType: 'arraybuffer'
            })
            
            if (!response.data) {
                throw new Error('Failed to generate animated Brat GIF')
            }

            // Create sticker from GIF using wa-sticker-formatter
            const sticker = new Sticker(Buffer.from(response.data), {
                pack: 'Animated Brat Generator',
                author: 'KachinaBot',
                type: StickerTypes.FULL,
                categories: ['🎬'],
                id: 'bratvid',
                quality: 80,
            })

            const stickerBuffer = await sticker.toBuffer()

            // Send sticker to user
            await sock.sendMessage(m.chat, {
                sticker: stickerBuffer
            }, { quoted: m })

            // Add success reaction
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            })

        } catch (error) {
            console.error('Error in bratvid:', error)
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            })
            
            let errorMessage = '❌ Gagal membuat animated Brat GIF.'
            
            if (error.response?.status === 400) {
                errorMessage += ' Text terlalu panjang atau mengandung karakter tidak valid.'
            } else if (error.response?.status === 429) {
                errorMessage += ' Terlalu banyak request, coba lagi nanti.'
            } else if (error.response?.status >= 500) {
                errorMessage += ' Server sedang bermasalah, coba lagi nanti.'
            } else {
                errorMessage += ` Error: ${error.message}`
            }
            
            await m.reply(errorMessage)
        }
    }
}

export default handler