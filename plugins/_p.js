import loadAssets from "../helper/loadAssets.js";

export const handler = {
    command: ['p', 'oy'],
    tags: ['hidden'],
    help: 'Mengirim kata random',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: false,
    isGroup: false,
    exec: async ({ sock, m, id }) => {
        try {
            // Array kata-kata random
            const randomWords = [
                'anjay', 'wkwkwk', 'hehe', 'mantap', 'keren', 'asik',
                'wow', 'nice', 'oke', 'siap', 'gas', 'betul',
                'iya', 'gitu', 'emang', 'bener', 'sip', 'aman',
                'santai', 'chill', 'relax', 'tenang', 'sabar',
                'gokil', 'kece', 'top', 'bagus', 'solid'
            ];
            
            // Pilih kata random
            const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
            
            await sock.sendMessage(id, { 
               text: randomWord, 
            }, { quoted: m });

        } catch (error) {
            console.error('Error in p:', error)
            await m.reply('❌ Gagal mengirim pesan')
        }
    }
}

export default handler
