import Database from '../helper/database.js';
import os from 'os';
import { performance } from 'perf_hooks';

// Helper functions
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

export const handler = {
    command: ['ping'],
    category: 'ingfo',
    help: 'Mengecek status dan performa bot',
    exec: async ({ sock, m }) => {
        try {
            const start = performance.now();

            // Send loading reaction
            await sock.sendMessage(m.chat, {
                react: { text: '⌛', key: m.key }
            });

            // Get basic system info
            const totalRAM = os.totalmem();
            const freeRAM = os.freemem();
            const usedRAM = totalRAM - freeRAM;
            const ramUsage = ((usedRAM / totalRAM) * 100).toFixed(1);

            // Calculate response time
            const end = performance.now();
            const responseTime = ((end - start) / 1000).toFixed(3);
            const uptime = formatUptime(process.uptime());

            // Simple status message
            const status = `*🤖 KANATA BOT STATUS*

` +
                `📊 *Response:* ${responseTime}s\n` +
                `⏰ *Uptime:* ${uptime}\n` +
                `💾 *RAM:* ${formatBytes(usedRAM)} / ${formatBytes(totalRAM)} (${ramUsage}%)\n` +
                `🖥️ *Platform:* ${os.platform()} ${os.arch()}\n` +
                `🔧 *Node.js:* ${process.version}\n\n` +
                `_Bot berjalan dengan baik! ✨_`;

            // Send status
            await m.reply(status);

            // Success reaction
            const emoji = responseTime < 1 ? '🚀' : responseTime < 2 ? '⚡' : '✅';
            await sock.sendMessage(m.chat, {
                react: { text: emoji, key: m.key }
            });

            // Update command stats
            await Database.addCommand();

        } catch (error) {
            console.error('Error in ping:', error);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            await m.reply('❌ Terjadi kesalahan: ' + error.message);
        }
    }
};

export default handler;
