import { downloadMediaMessage } from 'baileys'

export const handler = {
    command: ['toghibli'],
    category: 'ai',
    help: 'Mengkonversi gambar menjadi style Studio Ghibli\n\nCara pakai:\n1. Reply gambar dengan !toghibli\n2. Kirim gambar dengan caption !toghibli [prompt]',
    exec: async ({ sock, m, args }) => {
        try {
            let quotedMsg
            
            // Check if message is quoted
            if (m.quoted) {
                quotedMsg = m.quoted
            } else if (m.message?.imageMessage) {
                quotedMsg = m
            } else {
                await m.reply('❌ Reply gambar yang ingin dikonversi ke style Ghibli!')
                return
            }

            // Validate if it's an image
            if (!quotedMsg.message?.imageMessage) {
                await m.reply('❌ Pesan yang di-reply bukan gambar!')
                return
            }

            // Add waiting reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            })

            // Import required modules
            const axios = (await import('axios')).default
            const { randomUUID, randomBytes } = await import('crypto')
            const FormData = (await import('form-data')).default

            // Download image buffer
            const buffer = await downloadMediaMessage(
                quotedMsg,
                'buffer',
                {},
                { logger: console }
            )

            if (!buffer) {
                await m.reply('❌ Gagal download media!')
                return
            }

            const uuid = randomUUID()
            const mimetype = quotedMsg.message.imageMessage.mimetype || 'image/jpeg'
            const ext = '.' + mimetype.split('/')[1]
            const filename = `Ghibli_${randomBytes(4).toString('hex')}${ext}`

            const form = new FormData()
            form.append('file', buffer, { filename, contentType: mimetype })

            const headers = {
                ...form.getHeaders(),
                authorization: 'Bearer',
                'x-device-language': 'en',
                'x-device-platform': 'web',
                'x-device-uuid': uuid,
                'x-device-version': '1.0.44'
            }

            // Upload image
            const uploadRes = await axios.post(
                'https://widget-api.overchat.ai/v1/chat/upload',
                form,
                { headers }
            )

            const { link, croppedImageLink, chatId } = uploadRes.data
            const prompt = args || 'Ghibli Studio style, charming hand-drawn anime-style illustration.'

            const payload = {
                chatId,
                prompt,
                model: 'gpt-image-1',
                personaId: 'image-to-image',
                metadata: {
                    files: [{ path: filename, link, croppedImageLink }]
                }
            }

            const jsonHeaders = {
                ...headers,
                'content-type': 'application/json'
            }

            // Generate Ghibli style image
            const genRes = await axios.post(
                'https://widget-api.overchat.ai/v1/images/generations',
                payload,
                { headers: jsonHeaders }
            )

            // Send result
            if (genRes.data && genRes.data.imageUrl) {
                await sock.sendMessage(m.chat, {
                    image: { url: genRes.data.imageUrl },
                    caption: `✨ *Studio Ghibli Style*\n\n🎨 *Prompt*: ${prompt}\n📅 ${new Date().toLocaleDateString('id-ID')}`
                }, { quoted: m })

                // Add success reaction
                await sock.sendMessage(m.chat, {
                    react: { text: '✅', key: m.key }
                })
            } else {
                await sock.sendMessage(m.chat, {
                    image: { url: genRes.data.data[0].url},
                    caption: `✨ *Sukses cik*`
                })
                // await m.reply('✨ *Studio Ghibli Result*\n\n' + JSON.stringify(genRes.data, null, 2))
            }

        } catch (error) {
            console.error('Error in toghibli:', error)
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            })
            
            // const detail = error.response?.data || error.message
            // await m.reply('❌ Gagal mengkonversi ke style Ghibli: ' + JSON.stringify(detail, null, 2))
        }
    }
}

export default handler