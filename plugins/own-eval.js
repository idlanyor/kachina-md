import util from 'util';

export const handler = {
    command: ['>'],
    help: 'Evaluasi kode JavaScript (Aman)\n\nCara penggunaan:\n> <kode>\n\nContoh:\n> 1 + 1\n> Math.max(1, 2, 3)',
    category: 'owner',
    isOwner: true,

    async exec({ m, args, sock }) {
        try {
            if (!args) {
                await m.reply('❌ Masukkan kode yang akan dieval!');
                return;
            }
            // jika bukan owner
            if (!m.isOwner) {
                await m.reply('❌ Perintah ini hanya untuk owner bot!');
                return;
            }

            const evalCode = args;

            // Direct eval without restrictions
            const result = eval(evalCode);
            let output = '✅ *RESULT*\n\n';

            if (result === undefined) {
                output += 'undefined';
            } else if (result === null) {
                output += 'null';
            } else if (typeof result === 'string') {
                output += result;
            } else if (typeof result === 'object') {
                output += util.inspect(result, { depth: 2, colors: false });
            } else {
                output += String(result);
            }

            await m.reply(output);

        } catch (error) {
            await m.reply(`❌ *ERROR*\n\n${error.message}`);
        }
    }
};
