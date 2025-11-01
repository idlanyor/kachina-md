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

            // Get quoted message from multiple sources
            const quotedMsg = m.quoted?.message
            const quotedRaw = m.message?.extendedTextMessage?.contextInfo?.quotedMessage

            console.log('Debug - quotedMsg keys:', quotedMsg ? Object.keys(quotedMsg) : 'null')
            console.log('Debug - quotedRaw keys:', quotedRaw ? Object.keys(quotedRaw) : 'null')

            // Try multiple paths to find view once message
            let voWrapper = null
            let innerMsg = null
            let isAlreadyUnwrapped = false

            // Path 1: Direct viewOnceMessageV2/viewOnceMessage
            if (quotedRaw?.viewOnceMessageV2) {
                voWrapper = quotedRaw.viewOnceMessageV2
                innerMsg = voWrapper.message
            } else if (quotedRaw?.viewOnceMessage) {
                voWrapper = quotedRaw.viewOnceMessage
                innerMsg = voWrapper.message
            }
            // Path 2: Inside ephemeralMessage
            else if (quotedRaw?.ephemeralMessage?.message) {
                const ephemeral = quotedRaw.ephemeralMessage.message
                if (ephemeral.viewOnceMessageV2) {
                    voWrapper = ephemeral.viewOnceMessageV2
                    innerMsg = voWrapper.message
                } else if (ephemeral.viewOnceMessage) {
                    voWrapper = ephemeral.viewOnceMessage
                    innerMsg = voWrapper.message
                }
            }
            // Path 3: From m.quoted.message
            else if (quotedMsg?.viewOnceMessageV2) {
                voWrapper = quotedMsg.viewOnceMessageV2
                innerMsg = voWrapper.message
            } else if (quotedMsg?.viewOnceMessage) {
                voWrapper = quotedMsg.viewOnceMessage
                innerMsg = voWrapper.message
            }
            // Path 4: Inside ephemeralMessage from quotedMsg
            else if (quotedMsg?.ephemeralMessage?.message) {
                const ephemeral = quotedMsg.ephemeralMessage.message
                if (ephemeral.viewOnceMessageV2) {
                    voWrapper = ephemeral.viewOnceMessageV2
                    innerMsg = voWrapper.message
                } else if (ephemeral.viewOnceMessage) {
                    voWrapper = ephemeral.viewOnceMessage
                    innerMsg = voWrapper.message
                }
            }
            // Path 5: Already unwrapped view once (directly imageMessage/videoMessage/audioMessage)
            else if (quotedMsg?.imageMessage || quotedMsg?.videoMessage || quotedMsg?.audioMessage) {
                // View once that has been opened/unwrapped
                innerMsg = quotedMsg
                isAlreadyUnwrapped = true
                console.log('Detected unwrapped view once (already opened)')
            } else if (quotedRaw?.imageMessage || quotedRaw?.videoMessage || quotedRaw?.audioMessage) {
                innerMsg = quotedRaw
                isAlreadyUnwrapped = true
                console.log('Detected unwrapped view once (already opened)')
            }

            if (!innerMsg) {
                console.log('View once not detected. Available message types:',
                    quotedRaw ? Object.keys(quotedRaw) : 'none')
                await m.reply('❌ Pesan yang di-reply bukan view once atau tidak mengandung media!')
                return
            }

            // Extract possible media types from the unwrapped inner message
            const ViewOnceImg = innerMsg?.imageMessage
            const ViewOnceVid = innerMsg?.videoMessage
            const ViewOnceAud = innerMsg?.audioMessage

            if (!ViewOnceImg && !ViewOnceVid && !ViewOnceAud) {
                console.log('No media found in view once. Inner message keys:',
                    innerMsg ? Object.keys(innerMsg) : 'none')
                await m.reply('❌ Tidak dapat menemukan media dalam pesan!')
                return
            }

            // Check if media key exists
            const mediaMsg = ViewOnceImg || ViewOnceVid || ViewOnceAud
            if (!mediaMsg.mediaKey || mediaMsg.mediaKey.length === 0) {
                await m.reply('❌ View once ini sudah dibuka/expired dan tidak bisa dibaca lagi!\n\n💡 Tips: Reply view once SEBELUM dibuka untuk bisa membacanya.')
                return
            }

            // Add waiting reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            })

            // Download the media
            let buffer = null

            // Try using m.quoted.download() first (more reliable)
            if (typeof m.quoted?.download === 'function') {
                try {
                    buffer = await m.quoted.download()
                } catch (err) {
                    console.log('Download via m.quoted.download failed:', err.message)
                }
            }

            // Fallback to downloadMediaMessage
            if (!buffer) {
                try {
                    buffer = await downloadMediaMessage(
                        { message: innerMsg, key: m.quoted.key },
                        'buffer',
                        {},
                        { logger: console }
                    )
                } catch (err) {
                    console.log('Download via downloadMediaMessage failed:', err.message)
                }
            }

            if (!buffer) {
                await m.reply('❌ Gagal mengunduh media view once.\n\n💡 Kemungkinan:\n- View once sudah expired\n- Media key tidak valid\n- Reply view once SEBELUM dibuka')
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
