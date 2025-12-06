import KBBI from '../helper/kbbi.js';

const kbbi = new KBBI();

export const handler = {
    command: ['kbbi', 'kamus'],
    category: 'tools',
    help: 'Cari arti kata di KBBI (Kamus Besar Bahasa Indonesia)',
    exec: async ({ sock, m, args, usedPrefix }) => {
        try {
            if (!args) {
                await m.reply(`📖 *KBBI - Kamus Besar Bahasa Indonesia*

*Penggunaan:*
${usedPrefix}kbbi <kata>

*Contoh:*
${usedPrefix}kbbi makan
${usedPrefix}kbbi cinta`);
                return;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '📖', key: m.key }
            });

            const result = await kbbi.search(args.trim());

            if (!result.kata || result.kata.length === 0) {
                await m.reply(`❌ Kata "${args}" tidak ditemukan di KBBI`);
                await sock.sendMessage(m.chat, {
                    react: { text: '❌', key: m.key }
                });
                return;
            }

            let text = `📖 *KBBI - ${args.toUpperCase()}*\n`;

            for (const entry of result.kata) {
                for (const [kata, details] of Object.entries(entry)) {
                    text += `\n━━━━━━━━━━━━━━━\n`;
                    text += `📝 *${kata}*\n`;

                    if (details.kata_tidak_baku) {
                        text += `⚠️ Bentuk tidak baku: ${details.kata_tidak_baku}\n`;
                    }

                    if (details.makna && details.makna.length > 0) {
                        text += `\n*Makna:*\n`;
                        details.makna.forEach((m, i) => {
                            text += `${i + 1}. _(${m.kelas_kata})_ ${m.deskripsi}\n`;
                        });
                    }

                    if (details.kata_turunan && details.kata_turunan.length > 0) {
                        text += `\n*Kata Turunan:*\n`;
                        text += details.kata_turunan.join(', ') + '\n';
                    }

                    if (details.gabungan_kata && details.gabungan_kata.length > 0) {
                        text += `\n*Gabungan Kata:*\n`;
                        text += details.gabungan_kata.join(', ') + '\n';
                    }
                }
            }

            if (result.peribahasa && result.peribahasa.length > 0) {
                text += `\n━━━━━━━━━━━━━━━\n`;
                text += `📜 *Peribahasa:*\n`;
                result.peribahasa.slice(0, 5).forEach((p, i) => {
                    text += `${i + 1}. ${p}\n`;
                });
                if (result.peribahasa.length > 5) {
                    text += `_...dan ${result.peribahasa.length - 5} lainnya_\n`;
                }
            }

            if (result.idiom && result.idiom.length > 0) {
                text += `\n━━━━━━━━━━━━━━━\n`;
                text += `💬 *Idiom:*\n`;
                result.idiom.slice(0, 5).forEach((p, i) => {
                    text += `${i + 1}. ${p}\n`;
                });
                if (result.idiom.length > 5) {
                    text += `_...dan ${result.idiom.length - 5} lainnya_\n`;
                }
            }

            text += `\n_Sumber: kbbi.kemdikbud.go.id_`;

            await m.reply(text);

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in kbbi:', error);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            await m.reply('❌ Gagal mencari kata: ' + error.message);
        }
    }
};

export default handler;
