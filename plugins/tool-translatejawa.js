import Jawa from '../helper/jawa.js';

export const handler = {
    command: ['jawa', 'translatejawa', 'jawatranslate'],
    category: 'tools',
    help: 'Translate Bahasa Indonesia ke Jawa (Krama Alus/Lugu/Ngoko)',
    exec: async ({ sock, m, args, usedPrefix }) => {
        try {
            if (!args) {
                await m.reply(`📜 *TRANSLATE JAWA*

*Penggunaan:*
• ${usedPrefix}jawa <teks> - ke Krama Alus
• ${usedPrefix}jawa ngoko <teks> - ke Ngoko
• ${usedPrefix}jawa krama <teks> - ke Krama Lugu
• ${usedPrefix}jawa indo <teks jawa> - Jawa ke Indo

*Contoh:*
${usedPrefix}jawa apa kabar
${usedPrefix}jawa ngoko saya mau makan`);
                return;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            const parts = args.split(' ');
            const subCmd = parts[0]?.toLowerCase();
            
            let from = 'indo';
            let to = 'krama-alus';
            let text = args;

            switch (subCmd) {
                case 'ngoko':
                    to = 'ngoko';
                    text = parts.slice(1).join(' ');
                    break;
                case 'krama':
                case 'krama-lugu':
                    to = 'krama-lugu';
                    text = parts.slice(1).join(' ');
                    break;
                case 'alus':
                case 'krama-alus':
                    to = 'krama-alus';
                    text = parts.slice(1).join(' ');
                    break;
                case 'indo':
                case 'indonesia':
                    from = 'jawa';
                    to = 'indo';
                    text = parts.slice(1).join(' ');
                    break;
            }

            if (!text) {
                await m.reply('❌ Masukkan teks untuk ditranslate');
                return;
            }

            const result = await Jawa.translate(text, { from, to });

            const toLabel = {
                'krama-alus': 'Krama Alus',
                'krama-lugu': 'Krama Lugu',
                'ngoko': 'Ngoko',
                'indo': 'Indonesia'
            };

            await m.reply(`📜 *TRANSLATE JAWA*

*Dari:* ${from === 'indo' ? 'Indonesia' : 'Jawa'}
*Ke:* ${toLabel[to]}

*Input:*
${text}

*Hasil:*
${result}`);

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in jawa:', error);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            await m.reply('❌ Gagal translate: ' + error.message);
        }
    }
};

export default handler;
