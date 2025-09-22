import User from '../database/models/User.js'

export default {
  name: 'setname',
  aliases: ['setname'],
  category: 'user',
  desc: 'Set atau ubah nama pengguna',
  help: 'Set atau ubah nama pengguna',
  use: '<nama_baru>',
  example: '.setname John Doe',
  
  async execute(sock, m, { args, command }) {
    try {
      // Cek apakah user sudah terdaftar
      const isRegistered = await User.isRegistered(m.sender)
      if (!isRegistered) {
        return m.reply('❌ Kamu harus mendaftar terlebih dahulu! Ketik *.register* untuk mendaftar.')
      }

      // Cek apakah nama disediakan
      if (!args.length) {
        return m.reply(`❌ Masukkan nama yang ingin diset!\n\n*Contoh:* ${command} John Doe\n\n*Aturan nama:*\n• Minimal 2 karakter\n• Maksimal 50 karakter\n• Tidak boleh mengandung karakter khusus (<>"'&)`)
      }

      const newName = args
      
      // Set nama baru
      await User.setName(m.sender, newName)
      
      // Konfirmasi berhasil
      m.reply(`✅ *Nama berhasil diubah!*\n\n📝 *Nama baru:* ${newName}\n\n💡 *Tips:* Gunakan *.profile* untuk melihat profil lengkapmu`)
      
    } catch (error) {
      console.error('Error in setname command:', error)
      
      // Handle error yang spesifik
      if (error.message.includes('must be registered')) {
        return m.reply('❌ Kamu harus mendaftar terlebih dahulu! Ketik *.register* untuk mendaftar.')
      }
      
      if (error.message.includes('at least 2 characters')) {
        return m.reply('❌ Nama harus minimal 2 karakter!')
      }
      
      if (error.message.includes('less than 50 characters')) {
        return m.reply('❌ Nama harus kurang dari 50 karakter!')
      }
      
      if (error.message.includes('invalid characters')) {
        return m.reply('❌ Nama mengandung karakter yang tidak diperbolehkan!')
      }
      
      if (error.message.includes('valid string')) {
        return m.reply('❌ Nama harus berupa teks yang valid!')
      }
      
      // Error umum
      m.reply('❌ Terjadi kesalahan saat mengubah nama. Silakan coba lagi.')
    }
  }
}