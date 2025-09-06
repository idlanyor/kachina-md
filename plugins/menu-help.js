import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { pathToFileURL } from 'url'
import Database from '../helper/database.js'
import figlet from 'figlet' // ← tambah impor Figlet

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

            // Emoji dan deskripsi mode
            const modeEmoji = {
                'public': '📢',
                'self-private': '👤',
                'self-me': '👑'
            }

            const modeDesc = {
                'public': 'Semua bisa menggunakan',
                'self-private': 'Private chat & owner di grup',
                'self-me': 'Hanya owner'
            }

            // Ambil plugin commands - hanya dari folder plugins
            const pluginsDir = __dirname // Langsung gunakan __dirname karena sudah di folder plugins
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
                            let detailMenu = `╭─「 📚 COMMAND DETAIL 」\n` +
                                `├ Command: ${prefix}${searchCmd}\n` +
                                `├ Description: ${plugin.help}\n` +
                                `├ Category: ${icon} ${category.toUpperCase()}\n` +
                                `├ Tags: ${plugin.tags?.join(', ') || '-'}\n` +
                                `╰──────────────────\n\n` +
                                `💡 *Tips:*\n` +
                                `• Ketik ${prefix}menu untuk kembali ke menu utama\n` +
                                `• Channel: https://whatsapp.com/channel/0029VagADOLLSmbaxFNswH1m`

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

            // --- List message per kategori ---
            const sections = []
            let totalCommands = 0

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
            let menuText = ''

            const orderedCategories = categoryOrder.filter(c => categories[c])
                .concat(Object.keys(categories).filter(c => !categoryOrder.includes(c)))

            for (const category of orderedCategories) {
                const plugins = categories[category]
                if (!plugins || plugins.length === 0 || category.toUpperCase() === 'HIDDEN') continue

                const icon = categoryIcons[category] || '📁'
                const rows = []

                for (const plugin of plugins) {
                    for (const cmd of plugin.commands) {
                        rows.push({
                            title: `${cmd}`.toUpperCase(),
                            description: plugin.help,
                            id: `${cmd}`
                        })
                        totalCommands++
                    }
                }

                if (rows.length) {
                    sections.push({
                        title: `${icon} ${category.toUpperCase()}`,
                        rows
                    })
                }
            }

            const hour = new Date().getHours()
            const greeting = hour >= 4 && hour < 11 ? 'Pagi' : hour < 15 ? 'Siang' : hour < 18 ? 'Sore' : 'Malam'

            const footer = `📊 Total Kategori: ${sections.length}\n` +
                `📌 Total Commands: ${totalCommands}\n` +
                `⚙️ Prefix: ${prefix}\n` +
                `🔰 Mode: ${settings.botMode}`
            // Build menu text with categories and commands
            for (const [category, plugins] of Object.entries(categories)) {
                if (plugins.length === 0) continue

                const icon = categoryIcons[category] || '📁'
                menuText += `│ ${icon} *${category.toUpperCase()}*\n`
                for (const plugin of plugins) {
                    const cmdList = plugin.commands.map(cmd => `${prefix}${cmd}`).join(', ')
                    menuText += `│ ▸ ${cmdList}\n`
                }
                menuText += '│\n'
            }

            // Send menu message with image and interactive button
            await sock.sendMessage(m.chat, {
                image: { url: globalThis.ppUrl },
                caption: `╭─「 ${botName} 」\n` +
                    `├ Selamat ${greeting} @${m.sender.split('@')[0]}\n` +
                    `├ Berikut menu yang tersedia\n` +
                    `├ Silakan pilih kategori menu:\n` +
                    `╰────────────⭐\n\n` +
                    menuText, // Add menuText to caption
                footer,
                buttons: [{
                    buttonId: 'action',
                    buttonText: { displayText: '📋 Buka Menu' },
                    type: 4,
                    nativeFlowInfo: {
                        name: 'single_select',
                        paramsJson: JSON.stringify({
                            title: '📚 KATEGORI MENU',
                            sections
                        })
                    }
                }],
                headerType: 1,
                viewOnce: true,
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

// ──[ ASCII Banner ]────────────────────────────────────────
const banner = figlet.textSync(botName, {
    font: 'ANSI Shadow', // pilih font unik, boleh diganti
    horizontalLayout: 'default',
    verticalLayout: 'default'
})

// Buat menu text dengan banner
let menuText = '```\n' + banner + '\n```\n' // blok kode agar rapi di WhatsApp
menuText += `╭─「 MENU 」\n`