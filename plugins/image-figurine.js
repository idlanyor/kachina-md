import axios from 'axios'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'

export const handler = {
    command: ['figurine'],
    category: 'image',
    help: 'Ubah gambar menjadi gaya figurine.\n\nCara pakai:\n- Reply gambar dengan .figurine\n- Atau .figurine <image_url>',
    exec: async ({ sock, m, args }) => {
        try {
            await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            // Ambil URL dari argumen jika ada
            let imageUrl = ''
            let hasArgUrl = false
            if (Array.isArray(args) && args.length > 0) {
                const a = args.join(' ').trim()
                if (/^https?:\/\//i.test(a)) {
                    imageUrl = a
                    hasArgUrl = true
                }
            }

            // Jika tidak ada URL argumen, coba ambil media dari reply/kirim
            if (!hasArgUrl) {
                let ref = m
                if (m.quoted) ref = m.quoted
                const refMsg = ref.message || {}
                const refType = Object.keys(refMsg)[0]

                const allowed = ['imageMessage', 'stickerMessage']
                if (!allowed.includes(refType)) {
                    await m.reply('❌ Reply/kirim gambar (atau stiker) dengan caption .figurine, atau berikan URL gambar')
                    return
                }

                const buffer = await ref.download()
                if (!buffer) {
                    await m.reply('❌ Gagal mengunduh media')
                    return
                }

                // Upload ke ryzencdn untuk mendapatkan URL
                const type = await fileTypeFromBuffer(buffer)
                const ext = type?.ext || 'png'
                const mime = type?.mime || 'image/png'
                let base = 'image'
                try {
                    const meta = refMsg[refType]
                    base = meta?.fileName?.split('.')?.[0] || meta?.mimetype?.split('/')?.[0] || base
                } catch { }

                const form = new FormData()
                form.append('file', buffer, { filename: `${base}.${ext}`, contentType: mime })

                const uploadRes = await axios.post('https://api.ryzumi.vip/api/uploader/ryzencdn', form, {
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'multipart/form-data',
                        ...form.getHeaders()
                    },
                    timeout: 120000
                })

                if (!uploadRes?.data?.success || !uploadRes?.data?.url) {
                    throw new Error('Upload gagal atau respons tidak valid')
                }

                imageUrl = uploadRes.data.url
            }

            const apiUrl = `https://api.ryzumi.vip/api/ai/tofigure?imageUrl=${encodeURIComponent(imageUrl)}`
            const { data: imgData } = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'accept': 'image/png'
                },
                timeout: 120000
            })

            await sock.sendMessage(m.chat, {
                image: Buffer.from(imgData),
                caption: '🎎 Converted to figurine style'
            }, { quoted: m })

            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (error) {
            console.error('Error in figurine:', error)
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
            await m.reply('❌ Gagal convert ke figurine: ' + (error?.message || 'Unknown error'))
        }
    }
}

export default handler

