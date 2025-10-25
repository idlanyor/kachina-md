import { downloadMediaMessage } from 'baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

export const handler = {
    command: ['swm'],
    category: 'sticker',
    help: 'Ubah watermark stiker',
    exec: async ({ sock, m, args }) => {
        try {
            // Pastikan ada argumen
            let text = Array.isArray(args) ? args.join(' ').trim() : (args || '').trim()
            if (!text) {
                await m.reply('Masukkan format: .swm <pack> atau .swm <pack>.<author>')
                return
            }

            // Ambil pesan yang berisi stiker (reply atau pesan itu sendiri)
            let quotedMsg
            if (m.quoted) {
                quotedMsg = m.quoted
            } else if (m.message?.stickerMessage) {
                quotedMsg = m
            } else {
                await m.reply('❌ Reply stiker yang ingin diubah watermark-nya!')
                return
            }

            // Validasi stiker
            if (!quotedMsg.message?.stickerMessage) {
                await m.reply('❌ Pesan yang di-reply bukan stiker!')
                return
            }

            // Parse pack & author
            let pack = text
            let author = (m.pushName || globalThis.botName || 'Kachina-MD')
            if (text.includes('.')) {
                const [p, a] = text.split('.', 2)
                pack = (p || '').trim() || pack
                author = (a || '').trim() || author
            }

            // Reaksi proses
            await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            // Unduh buffer stiker asli
            const buffer = await downloadMediaMessage(
                quotedMsg,
                'buffer',
                {},
                { logger: console }
            )

            // Info stiker
            const stickerInfo = quotedMsg.message.stickerMessage
            const isAnimated = stickerInfo.isAnimated || false

            // Buat stiker baru dengan pack/author yang diinginkan
            const sticker = new Sticker(buffer, {
                pack,
                author,
                type: StickerTypes.FULL,
                categories: ['✨'],
                id: 'swm',
                quality: 80,
            })

            const stickerBuffer = await sticker.toBuffer()

            // Kirim stiker hasil
            await sock.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })

            // Reaksi sukses (tandai jika animasi agar user tahu)
            const statusEmoji = isAnimated ? '✅' : '✅'
            await sock.sendMessage(m.chat, { react: { text: statusEmoji, key: m.key } })

        } catch (error) {
            console.error('Error in swm:', error)
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
            await m.reply('❌ Gagal mengubah watermark stiker: ' + (error?.message || 'Unknown error'))
        }
    }
}

export default handler

