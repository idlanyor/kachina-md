import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';

const execAsync = promisify(exec);
const isWindows = platform() === 'win32';

export const handler = {
    command: ['..'],
    help: 'Execute shell commands',
    category: 'owner',
    
    isOwner: true,
    
    async exec({ m, args, sock }) {
        try {
            if (!args) {
                await m.reply('❌ Please enter a command to execute!');
                return;
            }

            const execCommand = args;

            // Add reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Execute command
            const { stdout, stderr } = await execAsync(execCommand);

            let result = '';

            if (stdout) {
                result += `\`\`\`\n${stdout}\n\`\`\`\n`;
            }
            
            if (stderr) {
                result += `\`\`\`\n${stderr}\n\`\`\`\n`;
            }

            if (!result) result = '✅ Command executed successfully (no output)';

            await m.reply(result);
            
            // Success reaction
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Exec error:', error);
            
            let errorMessage = '❌ *ERROR*\n\n' + error.message;
            await m.reply(errorMessage);
            
            // Error reaction
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
        }
    }
};