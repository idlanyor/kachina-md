import util from 'util';

export const handler = {
    command: ['.'],
    help: 'Evaluasi kode JS',
    category: 'owner',
    isOwner: true,

    async exec({ m, args, sock }) {
        try {
            if (!args) {
                await m.reply('❌ Masukkan kode yang akan dieval!\n\n📖 *Contoh penggunaan:*\n• `.console.log("Hello World")`\n• `.await sock.user`\n• `.m.chat`\n• `.globalThis.botName`');
                return;
            }

            const evalCode = args.trim();

            // Blacklist dangerous operations
            const dangerousPatterns = [
                /process\.exit/i,
                /process\.kill/i,
                /child_process/i,
                /require\s*\(\s*['"]fs['"]\s*\)/i,
                /import\s+.*\s+from\s+['"]fs['"]/i,
                /exec\s*\(/i,
                /spawn\s*\(/i,
                /fork\s*\(/i,
                /new\s+Function\s*\(/i,
                /global\.process/i,
                /rm\s+-rf/i,
                /shutdown/i,
                /reboot/i
            ];

            const isDangerous = dangerousPatterns.some(pattern => pattern.test(evalCode));

            if (isDangerous) {
                await m.reply('❌ Kode berbahaya terdeteksi! Operasi ditolak untuk keamanan sistem.');
                return;
            }

            // Add loading reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            let result;

            try {
                // Create async function with proper context
                const asyncEval = async () => {
                    // Make context variables available in eval scope
                    return eval(evalCode);
                };

                result = await asyncEval.call({ sock, m, args });

                // Check if result is a Promise
                if (result && typeof result.then === 'function') {
                    result = await result;
                }
            } catch (evalError) {
                throw evalError;
            }

            let output = '✅ *RESULT*\n\n';

            if (result === undefined) {
                output += 'undefined';
            } else if (result === null) {
                output += 'null';
            } else if (typeof result === 'string') {
                output += result;
            } else if (typeof result === 'object') {
                try {
                    output += util.inspect(result, { 
                        depth: 4, 
                        colors: false, 
                        maxArrayLength: 20,
                        breakLength: 60,
                        compact: false
                    });
                } catch {
                    output += JSON.stringify(result, null, 2);
                }
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
            const errorMsg = `❌ *ERROR*\n\n📛 *Message:*\n${error.message}\n\n📝 *Stack:*\n${error.stack?.split('\n').slice(0, 5).join('\n') || 'No stack trace'}`;
            
            await m.reply(errorMsg.length > 4000 ? errorMsg.substring(0, 4000) + '\n\n...(dipotong)' : errorMsg);
            
            // Error reaction
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
        }
    }
};
