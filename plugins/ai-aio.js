import { GoogleGenerativeAI } from '@google/generative-ai'

export const handler = {
    command: ['aio'],
    category: 'ai',
    help: 'Gemini AIO: analisis gambar, audio, atau PDF.\n\nFormat:\n- .aio <pertanyaan> (reply media)\n- .aio (reply media tanpa pertanyaan)\n\nContoh:\n- .aio Jelaskan isi gambar ini\n- .aio Ringkas isi PDF ini',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, args }) => {
        try {
            const prompt = (args && args.trim().length > 0) ? args.trim() : 'Analisis konten ini dan berikan jawaban yang jelas.'

            // Tentukan sumber media: prioritas reply (quoted), fallback ke pesan saat ini
            const sourceMsg = m.quoted?.message ? m.quoted : m
            const sourceType = m.quoted?.type || m.type

            // Ambil contextInfo untuk mencari mimetype
            const msgObj = m.quoted?.message || m.message
            const imageMsg = msgObj?.imageMessage
            const audioMsg = msgObj?.audioMessage
            const documentMsg = msgObj?.documentMessage

            let mime = imageMsg?.mimetype || audioMsg?.mimetype || documentMsg?.mimetype || ''

            // Validasi tipe yang didukung
            const supported = ['image', 'audio', 'document']
            if (!supported.includes(sourceType)) {
                await m.reply('❌ Tidak ada media yang didukung. Reply gambar, audio, atau PDF dengan perintah .aio')
                return
            }

            // Khusus dokumen, hanya dukung PDF
            if (sourceType === 'document' && mime !== 'application/pdf') {
                await m.reply('❌ Dokumen yang didukung hanya PDF. Silakan kirim/reply file PDF.')
                return
            }

            // Unduh media sebagai buffer
            const buffer = m.quoted?.download ? await m.quoted.download() : await m.download()
            if (!buffer || !Buffer.isBuffer(buffer)) {
                await m.reply('❌ Gagal mengambil media. Coba ulangi dengan mengirim ulang media atau reply pesan media tersebut.')
                return
            }

            // Fallback mimetype berdasarkan tipe jika tidak tersedia
            if (!mime) {
                if (sourceType === 'image') mime = 'image/jpeg'
                else if (sourceType === 'audio') mime = 'audio/mpeg'
                else if (sourceType === 'document') mime = 'application/pdf'
                else mime = 'application/octet-stream'
            }

            // Inisialisasi Gemini
            const genAI = new GoogleGenerativeAI(globalThis.apiKey.gemini)
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

            // Siapkan parts untuk request multimodal
            const parts = []
            parts.push({ text: prompt })
            parts.push({ inlineData: { data: buffer.toString('base64'), mimeType: mime } })

            // Kirim reaksi proses
            await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

            // Generate content
            const result = await model.generateContent({
                contents: [
                    { role: 'user', parts }
                ]
            })

            const text = result.response.text()
            if (!text || text.trim().length === 0) {
                await m.reply('❌ Tidak ada jawaban dari AI. Coba berikan pertanyaan yang lebih jelas.')
            } else {
                await m.reply(`🤖 *Gemini AIO*\n\n${text.trim()}`)
            }

            // Reaksi sukses
            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (error) {
            console.error('Error in Gemini AIO:', error)
            let msg = '❌ Gagal memproses media dengan Gemini.'
            if (String(error?.message || '').toLowerCase().includes('api key')) {
                msg += '\n\nPenyebab: API key Gemini tidak valid/ kosong.'
            } else if (String(error?.message || '').toLowerCase().includes('network')) {
                msg += '\n\nPenyebab: Jaringan bermasalah, coba lagi.'
            } else if (String(error?.message || '').toLowerCase().includes('unsupported')) {
                msg += '\n\nPenyebab: Format media tidak didukung.'
            } else {
                msg += `\n\nError: ${error.message}`
            }
            await m.reply(msg)
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        }
    }
}

export default handler

