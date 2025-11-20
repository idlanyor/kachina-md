import axios from 'axios'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'

export const handler = {
    command: ['tourl'],
    category: 'tools',
    help: 'Upload media ke S3.',
    exec: async ({ sock, m }) => {
        try {
            await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            // Ambil media dari reply atau pesan saat ini
            let ref = m
            if (m.quoted) ref = m.quoted
            const refMsg = ref.message || {}
            const refType = Object.keys(refMsg)[0]

            const allowed = ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage']
            if (!allowed.includes(refType)) {
                await m.reply('❌ Reply/kirim gambar, video, dokumen, audio, atau stiker dengan caption .tourl')
                return
            }

            const buffer = await ref.download()
            if (!buffer) {
                await m.reply('❌ Gagal mengunduh media')
                return
            }

            // Deteksi tipe file dan siapkan nama
            const type = await fileTypeFromBuffer(buffer)
            const ext = type?.ext || 'bin'
            const mime = type?.mime || 'application/octet-stream'
            let base = 'file'
            try {
                const meta = refMsg[refType]
                base = meta?.fileName?.split('.')?.[0] || meta?.mimetype?.split('/')?.[0] || base
            } catch { }

            // Siapkan form-data sesuai spesifikasi uploader
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

            const info = uploadRes.data.data
            const url = info.fileUrl

            await m.reply(`✅ Berhasil upload!\n\n🔗 URL: ${url}`)
            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        } catch (error) {
            console.error('Error in tourl:', error)
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
            await m.reply('❌ Gagal upload media: ' + (error?.message || 'Unknown error'))
        }
    }
}

export default handler

