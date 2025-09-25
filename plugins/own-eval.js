import util from 'util';

export const handler = {
    command: ['.'],
    help: 'Evaluasi kode JS',
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
            let result;

            // Check if code contains await keyword
            if (evalCode.includes('await')) {
                // Wrap in async function for await support
                const asyncCode = `(async () => { return ${evalCode}; })()`;
                result = await eval(asyncCode);
            } else {
                // Direct eval
                result = eval(evalCode);
            }

            // Check if result is a Promise
            if (result && typeof result.then === 'function') {
                await m.reply('⏳ *Menunggu Promise...*');
                try {
                    result = await result;
                } catch (promiseError) {
                    await m.reply(`❌ *PROMISE REJECTED*\n\n${promiseError.message}`);
                    return;
                }
            }

            let output = '✅ *RESULT*\n\n';

            if (result === undefined) {
                output += 'undefined';
            } else if (result === null) {
                output += 'null';
            } else if (typeof result === 'string') {
                output += result;
            } else if (typeof result === 'object') {
                output += util.inspect(result, { depth: 3, colors: false, maxArrayLength: 10 });
            } else {
                output += String(result);
            }

            // Limit output length to prevent spam
            if (output.length > 4000) {
                output = output.substring(0, 4000) + '\n\n... (output dipotong karena terlalu panjang)';
            }

            await m.reply(output);

        } catch (error) {
            await m.reply(`❌ *ERROR*\n\n${error.message}\n\n📝 *Stack:*\n${error.stack?.split('\n').slice(0, 3).join('\n') || 'No stack trace'}`);
        }
    }
};
