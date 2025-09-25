import util from 'util';

export const handler = {
    command: ['.'],
    help: 'Evaluasi kode JS',
    category: 'owner',
    isOwner: true,

    async exec({ m, args, sock }) {
        try {
            // Security check pertama - hanya owner yang bisa mengakses
            if (!m.isOwner()) {
                await m.reply('❌ Perintah ini hanya untuk owner bot!');
                return;
            }

            if (!args) {
                await m.reply('❌ Masukkan kode yang akan dieval!\n\n📖 *Contoh penggunaan:*\n• `.console.log("Hello World")`\n• `.await fetch("https://api.github.com").then(r => r.json())`\n• `.Promise.resolve("Test Promise")`');
                return;
            }

            const evalCode = args;

            // Blacklist dangerous operations
            const dangerousPatterns = [
                'process.exit', 'process.kill', 'require("fs")', 'import.*fs',
                'child_process', 'exec(', 'spawn(', 'fork(',
                'eval(', 'Function(', 'setTimeout.*eval', 'setInterval.*eval',
                'global.process', '__dirname', '__filename',
                'Buffer.from', 'Buffer.alloc', 'crypto.randomBytes'
            ];

            const isDangerous = dangerousPatterns.some(pattern => {
                const regex = new RegExp(pattern, 'i');
                return regex.test(evalCode);
            });

            if (isDangerous) {
                await m.reply('❌ Kode berbahaya terdeteksi! Operasi ditolak untuk keamanan sistem.');
                return;
            }

            // Add loading reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

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
                    // Error reaction
                    await sock.sendMessage(m.chat, {
                        react: { text: '❌', key: m.key }
                    });
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

            // Success reaction
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            await m.reply(`❌ *ERROR*\n\n${error.message}\n\n📝 *Stack:*\n${error.stack?.split('\n').slice(0, 3).join('\n') || 'No stack trace'}`);
            
            // Error reaction
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
        }
    }
};
