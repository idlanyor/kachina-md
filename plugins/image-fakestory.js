import axios from "axios";

export const handler = {
    command: ["fakestory", "fs"],
    help: "fake story Instagram.",
    category: 'image',

    async exec({ m, args, sock }) {
        try {
            let caption = args;
            let username = "User";
            let avatar = "https://telegra.ph/file/8360caca1efd0f697d122.jpg"; // default avatar

            // Jika tidak ada caption tapi ada reply
            if (!caption && m.quoted) {
                caption = m.quoted.text || m.quoted.message?.conversation || "";

                // Ambil nama
                if (m.quoted.participant) {
                    const contact = await sock.onWhatsApp(m.quoted.participant);
                    username = contact[0]?.notify || m.quoted.pushName || "User";
                } else {
                    username = m.quoted?.pushName || "User";
                }

                // Ambil avatar
                try {
                    const ppUrl = await sock.profilePictureUrl(
                        m.quoted.participant || m.quoted.key.remoteJid,
                        "image"
                    );
                    if (ppUrl) avatar = ppUrl;
                } catch { }
            }
            // Jika ada caption, ambil dari pesan sekarang
            else if (caption) {
                username = m.pushName || "User";
                try {
                    const ppUrl = await sock.profilePictureUrl(
                        m.sender,
                        "image"
                    );
                    if (ppUrl) avatar = ppUrl;
                } catch { }
            }

            // Validasi input
            if (!caption || caption.trim() === "") {
                await m.reply(
                    `📱 *FAKE STORY MAKER*\n\nCara pakai:\n1. .fakestory <caption>\n2. Reply pesan dengan .fakestory\n\nContoh:\n.fakestory Hello World! ✨✨✨\n.fakestory Selamat pagi semua\n\n📌 Username dan avatar otomatis dari profil.`
                );
                return;
            }

            caption = caption.trim();

            // Kasih reaksi loading
            await sock.sendMessage(m.chat, {
                react: { text: "⏳", key: m.key },
            });

            // Call API
            const apiUrl = "https://api.ryzumi.vip/api/image/fake-story";
            const response = await axios.get(`${apiUrl}?username=${encodeURIComponent(username)}&caption=${encodeURIComponent(caption)}&avatar=${encodeURIComponent(avatar)}`, {
                responseType: "arraybuffer",
                headers: { accept: "image/png" },
                timeout: 30000,
            });

            if (!response.data) throw new Error("Gagal membuat fake story");

            // Kirim gambar
            await sock.sendMessage(m.chat, { 
                image: Buffer.from(response.data),
                caption: `✨ *Fake Story by ${username}*`
            }, { quoted: m });

            // Reaksi sukses
            await sock.sendMessage(m.chat, {
                react: { text: "✅", key: m.key },
            });
        } catch (error) {
            console.error("Error di fakestory command:", error);

            let msg = "❌ Gagal membuat fake story!";
            if (error.code === "ENOTFOUND") msg += "\n\n*Penyebab:* Server API gak ketemu.";
            else if (error.code === "ECONNABORTED") msg += "\n\n*Penyebab:* Timeout, coba lagi.";
            else if (error.response?.status === 400) msg += "\n\n*Penyebab:* Parameter salah.";
            else if (error.response?.status === 429) msg += "\n\n*Penyebab:* Kebanyakan request, sabar napa.";
            else msg += `\n\n*Error:* ${error.message}`;

            await m.reply(msg);
            await sock.sendMessage(m.chat, {
                react: { text: "❌", key: m.key },
            });
        }
    },
};

export default handler;