
export const handler = {
    command: 'tagall',
    category: 'group',
    help: 'Tag semua anggota group',
    isAdmin: true,
    isBotAdmin: true,
    isOwner: false,
    isGroup: true,
    exec: async ({ sock, m, id, args }) => {
        try {
            const group = await m.groupMetadata
            
            // Ambil semua participants dari group
            const participants = group.participants || []
            
            // Ambil sender info
            const themeemoji = '🌿' // Default theme emoji
            
            let teks = `╚»˙·٠${themeemoji}●♥ Tag All ♥●${themeemoji}٠·˙«╝ \n\n`
            teks += ` 😶 *penanda :*  ${m.pushName || 'YNTKTS'}\n`
            teks += ` 🌿 *Isi pesan : ${args ? args : 'tidak ada pesan'}*\n\n`
            
            // Loop through participants
            console.log(group)
            for (let mem of participants) {
                teks += `${themeemoji} @${mem.lid.split('@')[0]}\n`
            }

            await sock.sendMessage(id, {
                text: teks,
                mentions: participants.map(a => a.lid)
            }, { quoted: m })

        } catch (error) {
            console.error('Error in tagall:', error)
            await m.reply('❌ Gagal mengirim tagall')
        }
    }
}

export default handler
