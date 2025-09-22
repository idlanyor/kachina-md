import axios from 'axios';

export const handler = {
    command: ['iqc'],
    category: 'image',
    help: 'Membuat gambar quote dengan teks yang diberikan. Gunakan .iqc <teks>',
    exec: async ({ m, args, sock }) => {
        try {
            // Validasi input
            if (!args || !args.trim()) {
                await m.reply(`✨ *IMAGE QUOTE CREATOR*\n\nCara penggunaan:\n.iqc <teks>\n\nContoh:\n.iqc Hello World! ✨✨✨`);
                return;
            }

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Encode teks untuk URL
            const encodedText = encodeURIComponent(args.trim());
            
            // Panggil API Ryzumi untuk IQC
            const response = await axios.get(`https://api.ryzumi.vip/api/image/iqc?text=${encodedText}`, {
                responseType: 'arraybuffer',
                timeout: 30000 // 30 detik timeout
            });

            // Check if response is image data
            if (response.data && response.data.byteLength > 0) {
                // Send processed image
                await sock.sendMessage(m.chat, {
                    image: Buffer.from(response.data),
                    caption: `✨ *IMAGE QUOTE CREATOR*\n\n📝 *Teks:* ${args.trim()}\n⏰ *Dibuat:* ${new Date().toLocaleString('id-ID')}`,
                    contextInfo: {
                        externalAdReply: {
                            title: '✨ Image Quote Creator',
                            body: 'Buat quote indah dengan teks pilihan Anda',
                            thumbnailUrl: `${globalThis.ppUrl}`,
                            sourceUrl: `${globalThis.newsletterUrl}`,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                });

                // Tambahkan reaksi sukses
                await sock.sendMessage(m.chat, {
                    react: { text: '✅', key: m.key }
                });
            } else {
                throw new Error('Tidak ada data gambar yang diterima');
            }

        } catch (error) {
            console.error('Error in iqc command:', error);
            
            // Add error reaction
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            
            let errorMessage = '❌ Gagal membuat image quote!';
            
            if (error.code === 'ECONNREFUSED') {
                errorMessage += '\n\n*Penyebab:* Server API tidak dapat diakses.';
            } else if (error.response?.status === 400) {
                errorMessage += '\n\n*Penyebab:* Parameter tidak valid.';
            } else if (error.response?.status === 429) {
                errorMessage += '\n\n*Penyebab:* Terlalu banyak request, coba lagi nanti.';
            } else {
                errorMessage += `\n\n*Error:* ${error.message}`;
            }

            await m.reply(errorMessage);
        }
    }
};

export default handler;