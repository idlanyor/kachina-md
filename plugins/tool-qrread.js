import QrCode from 'qrcode-reader';
import { Jimp } from 'jimp';

async function qrScanner(buffer) {
    const image = await Jimp.read(buffer);
    
    // Preprocessing untuk meningkatkan deteksi
    image.greyscale();
    image.contrast(0.5);
    
    // Coba scan dengan berbagai metode
    const attempts = [
        () => image.clone(),
        () => image.clone().normalize(),
        () => image.clone().invert(),
        () => image.clone().threshold({ max: 128 }),
    ];
    
    for (const getImage of attempts) {
        try {
            const processedImage = getImage();
            const result = await scanQr(processedImage);
            if (result) return result;
        } catch (e) {
            continue;
        }
    }
    
    throw new Error('QR Code tidak ditemukan dalam gambar');
}

function scanQr(image) {
    return new Promise((resolve, reject) => {
        const qr = new QrCode();
        qr.callback = (err, value) => {
            if (err || !value) {
                reject(err || new Error('Not found'));
            } else {
                resolve(value.result);
            }
        };
        qr.decode(image.bitmap);
    });
}

export const handler = {
    command: ['qrread', 'qr', 'scanqr', 'readqr'],
    category: 'tools',
    help: 'Membaca QR Code dari gambar',
    exec: async ({ sock, m }) => {
        try {
            let buffer = null;

            const qType = m.quoted ? (typeof m.quoted.type === 'object' ? m.quoted.type.type : m.quoted.type) : null;
            const mType = typeof m.type === 'object' ? m.type.type : m.type;

            if (m.quoted) {
                if (/image|viewOnce/.test(qType)) {
                    buffer = await m.quoted.download();
                }
            } else if (/image|viewOnce/.test(mType)) {
                buffer = await m.download();
            }

            if (!buffer) {
                await m.reply('❌ Reply atau kirim gambar QR Code untuk dibaca');
                return;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '🔍', key: m.key }
            });

            const result = await qrScanner(buffer);

            if (!result) {
                await m.reply('❌ QR Code tidak ditemukan atau tidak dapat dibaca');
                await sock.sendMessage(m.chat, {
                    react: { text: '❌', key: m.key }
                });
                return;
            }

            const isUrl = /^https?:\/\//i.test(result);

            let text = `📱 *QR CODE READER*\n\n`;
            text += `📄 *Hasil:*\n${result}\n\n`;
            text += `📌 *Tipe:* ${isUrl ? 'URL/Link' : 'Text'}`;

            await m.reply(text);

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in qrread:', error);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            await m.reply('❌ Gagal membaca QR Code: ' + error.message);
        }
    }
};

export default handler;
