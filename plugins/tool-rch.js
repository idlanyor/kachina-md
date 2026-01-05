export const handler = {
    command: ['rch', 'react'],
    category: 'tools',
    help: 'Mengirim reaksi ke post WhatsApp',
    exec: async ({ sock, m, args }) => {
        try {
            let argsArray;
            if (typeof args === 'string') {
                argsArray = args.split(' ');
            } else if (Array.isArray(args)) {
                argsArray = args;
            } else {
                argsArray = [];
            }

            if (argsArray.length < 2) {
                await sock.sendMessage(m.chat, {
                    text: `*PENGGUNAAN SALAH*\nCONTOH PENGGUNAAN 😁 : \n.rch <link_post> <emoji>\n\n📌 *Contoh:*\n.rch https://whatsapp.com/channel/xxx/123 😂 😱`
                }, { quoted: m });
                return;
            }
            const link = argsArray[0];
            const emoji = argsArray.slice(1).join(" ").replace(/,/g, " ").split(/\s+/).filter(e => e.trim()).join(",");
            await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
            let success = false;
            let lastError = 'Unknown error';
            const apiKeys = globalThis.frch || [];
            for (const apiKey of apiKeys) {
                try {
                    const url = `https://react.whyux-xec.my.id/api/rch?link=${encodeURIComponent(link)}&emoji=${encodeURIComponent(emoji)}`;
                    const res = await fetch(url, {
                        method: "GET",
                        headers: {
                            "x-api-key": apiKey
                        }
                    });
                    const json = await res.json();
                    if (json.success) {
                        let teks = `✅ *React Sent!*\n\n🔗 *Target:* ${json.link}\n🎭 *Emoji:* ${json.emojis.replace(/,/g, ' ')}\n\n🚀 *Powered by Kachina Bot*`;
                        await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
                        await sock.sendMessage(m.chat, { text: teks }, { quoted: m });
                        success = true;
                        break;
                    } else {
                        lastError = json.details?.message || json.error || 'Unknown error';
                        if (!lastError.toLowerCase().includes('limit') && !lastError.toLowerCase().includes('coin')) {
                            break;
                        }
                    }
                } catch (e) {
                    console.error(e);
                    lastError = "Terjadi Kesalahan Sistem";
                }
            }
            if (!success) {
                let teks = `❌ *GAGAL RESPONS*\n\n📝 *Pesan:* ${lastError}\n💡 *Info:* Apikey nya habis, silahkan ambil Apikey di https://asitha.top/login?ref=hillaryy2555`;
                await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                await sock.sendMessage(m.chat, { text: teks }, { quoted: m });
            }
        } catch (error) {
            console.error('Error in rch command:', error);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            await sock.sendMessage(m.chat, {
                text: '❌ Terjadi kesalahan saat memproses permintaan'
            }, { quoted: m });
        }
    }
}