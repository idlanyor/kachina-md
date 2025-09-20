import yts from 'yt-search'

export const handler = {
    command: ['ytsearch'],
    category: 'downloader', 
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
            
            let text = `🎥 *YOUTUBE SEARCH RESULTS*\n\n`
            text += `🔍 Query: ${args}\n`
            text += `📊 Found: ${videos.length} videos\n\n`
            
            videos.forEach((video, i) => {
                text += `📺 *Video ${i + 1}*\n`
                text += `📝 *Title:* ${video.title}\n`
                text += `👤 *Channel:* ${video.author.name}\n`
                text += `⏱️ *Duration:* ${video.timestamp}\n`
                text += `👁️ *Views:* ${video.views.toLocaleString()}\n`
                text += `📅 *Upload:* ${video.ago}\n`
                text += `🔗 *URL:* ${video.url}\n`
                text += `\nTo download:\n`
                text += `📺 Video: !playv ${video.url}\n`
                text += `🎵 Audio: !play ${video.url}\n`
                text += `\n=================\n\n`
            })
            
            text += `\n🤖 Powered by: ${globalThis.botName || 'Kanata Bot'}`

            await sock.sendMessage(m.chat, { 
                image: { url: videos[0].thumbnail },
                caption: text
            })

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