import Jawa from '../helper/jawa.js';

export const handler = {
    command: ['aksara', 'aksarajawa'],
    category: 'tools',
    help: 'Convert teks Latin ke Aksara Jawa atau sebaliknya',
    exec: async ({ sock, m, args, usedPrefix }) => {
        try {
            if (!args) {
                await m.reply(`📜 *AKSARA JAWA*

*Penggunaan:*
• ${usedPrefix}aksara <teks> - Latin ke Aksara Jawa
• ${usedPrefix}aksara latin <aksara> - Aksara Jawa ke Latin

*Contoh:*
${usedPrefix}aksara sragen
${usedPrefix}aksara sugeng enjing`);
                return;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            const parts = args.split(' ');
            const subCmd = parts[0]?.toLowerCase();
            let result, text;

            switch (subCmd) {
                case 'latin':
                    text = parts.slice(1).join(' ');
                    if (!text) {
                        await m.reply('❌ Masukkan aksara Jawa untuk diconvert ke Latin');
                        return;
                    }
                    result = await Jawa.aksara(text, { direction: 'toLatin' });
                    await m.reply(result, { quoted: true });
                    break;

                default:
                    result = await Jawa.aksara(args, { direction: 'toJavanese' });
                    await m.reply(result, { quoted: true });
                    break;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in aksara:', error);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            await m.reply('❌ Gagal convert: ' + error.message);
        }
    }
};

export default handler;
