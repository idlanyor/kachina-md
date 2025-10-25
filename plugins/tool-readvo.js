import { downloadMediaMessage } from 'baileys'

export const handler = {
    command: ['rvo'],
    category: 'tools',
    help: 'Membaca pesan view once',
    isAdmin: false,
    isBotAdmin: false,
    isGroup: false,
    exec: async ({ sock, m }) => {
        try {
            // Check if message is quoted
            if (!m.quoted) {
                await m.reply('❌ Reply pesan view once yang ingin dibuka!')
                return
            }

            // Detect original quoted (pre-unwrapped) and view-once wrapper
            const quotedRaw0 = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
            const quotedRaw = quotedRaw0?.ephemeralMessage?.message || quotedRaw0
            const voWrapper = quotedRaw?.viewOnceMessageV2 || quotedRaw?.viewOnceMessageV2Extension
            const isViewOnce = !!voWrapper
            const innerMsg = voWrapper?.message || m.quoted?.message

            // Extract possible media types from the unwrapped inner message
            const ViewOnceImg = innerMsg?.imageMessage
            const ViewOnceVid = innerMsg?.videoMessage
            const ViewOnceAud = innerMsg?.audioMessage

            if (!isViewOnce) {
                await m.reply('❌ Pesan yang di-reply bukan view once!')
                return
            }

            // Add waiting reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            })

            // Download the media
            let buffer = null
            try {
                buffer = await downloadMediaMessage(
                    { message: innerMsg, key: m.quoted.key },
                    'buffer',
                    {},
                    { logger: console }
                )
            } catch {}
            if (!buffer && typeof m.quoted?.download === 'function') {
                buffer = await m.quoted.download().catch(() => null)
            }
            if (!buffer) {
                await m.reply('❌ Gagal mengunduh media view once.')
                return
            }

            // Send media based on type
            if (ViewOnceImg) {
                await sock.sendMessage(m.chat, {
                    image: buffer,
                    caption: ViewOnceImg.caption || ''
                }, { quoted: m })
            } else if (ViewOnceVid) {
                await sock.sendMessage(m.chat, {
                    video: buffer,
                    caption: ViewOnceVid.caption || ''
                }, { quoted: m })
            } else if (ViewOnceAud) {
                await sock.sendMessage(m.chat, {
                    audio: buffer,
                    mimetype: ViewOnceAud.mimetype || 'audio/mpeg',
                    ptt: !!ViewOnceAud.ptt
                }, { quoted: m })
            } else {
                await m.reply('❌ Jenis media view once tidak didukung.')
            }

            // Add success reaction
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            })

        } catch (error) {
            console.error('Error in readvo:', error)
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            })
            await m.reply('❌ Gagal membuka pesan view once: ' + error.message)
        }
    }
}

export default handler
