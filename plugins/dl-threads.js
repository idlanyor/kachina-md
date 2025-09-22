import axios from 'axios'

export const handler = {
    command: ['threads'],
    category: 'downloader',
    help: 'Download from Threads',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, args }) => {
        try {
            if (!args) {
                await m.reply('📋 Format:\n!threads <threads url>')
                return
            }

            if (!args.includes('threads.com')) {
                await m.reply('❌ Invalid URL! Please provide a valid Threads URL')
                return
            }

            // Add waiting reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            })

            // Download using Ryzumi API
            const apiUrl = `https://api.ryzumi.vip/api/downloader/threads?url=${encodeURIComponent(args)}`
            const response = await axios.get(apiUrl, {
                headers: {
                    'accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            })
            
            const result = response.data
            
            if (!result || (!result.image_urls?.length && !result.video_urls?.length)) {
                throw new Error('No media content found in this Threads post')
            }

            // Handle different content types
            let mediaUrl = null
            let mediaType = 'unknown'
            
            // Check if it has videos
            if (result.video_urls && result.video_urls.length > 0) {
                mediaUrl = result.video_urls[0]
                mediaType = 'video'
            }
            // Check if it has images
            else if (result.image_urls && result.image_urls.length > 0) {
                mediaUrl = result.image_urls[0]
                mediaType = 'image'
            }

            if (!mediaUrl) {
                throw new Error('No media content found in this Threads post')
            }

            // Send media file based on type
            if (mediaType === 'video') {
                await sock.sendMessage(m.chat, {
                    video: {
                        url: mediaUrl
                    },
                    caption: `✅ Downloaded using Kachina Bot\n🧵 Threads Video\n🔗 Source: ${args}`,
                    contextInfo: {
                        externalAdReply: {
                            title: 'Threads Video',
                            body: 'Downloaded successfully',
                            thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Threads_%28app%29_logo.svg/512px-Threads_%28app%29_logo.svg.png',
                            sourceUrl: args,
                            mediaType: 1
                        }
                    }
                }, { quoted: m })
            } else if (mediaType === 'image') {
                await sock.sendMessage(m.chat, {
                    image: {
                        url: mediaUrl
                    },
                    caption: `✅ Downloaded using Kachina Bot\n🧵 Threads Image\n🔗 Source: ${args}`,
                    contextInfo: {
                        externalAdReply: {
                            title: 'Threads Image',
                            body: 'Downloaded successfully',
                            thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Threads_%28app%29_logo.svg/512px-Threads_%28app%29_logo.svg.png',
                            sourceUrl: args,
                            mediaType: 1
                        }
                    }
                }, { quoted: m })
            }

            // Add success reaction
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            })

        } catch (error) {
            console.error('Error in threads:', error)
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            })
            await m.reply(`❌ Gagal mendownload konten. Error: ${error.message}\nPastikan URL Threads valid dan coba lagi nanti.`)
        }
    }
}

export default handler