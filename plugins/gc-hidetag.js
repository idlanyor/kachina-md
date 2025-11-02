
export const handler = {
    command: 'hidetag',
    category:'group',
    help: 'Tag semua anggota group secara tersembunyi',
    isAdmin: true,
    isBotAdmin: false,
    isOwner: false,
    isGroup: true,
    exec: async ({ sock, m, id, args }) => {
        try {
            const group = await m.groupMetadata
            
            // Ambil semua participants dari group
            const participants = group.participants || []
            
            let teks = args || ''
            await sock.sendMessage(id, {
                text: teks,
                mentions: participants.map(a => a.id)
            }, { quoted: m })

        } catch (error) {
            console.error('Error in hidetag:', error)
            await m.reply('❌ Gagal mengirim hidetag')
        }
    }
}

export default handler
