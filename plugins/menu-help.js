import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { pathToFileURL } from 'url'
import Database from '../helper/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Fungsi untuk mencari file JS - hanya di folder plugins
function findJsFiles(dir) {
    let results = []
    const list = fs.readdirSync(dir)

    list.forEach(file => {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)

        if (stat && stat.isFile() && file.endsWith('.js') && !file.startsWith('menu-help')) {
            // Hanya ambil file JS, exclude file menu-help.js sendiri
            results.push(filePath)
        }
        // Hapus bagian rekursif ke subfolder
    })
    return results
}

export const handler = {
    command: ['help', 'h', 'menu'],
    category: 'info',
    help: 'Menampilkan menu bantuan',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, args, noTel, sender }) => {
        try {
            const botName = globalThis.botName || 'Kanata Bot'
            const owner = globalThis.owner || 'Roy'
            const prefix = '.'
            const settings = await Database.getSettings()

            // Ambil plugin commands - hanya dari folder plugins
            const pluginsDir = __dirname
            const categories = {}

            // Load plugin commands
            const pluginFiles = findJsFiles(pluginsDir)
            for (const file of pluginFiles) {
                try {
                    const plugin = await import(pathToFileURL(file).href)
                    if (!plugin.handler) continue

                    // Gunakan handler.category atau 'main' sebagai default
                    const category = plugin.handler.category || 'main'
                    if (category.toUpperCase() === 'HIDDEN') continue

                    if (!categories[category]) {
                        categories[category] = []
                    }

                    const commands = Array.isArray(plugin.handler.command) ?
                        plugin.handler.command :
                        [plugin.handler.command]

                    categories[category].push({
                        commands,
                        help: plugin.handler.help || 'Tidak ada deskripsi',
                        tags: plugin.handler.tags || []
                    })
                } catch (err) {
                    console.error(`Error loading plugin ${file}:`, err)
                }
            }

            // Jika ada args, tampilkan detail command
            if (args) {
                const searchCmd = args.toLowerCase()
                let found = false

                for (const [category, plugins] of Object.entries(categories)) {
                    for (const plugin of plugins) {
                        if (plugin.commands.includes(searchCmd)) {
                            const categoryIcons = {
                                'main': '⚡',
                                'ai': '🤖',
                                'converter': '🔄',
                                'downloader': '📥',
                                'group': '👥',
                                'hidden': '🔒',
                                'misc': '🛠️',
                                'moderation': '🛡️',
                                'owner': '👑',
                                'search': '🔍',
                                'sticker': '🎯',
                                'tools': '⚙️',
                                'game': '🎮',
                                'religi': '🕌'
                            }

                            const icon = categoryIcons[category] || '📁'
                            let detailMenu = `╭━━╼『 📚 COMMAND DETAIL 』\n` +
                                `▧ Command: ${prefix}${searchCmd}\n` +
                                `▧ Description: ${plugin.help}\n` +
                                `▧ Category: ${icon} ${category.toUpperCase()}\n` +
                                `▧ Tags: ${plugin.tags?.join(', ') || '-'}\n` +
                                `╰━━━━━━━━━━━━━━━━━━╼\n\n` +
                                `💡 *Tips:*\n` +
                                `▧ Ketik ${prefix}menu untuk kembali ke menu utama\n` +
                                `▧ Channel: https://whatsapp.com/channel/0029VagADOLLSmbaxFNswH1m`

                            await m.reply(detailMenu)
                            found = true
                            break
                        }
                    }
                    if (found) break
                }

                if (!found) {
                    await m.reply(`❌ Command "${args}" tidak ditemukan`)
                }
                return
            }

            // Hitung total commands
            let totalCommands = 0
            for (const plugins of Object.values(categories)) {
                for (const plugin of plugins) {
                    totalCommands += plugin.commands.length
                }
            }

            const hour = new Date().getHours()
            const greeting = hour >= 4 && hour < 11 ? 'Pagi' : hour < 15 ? 'Siang' : hour < 18 ? 'Sore' : 'Malam'

            const categoryIcons = {
                'main': '⚡',
                'ai': '🤖',
                'converter': '🔄',
                'downloader': '📥',
                'group': '👥',
                'hidden': '🔒',
                'misc': '🛠️',
                'moderation': '🛡️',
                'owner': '👑',
                'search': '🔍',
                'sticker': '🎯',
                'tools': '⚙️',
                'game': '🎮',
                'religi': '🕌'
            }

            const categoryOrder = [
                'main', 'ai', 'downloader', 'search', 'converter',
                'sticker', 'tools', 'group', 'moderation', 'game',
                'misc', 'owner'
            ]

            // Build menu text dengan dekorasi dari menu.js
            let menuText = `Hai kak 👋🏻 *@${m.sender.split('@')[0]}*\n`
            menuText += `▧ Selamat ${greeting}\n\n`
            
            menuText += `_*❏ M E N U  B O T*_\n`
            menuText += `▧ Berikut menu yang tersedia\n\n`

            const orderedCategories = categoryOrder.filter(c => categories[c])
                .concat(Object.keys(categories).filter(c => !categoryOrder.includes(c)))

            for (const category of orderedCategories) {
                const plugins = categories[category]
                if (!plugins || plugins.length === 0 || category.toUpperCase() === 'HIDDEN') continue

                const icon = categoryIcons[category] || '📁'
                menuText += `\n╭━━╼『 ${icon} *${category.toUpperCase()}* 』\n`
                
                for (const plugin of plugins) {
                    for (const cmd of plugin.commands) {
                        menuText += `┃ ☰ ${prefix}${cmd}\n`
                    }
                }
                menuText += `╰━━━━━━━━━━━━━━━━━━╼\n`
            }

            menuText += `\n_*❏ I N F O  B O T*_\n`
            menuText += `▧ Total Kategori: ${orderedCategories.filter(c => categories[c] && categories[c].length > 0).length}\n`
            menuText += `▧ Total Commands: ${totalCommands}\n`
            menuText += `▧ Prefix: ${prefix}\n`
            menuText += `▧ Mode: ${settings.botMode}\n`
            menuText += `▧ Owner: ${owner}\n\n`
            
            menuText += `💡 *Tips:*\n`
            menuText += `▧ Ketik ${prefix}help <command> untuk detail command\n`
            menuText += `▧ Channel: https://whatsapp.com/channel/0029VagADOLLSmbaxFNswH1m\n\n`
            menuText += `_© Create by idlanyor_`

            // Send plain text menu
            await sock.sendMessage(m.chat, {
                image: { url: globalThis.ppUrl },
                caption: menuText,
                contextInfo: {
                    mentionedJid: [m.sender],
                    isForwarded: true,
                    forwardingScore: 999
                }
            }, { quoted: m })

        } catch (error) {
            console.error('Error in help:', error)
            await m.reply('❌ Terjadi kesalahan saat memuat menu')
        }
    }
}

export default handler