import User from '../database/models/User.js'

export const handler = {
  command: ['lang', 'language', 'bahasa'],
  category: 'user',
  help: 'Ubah bahasa bot untuk akun Anda.',
  isRegistered: true,
  async exec({ m, args }) {
    try {
      const userId = m.sender
      const user = await User.getById(userId)

      const available = globalThis.localization.getAvailableLocales()
      const usage = '🌐 Penggunaan: .lang <id|en>\nContoh: .lang en'

      if (!args || args.trim().length === 0) {
        const currentLang = user?.preferences?.language || 'id'
        const list = available.map(lang => (lang === 'id' ? '🇮🇩' : lang === 'en' ? '🇺🇸' : '🌐') + ' ' + lang.toUpperCase()).join('\n')
        return await m.reply(`🌐 Bahasa saat ini: ${currentLang.toUpperCase()}\n\nTersedia:\n${list}\n\n${usage}`)
      }

      const newLang = args.trim().toLowerCase()
      if (!available.includes(newLang)) {
        return await m.reply(`❌ Bahasa tidak valid. Pilihan: ${available.join(', ')}\n\n${usage}`)
      }

      await User.update(userId, {
        preferences: {
          ...(user.preferences || {}),
          language: newLang
        }
      })

      globalThis.localization.setLocale(newLang)

      const flag = newLang === 'id' ? '🇮🇩' : '🇺🇸'
      const langName = newLang === 'id' ? 'Bahasa Indonesia' : 'English'
      await m.reply(`${flag} Bahasa diubah ke ${langName}`)
    } catch (error) {
      console.error('Error setting language:', error)
      await m.reply('❌ Terjadi kesalahan saat mengubah bahasa')
    }
  }
}

export default handler
