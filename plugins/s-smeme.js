import axios from 'axios'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

export const handler = {
    command: ['smeme'],
    category: 'sticker',
    help: 'Buat sticker meme dari gambar.',
    exec: async ({ sock, m, args }) => {
        try {
            let text = Array.isArray(args) ? args.join(' ').trim() : (args || '').trim()
            if (!text) {
                await m.reply('Masukkan teks: .smeme <bawah> atau .smeme <atas>.<bawah>')
                return
            }

            let topText = ''
            let bottomText = ''
            if (text.includes('.')) {
                const [t, b] = text.split('.', 2)
                topText = (t || '').trim()
                bottomText = (b || '').trim()
            } else {
                bottomText = text
            }

            let buffer = null
            let fileName = 'image'
            let messageRef = m
            if (m.quoted) messageRef = m.quoted

            const refMsg = messageRef.message || {}
            const refType = Object.keys(refMsg)[0]

            if (refType === 'imageMessage' || refType === 'stickerMessage') {
                buffer = await messageRef.download()
                fileName = refMsg[refType].fileName || fileName
            } else if (m.message?.imageMessage) {
                buffer = await m.download()
                fileName = m.message.imageMessage.fileName || fileName
            } else {
                await m.reply('❌ Reply/kirim gambar dengan caption .smeme <teks>')
                return
            }

            await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            if (!buffer) {
                await m.reply('❌ Gagal mengambil gambar!')
                return
            }

            const type = await fileTypeFromBuffer(buffer)
            const ext = type?.ext || 'png'
            const mime = type?.mime || 'image/png'

            const form = new FormData()
            form.append('file', buffer, { filename: `${fileName}.${ext}`, contentType: mime })
            form.append('folder', 'documents/2024')

            const uploadRes = await axios.post('https://s3.antidonasi.web.id/upload', form, {
                headers: {
                    ...form.getHeaders()
                },
                timeout: 120000
            })

            if (!uploadRes?.data?.success || !uploadRes?.data?.data?.fileUrl) {
                throw new Error('Upload gagal atau response tidak valid')
            }

            const imageUrl = uploadRes.data.data.fileUrl

            const apiUrl = `https://api.nekolabs.web.id/canvas/meme?imageUrl=${encodeURIComponent(imageUrl)}&textT=${encodeURIComponent(topText)}&textB=${encodeURIComponent(bottomText)}`
            const { data } = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'accept': 'image/png,image/jpeg',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 120000
            })

            const sticker = new Sticker(Buffer.from(data), {
                pack: 'Meme',
                author: 'KachinaBot',
                type: StickerTypes.FULL,
                categories: ['😂'],
                id: 'smeme',
                quality: 80,
            })

            const stickerBuffer = await sticker.toBuffer()

            await sock.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })
            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (error) {
            console.error('Error in smeme:', error)
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
            await m.reply('❌ Gagal membuat meme: ' + (error?.message || 'Unknown error'))
        }
    }
}

export default handler

