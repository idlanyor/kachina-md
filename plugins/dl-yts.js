import yts from 'yt-search'

export const handler = {
    command: ['ytsearch'],
    category: 'downloader', 
    help: 'Search video on YouTube',
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

            // Build interactive list rows for top 10 results
            const rows = videos.map((video, i) => ({
                header: `${i + 1}`,
                title: video.title.length > 72 ? video.title.slice(0, 69) + '...' : video.title,
                description: `${video.author.name} • ${video.timestamp} • ${video.views.toLocaleString()} views`,
                id: `playv ${video.url}`
            }))

            const content = {
                text: `🎥 YOUTUBE SEARCH RESULTS\n\n🔍 Query: ${args}`,
                footer: `Pilih salah satu untuk download Video.\nUntuk audio, kirim: !play <url>`,
                interactiveButtons: [
                    {
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: 'Hasil Pencarian (Top 10)',
                            sections: [ { title: 'YouTube', rows } ]
                        })
                    }
                ]
            }

            // Try interactive; fallback to captioned list if needed
            try {
                await sock.sendInteractiveMessage(m.chat, content, { quoted: m })
            } catch (e) {
                let text = `🎥 YOUTUBE SEARCH RESULTS\n\n🔍 Query: ${args}\n📊 Found: ${videos.length} videos\n\n`
                videos.forEach((video, i) => {
                    text += `📺 ${i + 1}. ${video.title}\n`
                    text += `   ${video.author.name} • ${video.timestamp} • ${video.views.toLocaleString()} views\n`
                    text += `   URL: ${video.url}\n`
                    text += `   Download: !playv ${video.url} | !play ${video.url}\n\n`
                })
                await sock.sendMessage(m.chat, { 
                    image: { url: videos[0].thumbnail },
                    caption: text
                }, { quoted: m })
            }

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
