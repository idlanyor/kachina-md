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
            // Security check - hanya owner yang bisa mengakses
            if (!m.isOwner()) {
                await m.reply('❌ Perintah ini hanya untuk owner bot!');
                return;
            }

            if (!args) {
                await m.reply('❌ Masukkan command yang akan dieksekusi!\n\n📖 *Contoh:*\n• `..ls -la`\n• `..pwd`\n• `..whoami`');
                return;
            }

            const execCommand = args;

            // Blacklist dangerous commands
            const dangerousCommands = [
                'rm -rf', 'sudo rm', 'format', 'del /f', 'shutdown', 'reboot',
                'passwd', 'su -', 'sudo su', 'chmod 777', 'dd if=', 'mkfs',
                'fdisk', 'parted', 'killall', 'pkill -9', 'init 0', 'halt'
            ];

            const isDangerous = dangerousCommands.some(cmd => 
                execCommand.toLowerCase().includes(cmd.toLowerCase())
            );

            if (isDangerous) {
                await m.reply('❌ Command berbahaya terdeteksi! Akses ditolak untuk keamanan sistem.');
                return;
            }

            // Add reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Execute command with timeout
            const { stdout, stderr } = await execAsync(execCommand, {
                timeout: 30000, // 30 seconds timeout
                maxBuffer: 1024 * 1024 // 1MB max buffer
            });

            let result = '';

            if (stdout) {
                result += `📤 *STDOUT:*\n\`\`\`\n${stdout}\n\`\`\`\n`;
            }
            
            if (stderr) {
                result += `⚠️ *STDERR:*\n\`\`\`\n${stderr}\n\`\`\`\n`;
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
            
            // Add more specific error info
            if (error.code) {
                errorMessage += `\n📝 *Error Code:* ${error.code}`;
            }
            if (error.signal) {
                errorMessage += `\n🔄 *Signal:* ${error.signal}`;
            }

            await m.reply(errorMessage);
            
            // Error reaction
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
        }
    }
};