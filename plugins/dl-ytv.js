import axios from 'axios'
import yts from 'yt-search'
import User from '../database/models/User.js'

export const handler = {
    command: ['playv'],
    category: 'downloader',
    help: 'Download video YouTube',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, args }) => {
        try {
            // Get user and set localization
            const user = await User.getById(m.sender);
            const userLang = user.preferences?.language || 'id';
            globalThis.localization.setLocale(userLang);

            if (!args) {
                const helpText = `📋 ${t('download.format')}:\n` +
                    `1. !playv <${t('download.search_query')}> [--quality]\n` +
                    `2. !playv <${t('download.youtube_url')}> [--quality]\n\n` +
                    `${t('download.quality_options')}: --144p, --240p, --360p, --480p, --720p, --1080p, --1440p, --2160p\n` +
                    `${t('common.example')}: !playv rickroll --720p`;
                await m.reply(helpText);
                return;
            }

            // Parse quality parameter
            let quality = '480p' // default quality
            let searchQuery = args

            // Check for quality parameter
            const qualityMatch = args.match(/--([0-9]+p)$/)
            if (qualityMatch) {
                quality = qualityMatch[1]
                searchQuery = args.replace(/\s*--[0-9]+p$/, '').trim()
            }

            // Add waiting reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            })

            let videoUrl = ''
            // Check if searchQuery is a URL or search query
            if (searchQuery.startsWith('https://')) {
                videoUrl = searchQuery
            } else {
                // Search using yt-search
                const searchResults = await yts(searchQuery)
                if (!searchResults.videos.length) {
                    await sock.sendMessage(m.chat, {
                        react: { text: '❌', key: m.key }
                    })
                    await m.reply(t('download.video_not_found'))
                    return
                }
                videoUrl = searchResults.videos[0].url
            }

            // Download video using Ryzumi API
            const encodedUrl = encodeURIComponent(videoUrl)
            const qualityParam = quality.replace('p', '') // Convert '480p' to '480'
            const response = await axios.get(`https://api.ryzumi.vip/api/downloader/ytmp4?url=${encodedUrl}&quality=${qualityParam}`)

            if (!response.data.url) {
                throw new Error('Download URL not found')
            }

            await m.reply(`🎥 *${response.data.title}*\nQuality: ${quality}\n\nVideo sedang dikirim...`)

            // Check if quality is 720p or higher to send as document
            const qualityNumber = parseInt(quality.replace('p', ''))
            const sendAsDocument = qualityNumber >= 720

            if (sendAsDocument) {
                // Send as document for high quality videos
                await sock.sendMessage(m.chat, {
                    document: {
                        url: response.data.url
                    },
                    fileName: `${response.data.title}.mp4`,
                    mimetype: 'video/mp4',
                    caption: `${response.data.title}\nQuality: ${quality}`,
                    thumbnail: response.data.thumbnail
                })
            } else {
                // Send video file with thumbnail for standard quality
                await sock.sendMessage(m.chat, {
                    video: {
                        url: response.data.url
                    },
                    caption: `${response.data.title}\nQuality: ${quality}`,
                    thumbnail: response.data.thumbnail
                })
            }

            // Add success reaction
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            })

        } catch (error) {
            console.error('Error in playv:', error)
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            })
            await m.reply('❌ Gagal mendownload video')
        }
    }
}

export default handler