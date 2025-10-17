import axios from 'axios'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'

export const handler = {
    command: ['tomanga'],
    category: 'image',
    help: 'Ubah gambar menjadi gaya manga.\n\nCara pakai:\n- Reply gambar dengan .tomanga\n- Atau .tomanga <image_url>',
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
                    await m.reply('❌ Reply/kirim gambar (atau stiker) dengan caption .tomanga, atau berikan URL gambar')
                    return
                }

                const buffer = await ref.download()
                if (!buffer) {
                    await m.reply('❌ Gagal mengunduh media')
                    return
                }

                // Upload ke S3 untuk mendapatkan URL
                const type = await fileTypeFromBuffer(buffer)
                const ext = type?.ext || 'png'
                const mime = type?.mime || 'image/png'
                let base = 'image'
                try {
                    const meta = refMsg[refType]
                    base = meta?.fileName?.split('.')?.[0] || meta?.mimetype?.split('/')?.[0] || base
                } catch {}

                const form = new FormData()
                form.append('file', buffer, { filename: `${base}.${ext}`, contentType: mime })
                form.append('folder', 'documents/2024')

                const uploadRes = await axios.post('https://s3.antidonasi.web.id/upload', form, {
                    headers: { ...form.getHeaders() },
                    timeout: 120000
                })

                if (!uploadRes?.data?.success || !uploadRes?.data?.data?.fileUrl) {
                    throw new Error('Upload gagal atau respons tidak valid')
                }

                imageUrl = uploadRes.data.data.fileUrl
            }

            // Panggil Nekolabs tomanga API
            const apiUrl = `https://api.nekolabs.my.id/tools/convert/tomanga?imageUrl=${encodeURIComponent(imageUrl)}`
            const { data: apiData } = await axios.get(apiUrl, { timeout: 120000 })

            if (!apiData?.success || !apiData?.result) {
                throw new Error('API gagal atau hasil tidak tersedia')
            }

            // Ambil hasil gambar dan kirim ke chat
            const resultUrl = apiData.result
            const { data: imgData } = await axios.get(resultUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'accept': 'image/png,image/jpeg',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 120000
            })

            await sock.sendMessage(m.chat, {
                image: Buffer.from(imgData),
                caption: '📖 Converted to manga style'
            }, { quoted: m })

            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (error) {
            console.error('Error in tomanga:', error)
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
            await m.reply('❌ Gagal convert ke manga: ' + (error?.message || 'Unknown error'))
        }
    }
}

export default handler

