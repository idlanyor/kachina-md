
export const handler = {
    command: ['totag'],
    category:'group',
    help: 'Forward pesan yang direply dengan mention semua anggota group',
    isAdmin: true,
    isBotAdmin: true,
    isOwner: false,
    isGroup: true,
    exec: async ({ sock, m, id, args }) => {
        try {
            // Cek apakah ada pesan yang direply
            if (!m.quoted) {
                return await m.reply(`Reply message dengan caption .totag`)
            }

            const group = await m.groupMetadata
            
            // Ambil semua participants dari group
            const participants = group.participants || []
            
            // Forward pesan yang direply dengan mentions
            await sock.sendMessage(id, {
                forward: m.quoted,
                mentions: participants.map(a => a.id)
            })

        } catch (error) {
            console.error('Error in totag:', error)
            await m.reply('❌ Gagal mengirim totag')
        }
    }
}

export default handler