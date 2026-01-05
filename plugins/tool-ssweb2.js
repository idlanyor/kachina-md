import ssweb2 from '../helper/ssweb2.js';

export const handler = {
    command: ['ssweb2', 'ss2', 'screenshot2'],
    category: 'tools',
    help: 'Screenshot website dengan opsi custom',
    exec: async ({ sock, m, args, usedPrefix }) => {
        try {
            if (!args) {
                await m.reply(`📸 *SCREENSHOT WEB 2*

*Penggunaan:*
${usedPrefix}ssweb2 <url> [opsi]

*Opsi:*
--full : Full page screenshot
--mobile : Mode mobile (360x640)
--desktop : Mode desktop (1920x1080)

*Contoh:*
${usedPrefix}ssweb2 google.com
${usedPrefix}ssweb2 github.com --full
${usedPrefix}ssweb2 example.com --mobile`);
                return;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '📸', key: m.key }
            });

            const parts = args.split(' ');
            let url = parts[0];
            const flags = parts.slice(1).join(' ').toLowerCase();

            let options = {
                width: 1280,
                height: 720,
                full_page: false,
                device_scale: 1
            };

            if (flags.includes('--full')) {
                options.full_page = true;
            }
            if (flags.includes('--mobile')) {
                options.width = 360;
                options.height = 640;
                options.device_scale = 2;
            }
            if (flags.includes('--desktop')) {
                options.width = 1920;
                options.height = 1080;
            }

            const imageUrl = await ssweb2(url, options);

            await sock.sendMessage(m.chat, {
                image: { url: imageUrl },
                caption: `📸 *Screenshot*\n🌐 ${url}\n📐 ${options.width}x${options.height}${options.full_page ? ' (Full Page)' : ''}`
            }, { quoted: m });

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in ssweb2:', error);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            await m.reply('❌ Gagal screenshot: ' + error.message);
        }
    }
};

export default handler;
