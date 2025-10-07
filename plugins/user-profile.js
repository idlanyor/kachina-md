import User from '../database/models/User.js'

export const handler = {
    command: ['me'],
    category: 'user',
    help: 'Tampilkan profil user',
    isRegistered: true,
    exec: async ({ sock, m, args }) => {
        try {
            const targetJid = m.mentionedJid?.[0] || m.sender
            const viewer = await User.getById(m.sender)
            const user = await User.getById(targetJid)
            const isOwnProfile = targetJid === m.sender

            // Set user's language for localization
            const userLang = viewer?.preferences?.language || 'id'
            globalThis.localization.setLocale(userLang)

            if (!user?.registered) {
                if (isOwnProfile) {
                    return await m.reply('❌ Kamu belum terdaftar. Ketik .register untuk mendaftar.')
                } else {
                    return await m.reply(t('user.not_registered'))
                }
            }
            
            // Get level info
            const levelInfo = await User.getLevelInfo(targetJid)
            
            // Get user avatar
            let avatarUrl = 'https://avatars.githubusercontent.com/u/159487561?v=4' // default
            try {
                const ppUrl = await sock.profilePictureUrl(targetJid, 'image')
                if (ppUrl) avatarUrl = ppUrl
            } catch (e) {
                console.log('Failed to get profile picture, using default')
            }
            
            // Calculate registration days
            const joinDate = new Date(user.joinDate || user.lastChat)
            const now = new Date()
            const daysSinceJoin = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24))
            
            // Check if can claim daily
            const today = new Date().toISOString().split('T')[0]
            const canClaimDaily = user.lastDaily !== today
            
            // Format last seen
            const lastSeen = new Date(user.lastSeen || user.lastChat)
            const timeDiff = now - lastSeen
            const minutesAgo = Math.floor(timeDiff / (1000 * 60))
            const hoursAgo = Math.floor(minutesAgo / 60)
            const daysAgo = Math.floor(hoursAgo / 24)
            
            let lastSeenText = 'Baru saja'
            if (daysAgo > 0) {
                lastSeenText = `${daysAgo} hari yang lalu`
            } else if (hoursAgo > 0) {
                lastSeenText = `${hoursAgo} jam yang lalu`
            } else if (minutesAgo > 0) {
                lastSeenText = `${minutesAgo} menit yang lalu`
            }
            
            // Premium status
            const isPremium = await User.checkPremiumStatus(targetJid)
            let premiumText = user.premiumPlan || 'FREE'
            if (isPremium && user.premiumExpiry) {
                const expiryDate = new Date(user.premiumExpiry)
                const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
                premiumText += ` (${daysLeft} hari lagi)`
            }
            
            // Usage stats
            const commandUsage = user.dailyUsage?.commands || 0
            const messageUsage = user.dailyUsage?.messages || 0
            const commandLimit = user.limits?.dailyCommands || 50
            const messageLimit = user.limits?.dailyMessages || 100
            
            // Determine rank name based on level
            let rankName = 'Newbie'
            if (user.level >= 50) rankName = 'Legend'
            else if (user.level >= 40) rankName = 'Master'
            else if (user.level >= 30) rankName = 'Expert'
            else if (user.level >= 20) rankName = 'Pro'
            else if (user.level >= 10) rankName = 'Advanced'
            else if (user.level >= 5) rankName = 'Intermediate'
            
            // Create canvas profile URL
            const canvasParams = new URLSearchParams({
                backgroundURL: 'https://i.ibb.co.com/2jMjYXK/IMG-20250103-WA0469.jpg',
                avatarURL: avatarUrl,
                rankName: rankName,
                rankId: Math.min(user.level, 50), // Max rank ID 50
                exp: user.experience || 0,
                requireExp: levelInfo.xpNeeded + (user.experience || 0),
                level: user.level || 1,
                name: user.name || 'User'
            })
            
            const canvasUrl = `https://api.siputzx.my.id/api/canvas/profile?${canvasParams.toString()}`
            
            // Send loading message
            const loadingMsg = await m.reply('🎨 Membuat profil canvas...')
            
            try {
                // Send canvas profile image
                await sock.sendMessage(m.chat, {
                    image: { url: canvasUrl },
                    caption: `👤 *${isOwnProfile ? 'PROFIL ANDA' : 'PROFIL USER'}*\n\n` +
                             `📝 *Nama:* ${user.name || 'Belum diset'}\n` +
                             `📱 *Nomor:* ${user.number || targetJid}\n` +
                             `💬 *Bio:* ${user.bio || 'Belum ada bio'}\n\n` +
                             
                             `📊 *STATISTIK*\n` +
                             `🏆 *Level:* ${user.level || 1}\n` +
                             `⭐ *Experience:* ${(user.experience || 0).toLocaleString('id-ID')} XP\n` +
                             `📈 *Progress:* ${levelInfo.progress.toFixed(1)}%\n` +
                             `🎯 *XP Dibutuhkan:* ${levelInfo.xpNeeded.toLocaleString('id-ID')}\n` +
                             `🏅 *Rank:* ${rankName}\n\n` +
                             
                             `💰 *EKONOMI*\n` +
                             `💵 *Balance:* Rp ${(user.balance || 0).toLocaleString('id-ID')}\n` +
                             `📈 *Total Earned:* Rp ${(user.totalEarned || 0).toLocaleString('id-ID')}\n` +
                             `📉 *Total Spent:* Rp ${(user.totalSpent || 0).toLocaleString('id-ID')}\n` +
                             `🎁 *Daily Bonus:* ${canClaimDaily ? '✅ Tersedia' : '❌ Sudah diklaim'}\n\n` +
                             
                             `💎 *PREMIUM*\n` +
                             `👑 *Plan:* ${premiumText}\n` +
                             `⚡ *Commands:* ${commandUsage}/${commandLimit}\n` +
                             `💬 *Messages:* ${messageUsage}/${messageLimit}\n\n` +
                             
                             `📅 *INFO AKUN*\n` +
                             `📝 *Terdaftar:* ${user.registered ? '✅ Ya' : '❌ Tidak'}\n` +
                             `🗓️ *Bergabung:* ${joinDate.toLocaleDateString('id-ID')} (${daysSinceJoin} hari)\n` +
                             `👀 *Terakhir Dilihat:* ${lastSeenText}\n` +
                             `⚠️ *Warnings:* ${user.warnings || 0}\n` +
                             `🚫 *Status:* ${user.banned ? '❌ Banned' : '✅ Aktif'}` +
                             
                             // Add achievements if any
                             (user.achievements && user.achievements.length > 0 ? 
                                 `\n\n🏆 *PENCAPAIAN*\n${user.achievements.slice(0, 5).map(a => `🏅 ${a}`).join('\n')}` +
                                 (user.achievements.length > 5 ? `\n... dan ${user.achievements.length - 5} lainnya` : '') 
                                 : ''),
                    contextInfo: {
                        externalAdReply: {
                            title: `👤 ${user.name || 'User Profile'}`,
                            body: `Level ${user.level || 1} • ${rankName} • Rp ${(user.balance || 0).toLocaleString('id-ID')}`,
                            thumbnailUrl: avatarUrl,
                            sourceUrl: globalThis.newsletterUrl,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m })
                
                // Delete loading message
                await sock.sendMessage(m.chat, { delete: loadingMsg.key })
                
            } catch (canvasError) {
                console.error('Canvas API error:', canvasError)
                
                // Fallback to text-only profile if canvas fails
                let profileText = `👤 *${isOwnProfile ? 'PROFIL ANDA' : 'PROFIL USER'}*\n\n` +
                                  `📝 *Nama:* ${user.name || 'Belum diset'}\n` +
                                  `📱 *Nomor:* ${user.number || targetJid}\n` +
                                  `💬 *Bio:* ${user.bio || 'Belum ada bio'}\n\n` +
                                  
                                  `📊 *STATISTIK*\n` +
                                  `🏆 *Level:* ${user.level || 1}\n` +
                                  `⭐ *Experience:* ${(user.experience || 0).toLocaleString('id-ID')} XP\n` +
                                  `📈 *Progress:* ${levelInfo.progress.toFixed(1)}%\n` +
                                  `🎯 *XP Dibutuhkan:* ${levelInfo.xpNeeded.toLocaleString('id-ID')}\n` +
                                  `🏅 *Rank:* ${rankName}\n\n` +
                                  
                                  `💰 *EKONOMI*\n` +
                                  `💵 *Balance:* Rp ${(user.balance || 0).toLocaleString('id-ID')}\n` +
                                  `📈 *Total Earned:* Rp ${(user.totalEarned || 0).toLocaleString('id-ID')}\n` +
                                  `📉 *Total Spent:* Rp ${(user.totalSpent || 0).toLocaleString('id-ID')}\n` +
                                  `🎁 *Daily Bonus:* ${canClaimDaily ? '✅ Tersedia' : '❌ Sudah diklaim'}\n\n` +
                                  
                                  `💎 *PREMIUM*\n` +
                                  `👑 *Plan:* ${premiumText}\n` +
                                  `⚡ *Commands:* ${commandUsage}/${commandLimit}\n` +
                                  `💬 *Messages:* ${messageUsage}/${messageLimit}\n\n` +
                                  
                                  `📅 *INFO AKUN*\n` +
                                  `📝 *Terdaftar:* ${user.registered ? '✅ Ya' : '❌ Tidak'}\n` +
                                  `🗓️ *Bergabung:* ${joinDate.toLocaleDateString('id-ID')} (${daysSinceJoin} hari)\n` +
                                  `👀 *Terakhir Dilihat:* ${lastSeenText}\n` +
                                  `⚠️ *Warnings:* ${user.warnings || 0}\n` +
                                  `🚫 *Status:* ${user.banned ? '❌ Banned' : '✅ Aktif'}`
                
                // Add achievements if any
                if (user.achievements && user.achievements.length > 0) {
                    const achievementText = user.achievements.slice(0, 5).map(a => `🏅 ${a}`).join('\n')
                    profileText += `\n\n🏆 *PENCAPAIAN*\n${achievementText}`
                    if (user.achievements.length > 5) {
                        profileText += `\n... dan ${user.achievements.length - 5} lainnya`
                    }
                }
                
                await sock.sendMessage(m.chat, {
                    text: profileText,
                    contextInfo: {
                        externalAdReply: {
                            title: `👤 ${user.name || 'User Profile'}`,
                            body: `Level ${user.level || 1} • ${rankName} • Rp ${(user.balance || 0).toLocaleString('id-ID')}`,
                            thumbnailUrl: avatarUrl,
                            sourceUrl: globalThis.newsletterUrl,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m })
                
                // Delete loading message
                await sock.sendMessage(m.chat, { delete: loadingMsg.key })
            }
            
        } catch (error) {
            console.error('Error in profile command:', error)
            await m.reply('❌ Terjadi kesalahan saat mengambil profil!')
        }
    }
}

export default handler
