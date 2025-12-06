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
    help: 'Menampilkan menu bantuan. Gunakan .menu <kategori> untuk melihat perintah dalam kategori',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, args, noTel, sender }) => {
        try {
            const botName = globalThis.botName || 'Kachina Bot'
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

                    const category = plugin.handler.category || 'downloader'
                    if (category.toUpperCase() === 'HIDDEN') continue

                    if (!categories[category]) {
                        categories[category] = []
                    }

                    let commands = Array.isArray(plugin.handler.command) ?
                        plugin.handler.command :
                        [plugin.handler.command]

                    // Sembunyikan perintah efek lama (deprecated)
                    if (file.endsWith('tool-audio.js')) {
                        commands = commands.filter(c => c === 'ae')
                    }

                    if (commands.length > 0) {
                        categories[category].push({
                            commands,
                            help: plugin.handler.help || 'Tidak ada deskripsi',
                            tags: plugin.handler.tags || []
                        })
                    }
                } catch (err) {
                    console.error(`Error loading plugin ${file}:`, err)
                }
            }

            // Definisi icon kategori
            const categoryIcons = {
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
                'religi': '🕌',
                'info': '📊'
            }
            
            // Jika ada args, cek apakah itu kategori atau command
            if (args && args.length > 0) {
                const searchArg = args.toLowerCase()
                let found = false

                // Cek apakah args adalah kategori
                for (const [category, plugins] of Object.entries(categories)) {
                    if (category.toLowerCase() === searchArg) {
                        const icon = categoryIcons[category] || '📁'
                        let categoryMenu = `╭━━╼『 MENU ${category.toUpperCase()} 』\n`
                        
                        for (const plugin of plugins) {
                            for (const cmd of plugin.commands) {
                                const helpText = typeof plugin.help === 'string' ? plugin.help.split('\n')[0].trim() : 'Tidak ada deskripsi'
                            categoryMenu += `┃ ☰ _*${prefix}${cmd} - ${helpText}*_\n`
                            }
                        }
                        
                        categoryMenu += `╰━━━━━━━━━━━━━━━━━━╼\n\n` +
                            `💡 *Tips:*\n` +
                            `▧ Ketik ${prefix}help <command> untuk detail command\n` +
                            `▧ Ketik ${prefix}menu untuk kembali ke menu utama\n` +
                        
                        await m.reply(categoryMenu)
                        found = true
                        break
                    }
                }
                
                // Jika bukan kategori, cek apakah itu command
                if (!found) {
                    for (const [category, plugins] of Object.entries(categories)) {
                        for (const plugin of plugins) {
                            if (plugin.commands.includes(searchArg)) {
                                const icon = categoryIcons[category] || '📁'
                                let detailMenu = `╭━━╼『 📚 COMMAND DETAIL 』\n` +
                                    `▧ Command: ${prefix}${searchArg}\n` +
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
                }

                if (!found) {
                    await m.reply(`❌ Command atau kategori "${args}" tidak ditemukan`)
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


            const categoryOrder = [
                'ai', 'downloader', 'search', 'converter',
                'sticker', 'tools', 'group', 'moderation', 'game',
                'misc', 'owner'
            ]

            // Build menu text dengan dekorasi dari menu.js - hanya tampilkan kategori
            let menuText = `Hai kak 👋🏻 *@${m.sender.split('@')[0]}*\n`
            menuText += `▧ Selamat ${greeting}\n\n`
            
            menuText += `_*❏ K A C H I N A -  M D*_\n`
            menuText += `▧ Berikut kategori menu yang tersedia\n`
            menuText += `▧ Ketik ${prefix}menu <kategori> untuk melihat daftar perintah\n\n`

            const orderedCategories = categoryOrder.filter(c => categories[c])
                .concat(Object.keys(categories).filter(c => !categoryOrder.includes(c)))

            menuText += `╭━━╼『 _*❏ L I S T  M E N U  *_ 』\n`
            for (const category of orderedCategories) {
                const plugins = categories[category]
                if (!plugins || plugins.length === 0 || category.toUpperCase() === 'HIDDEN') continue

                const icon = categoryIcons[category] || '📁'
                // Hitung jumlah perintah dalam kategori
                let commandCount = 0
                for (const plugin of plugins) {
                    commandCount += plugin.commands.length
                }

                menuText += `┃ ☰ _*MENU ${category.toUpperCase()} (${commandCount} CMD)*_\n`
            }
            menuText += `╰━━━━━━━━━━━━━━━━━━╼\n`

            menuText += `\n_*❏ I N F O  B O T*_\n`
            menuText += `▧ Total Kategori: ${orderedCategories.filter(c => categories[c] && categories[c].length > 0 && c.toUpperCase() !== 'HIDDEN').length}\n`
            menuText += `▧ Total Commands: ${totalCommands}\n`
            menuText += `▧ Prefix: ${prefix}\n`
            menuText += `▧ Mode: ${settings.botMode}\n`
            menuText += `▧ Owner: ${owner}\n\n`
            
            menuText += `💡 *Tips:*\n`
            menuText += `▧ Ketik ${prefix}menu <kategori> untuk melihat perintah dalam kategori\n`
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
