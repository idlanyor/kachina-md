import User from '../database/models/User.js'

export const handler = {
    before: async (m, { sock }) => {
        // Skip if not a regular message or from bot
        if (!m.text || m.fromMe || m.isBot) return
        
        try {
            const userId = m.sender
            const user = await User.getById(userId)
            
            // Skip if user not registered
            if (!user || !user.registered) return
            
            // Get current level info
            const beforeLevelInfo = await User.getLevelInfo(userId)
            const currentLevel = beforeLevelInfo.level
            
            // Add XP (5-15 XP per message)
            const xpGain = Math.floor(Math.random() * 11) + 5
            await User.addExperience(userId, xpGain)
            
            // Get updated level info
            const afterLevelInfo = await User.getLevelInfo(userId)
            const newLevel = afterLevelInfo.level
            
            // Check if leveled up
            if (newLevel > currentLevel) {
                // Get user profile picture
                let avatarUrl
                try {
                    avatarUrl = await sock.profilePictureUrl(userId, 'image')
                } catch (error) {
                    avatarUrl = "https://telegra.ph/file/a6f3ef42e42b098b2c9c4.jpg"
                }
                
                // Create level-up canvas using API
                const levelUpParams = new URLSearchParams({
                    backgroundURL: 'https://i.ibb.co.com/2jMjYXK/IMG-20250103-WA0469.jpg',
                    avatarURL: avatarUrl,
                    fromLevel: currentLevel,
                    toLevel: newLevel,
                    name: user.name || 'User'
                })
                
                const levelUpUrl = `https://api.siputzx.my.id/api/canvas/level-up?${levelUpParams.toString()}`
                
                // Calculate rewards
                const balanceReward = newLevel * 1000
                const xpBonus = newLevel * 50
                
                // Add rewards
                await User.addBalance(userId, balanceReward)
                await User.addExperience(userId, xpBonus)
                
                // Get rank info
                const rankInfo = await User.getUserRankInfo(userId)
                
                // Send level up notification with canvas
                await sock.sendMessage(m.chat, {
                    image: { url: levelUpUrl },
                    caption: `🎉 **LEVEL UP!** 🎉\n\n` +
                        `👤 **${user.name || 'User'}** naik level!\n` +
                        `📊 **Level:** ${currentLevel} ➜ ${newLevel}\n` +
                        `⭐ **XP:** ${afterLevelInfo.experience.toLocaleString('id-ID')} (+${xpGain + xpBonus})\n` +
                        `🏆 **Rank:** #${rankInfo?.rank || '?'} dari ${rankInfo?.totalUsers || '?'} user\n` +
                        `💰 **Reward:** +${balanceReward.toLocaleString('id-ID')} balance\n` +
                        `🎁 **Bonus XP:** +${xpBonus} XP\n\n` +
                        `_Selamat! Terus aktif untuk naik level lagi!_`,
                    contextInfo: {
                        externalAdReply: {
                            title: `🎉 Level Up! ${currentLevel} ➜ ${newLevel}`,
                            body: `${user.name} | +${balanceReward} Balance | +${xpBonus} XP Bonus`,
                            thumbnailUrl: avatarUrl,
                            sourceUrl: 'https://github.com/kachina-md',
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m })
                
                // Update user's previous level
                await User.update(userId, { previousLevel: newLevel })
            }
            
        } catch (error) {
            console.error('Error in auto-xp:', error)
        }
    }
}

export default handler