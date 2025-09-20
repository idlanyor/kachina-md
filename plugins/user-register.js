import User from '../database/models/User.js'

export const handler = {
    command: ['daftar', 'register', 'reg'],
    category: 'user',
    help: 'Daftar sebagai user bot',
    exec: async ({ sock, m, args }) => {
        try {
            const userJid = m.sender
            const user = await User.getById(userJid)
            
            // Check if already registered
            if (user.registered) {
                return await m.reply('✅ Anda sudah terdaftar sebagai user bot!')
            }
            
            // Get name from args or use pushName
            const name = args.trim() || m.pushName || 'User'
            
            // Register user
            await User.register(userJid, {
                name: name,
                registered: true,
                joinDate: new Date().toISOString()
            })
            
            // Add welcome bonus
            await User.addBalance(userJid, 1000, 'Welcome bonus')
            
            const welcomeText = `🎉 *SELAMAT DATANG!*\n\n` +
                              `✅ Registrasi berhasil!\n` +
                              `👤 *Nama:* ${name}\n` +
                              `📱 *Nomor:* ${userJid.split('@')[0]}\n` +
                              `💰 *Welcome Bonus:* Rp 1.000\n\n` +
                              
                              `🎁 *BONUS PENDAFTARAN:*\n` +
                              `• Balance awal: Rp 1.000\n` +
                              `• Level 1 dengan 0 XP\n` +
                              `• Akses ke semua fitur bot\n\n` +
                              
                              `📋 *FITUR YANG TERSEDIA:*\n` +
                              `• \`.me\` - Lihat profil Anda\n` +
                              `• \`.balance\` - Cek saldo\n` +
                              `• \`.daily\` - Bonus harian\n` +
                              `• \`.transfer\` - Transfer saldo\n` +
                              `• Game Family100, Caklontong, Sinonim\n` +
                              `• Dan masih banyak lagi!\n\n` +
                              
                              `💡 *Tips:* Gunakan \`.help\` untuk melihat semua command yang tersedia!`
            
            await sock.sendMessage(m.chat, {
                text: welcomeText,
                contextInfo: {
                    externalAdReply: {
                        title: '🎉 Registrasi Berhasil!',
                        body: `Selamat datang ${name}! Bonus Rp 1.000 telah ditambahkan.`,
                        thumbnailUrl: globalThis.ppUrl,
                        sourceUrl: globalThis.newsletterUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })
            
        } catch (error) {
            console.error('Error in register command:', error)
            await m.reply('❌ Terjadi kesalahan saat mendaftar. Silakan coba lagi!')
        }
    }
}

export default handler