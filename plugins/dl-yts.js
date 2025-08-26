import yts from 'yt-search'
import { proto, prepareWAMessageMedia, generateWAMessageFromContent } from 'baileys'

export const handler = {
    command: ['yts', 'ytsearch'],
    tags: ['downloader'],
    help: 'Mencari video di YouTube\n\nFormat: !yts <query>',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, args }) => {
        try {
            if (!args) {
                await m.reply('📋 Format: !yts <query>\nContoh: !yts Lagu Indonesia')
                return
            }

            await sock.sendMessage(m.chat, {
                react: { text: '🔍', key: m.key }
            })

            const searchResults = await yts(args)
            
            if (!searchResults.videos.length) {
                await sock.sendMessage(m.chat, {
                    react: { text: '❌', key: m.key }
                })
                await m.reply('❌ Video tidak ditemukan')
                return
            }

            const videos = searchResults.videos.slice(0, 10)

            // Buat cards untuk carousel
            const cards = await Promise.all(videos.map(async (video, index) => {
                const videoTitle = video.title || 'Unknown Title'
                const channelName = video.author?.name || 'Unknown Channel'
                const duration = video.timestamp || 'Unknown'
                const views = video.views ? video.views.toLocaleString() : '0'
                const uploadTime = video.ago || 'Unknown'
                const videoUrl = video.url || '#'
                const thumbnailUrl = video.thumbnail || 'https://via.placeholder.com/480x360?text=No+Thumbnail'
                
                return {
                    body: proto.Message.InteractiveMessage.Body.fromObject({
                        text: `*${videoTitle}*\n\n👤 Channel: ${channelName}\n⏱️ Duration: ${duration}\n👁️ Views: ${views}\n📅 Upload: ${uploadTime}`
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.fromObject({
                        text: `© YouTube Search Results`
                    }),
                    header: proto.Message.InteractiveMessage.Header.fromObject({
                        title: `*Video ${index + 1}*`,
                        hasMediaAttachment: true,
                        ...(await prepareWAMessageMedia({ image: { url: thumbnailUrl } }, { upload: sock.waUploadToServer }))
                    }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                        buttons: [
                            {
                                name: "cta_url",
                                buttonParamsJson: `{"display_text":"🎥 Tonton Video","url":"${videoUrl}"}`
                            },
                            {
                                name: "quick_reply",
                                buttonParamsJson: `{"display_text":"📺 Download Video","id":"playv ${videoUrl}"}`
                            },
                            {
                                name: "quick_reply",
                                buttonParamsJson: `{"display_text":"🎵 Download Audio","id":"play ${videoUrl}"}`
                            }
                        ]
                    })
                }
            }))
    
            const message = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                            contextInfo: {
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: '120363305152329358@newsletter',
                                    newsletterName: 'Powered By : Kanata Bot',
                                    serverMessageId: -1
                                },
                                forwardingScore: 256,
                                externalAdReply: {
                                    title: 'YouTube Search Results',
                                    thumbnailUrl: videos[0]?.thumbnail || 'https://via.placeholder.com/480x360?text=YouTube',
                                    sourceUrl: 'https://whatsapp.com/channel/0029VagADOLLSmbaxFNswH1m',
                                    mediaType: 2,
                                    renderLargerThumbnail: false
                                }
                            },
                            body: proto.Message.InteractiveMessage.Body.fromObject({
                                text: `🎥 *YOUTUBE SEARCH RESULTS*\n\n🔍 Query: ${args}\n📊 Found: ${videos.length} videos\n\n✨ Pilih video yang ingin ditonton atau download!`
                            }),
                            footer: proto.Message.InteractiveMessage.Footer.fromObject({
                                text: `🤖 Powered by: ${globalThis.botName || 'Kanata Bot'}`
                            }),
                            header: proto.Message.InteractiveMessage.Header.fromObject({
                                hasMediaAttachment: false
                            }),
                            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                                cards
                            })
                        })
                    }
                }
            }, {})
    
            await sock.relayMessage(m.chat, message.message, { messageId: message.key.id })

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            })

        } catch (error) {
            console.error('Error in yts:', error)
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            })
            await m.reply('❌ Gagal mencari video: ' + error.message)
        }
    }
}

export default handler