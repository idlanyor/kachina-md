import Database from '../../helper/database.js'

// Premium plan configurations
export const PREMIUM_PLANS = {
  FREE: {
    name: 'Free',
    level: 0,
    dailyLimit: 50,
    features: ['basic_commands', 'basic_ai'],
    price: 0
  },
  BASIC: {
    name: 'Basic',
    level: 1,
    dailyLimit: 200,
    features: ['basic_commands', 'basic_ai', 'priority_support', 'custom_bio'],
    price: 50000
  },
  PREMIUM: {
    name: 'Premium',
    level: 2,
    dailyLimit: 500,
    features: ['all_commands', 'advanced_ai', 'priority_support', 'custom_bio', 'unlimited_stickers', 'voice_commands'],
    price: 100000
  },
  VIP: {
    name: 'VIP',
    level: 3,
    dailyLimit: 1000,
    features: ['all_commands', 'advanced_ai', 'priority_support', 'custom_bio', 'unlimited_stickers', 'voice_commands', 'exclusive_features'],
    price: 200000
  }
}

// Experience points configuration
export const XP_CONFIG = {
  messageXP: 1,
  commandXP: 5,
  dailyBonus: 50,
  levelMultiplier: 100,
  maxLevel: 100,
  maxExperience: 1000000
}

// Ranking system configuration
export const RANK_CONFIG = {
  updateInterval: 300000, // 5 minutes in milliseconds
  cacheExpiry: 600000, // 10 minutes in milliseconds
  maxRankCache: 1000 // Maximum users to cache
}

class User {
  static rankCache = {
    data: null,
    lastUpdate: 0,
    expiry: 0
  }

  static async create(userData) {
    const db = await Database.connect()

    const userId = userData.jid || userData.userId
    const defaultUser = {
      jid: userId,
      name: userData.name || '',
      number: userId,
      registered: false,
      banned: false,
      warnings: 0,
      lastChat: Date.now(),
      // New user features
      bio: '',
      level: 1,
      experience: 0,
      rank: null, // Will be calculated dynamically
      lastRankUpdate: null,
      balance: 1000, // Starting balance
      totalEarned: 0, // Total money earned
      totalSpent: 0, // Total money spent
      lastDaily: null, // Last daily bonus claim
      premiumPlan: 'FREE',
      premiumExpiry: null,
      dailyUsage: {
        commands: 0,
        messages: 0,
        lastReset: new Date().toISOString().split('T')[0]
      },
      limits: {
        dailyCommands: 50,
        dailyMessages: 100,
        stickerLimit: 10,
        downloadLimit: 5
      },
      preferences: {
        language: 'id',
        theme: 'default',
        notifications: true
      },
      achievements: [],
      joinDate: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    }

    if (!db.data.users[userId]) {
      db.data.users[userId] = defaultUser
      await db.write()
      // Update rankings after new user creation
      await this.updateAllRanks()
    }

    return db.data.users[userId]
  }

  static async getById(jid) {
    const db = await Database.connect()

    // Update untuk v7: support LID
    const normalizedJid = this.normalizeJid(jid);

    if (!db.data.users[normalizedJid]) {
      return await this.create({ jid: normalizedJid })
    }

    return db.data.users[normalizedJid]
  }

  // Tambahkan method untuk normalize JID
  static normalizeJid(jid) {
    // Implementasi normalisasi JID untuk v7
    if (jid.includes(':')) {
      return jid.split(':')[0] + '@s.whatsapp.net';
    }
    return jid;
  }

  static async update(jid, data) {
    const db = await Database.connect()

    if (!db.data.users[jid]) {
      await this.create({ jid })
    }

    db.data.users[jid] = {
      ...db.data.users[jid],
      ...data,
      lastSeen: new Date().toISOString()
    }

    await db.write()
    return db.data.users[jid]
  }

  // Registration methods
  static async register(jid, userData) {
    const user = await this.getById(jid)

    if (user.registered) {
      throw new Error('User already registered')
    }

    const updatedUser = await this.update(jid, {
      registered: true,
      name: userData.name || user.name,
      bio: userData.bio || '',
      joinDate: new Date().toISOString()
    })

    // Give initial XP for registration
    await this.addExperience(jid, 100)

    return updatedUser
  }

  static async isRegistered(jid) {
    const user = await this.getById(jid)
    return user.registered
  }

  // Bio management
  static async setBio(jid, bio) {
    const user = await this.getById(jid)

    if (!user.registered) {
      throw new Error('User must be registered to set bio')
    }

    // Check if user has premium plan for custom bio
    const plan = PREMIUM_PLANS[user.premiumPlan]
    if (plan.level < 1 && bio.length > 50) {
      throw new Error('Custom bio requires Basic plan or higher')
    }

    return await this.update(jid, { bio })
  }

  static async getBio(jid) {
    const user = await this.getById(jid)
    return user.bio || 'No bio set'
  }

  // Name management
  static async setName(jid, name) {
    const user = await this.getById(jid)

    if (!user.registered) {
      throw new Error('User must be registered to set name')
    }

    // Validasi nama
    if (!name || typeof name !== 'string') {
      throw new Error('Name must be a valid string')
    }

    // Batasi panjang nama
    if (name.length < 2) {
      throw new Error('Name must be at least 2 characters long')
    }

    if (name.length > 50) {
      throw new Error('Name must be less than 50 characters')
    }

    // Filter karakter yang tidak diinginkan
    const cleanName = name.trim().replace(/[<>"'&]/g, '')

    if (cleanName.length === 0) {
      throw new Error('Name contains invalid characters')
    }

    return await this.update(jid, { name: cleanName })
  }

  static async getName(jid) {
    const user = await this.getById(jid)
    return user.name || 'No name set'
  }

  // Leveling system
  static async addExperience(jid, xp, skipLevelUpCheck = false) {
    const user = await this.getById(jid)

    // Validasi input XP
    if (xp <= 0 || !Number.isFinite(xp)) {
      throw new Error('Invalid XP amount')
    }

    // Hitung experience baru dengan validasi overflow
    let newExperience = user.experience + xp
    if (newExperience > XP_CONFIG.maxExperience) {
      newExperience = XP_CONFIG.maxExperience
    }

    const currentLevel = user.level
    let newLevel = Math.floor(newExperience / XP_CONFIG.levelMultiplier) + 1

    // Batasi level maksimum
    if (newLevel > XP_CONFIG.maxLevel) {
      newLevel = XP_CONFIG.maxLevel
      newExperience = XP_CONFIG.maxLevel * XP_CONFIG.levelMultiplier
    }

    await this.update(jid, {
      experience: newExperience,
      level: newLevel
    })

    // Update rank after XP change
    await this.updateUserRank(jid)

    if (newLevel > currentLevel && !skipLevelUpCheck) {
      await this.handleLevelUp(jid, newLevel)
    }

    return {
      user,
      previousLevel: currentLevel,
      newLevel,
      newExperience,
      xpGained: xp,
      leveledUp: newLevel > currentLevel
    }
  }

  static async handleLevelUp(jid, newLevel) {
    // Add level up bonus dengan skipLevelUpCheck = true untuk mencegah infinite loop
    const bonusXP = Math.min(newLevel * 10, 1000) // Batasi bonus XP maksimum
    await this.addExperience(jid, bonusXP, true) // PENTING: set skipLevelUpCheck = true

    // Add achievement if applicable
    if (newLevel % 10 === 0) {
      await this.addAchievement(jid, `level_${newLevel}`)
    }
  }

  static async getLevelInfo(jid) {
    const user = await this.getById(jid)
    const currentLevelXP = (user.level - 1) * XP_CONFIG.levelMultiplier
    const nextLevelXP = user.level * XP_CONFIG.levelMultiplier
    const progress = ((user.experience - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100

    return {
      level: user.level,
      experience: user.experience,
      currentLevelXP,
      nextLevelXP,
      progress: Math.min(progress, 100),
      xpNeeded: nextLevelXP - user.experience
    }
  }

  // Premium plan management
  static async upgradePlan(jid, planName) {
    const user = await this.getById(jid)
    const plan = PREMIUM_PLANS[planName]

    if (!plan) {
      throw new Error('Invalid plan name')
    }

    if (plan.level <= PREMIUM_PLANS[user.premiumPlan].level) {
      throw new Error('Can only upgrade to higher plan')
    }

    const expiryDate = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + 1) // 1 month subscription

    return await this.update(jid, {
      premiumPlan: planName,
      premiumExpiry: expiryDate.toISOString(),
      'limits.dailyCommands': plan.dailyLimit,
      'limits.dailyMessages': plan.dailyLimit * 2
    })
  }

  static async checkPremiumStatus(jid) {
    const user = await this.getById(jid)

    if (user.premiumExpiry) {
      const expiryDate = new Date(user.premiumExpiry)
      const now = new Date()

      if (now > expiryDate) {
        // Premium expired, downgrade to free
        await this.update(jid, {
          premiumPlan: 'FREE',
          premiumExpiry: null,
          'limits.dailyCommands': PREMIUM_PLANS.FREE.dailyLimit,
          'limits.dailyMessages': PREMIUM_PLANS.FREE.dailyLimit * 2
        })
        return false
      }
    }

    return user.premiumPlan !== 'FREE'
  }

  static async getPlanFeatures(jid) {
    const user = await this.getById(jid)
    const plan = PREMIUM_PLANS[user.premiumPlan]
    return plan.features
  }

  // Usage tracking and limits
  static async incrementUsage(jid, type) {
    const user = await this.getById(jid)
    const today = new Date().toISOString().split('T')[0]

    // Reset daily usage if it's a new day
    if (user.dailyUsage.lastReset !== today) {
      user.dailyUsage = {
        commands: 0,
        messages: 0,
        lastReset: today
      }
    }

    // Check limits
    const plan = PREMIUM_PLANS[user.premiumPlan]
    const limit = type === 'command' ? plan.dailyLimit : plan.dailyLimit * 2

    if (user.dailyUsage[type + 's'] >= limit) {
      throw new Error(`Daily ${type} limit reached. Upgrade to premium for more.`)
    }

    user.dailyUsage[type + 's']++

    return await this.update(jid, {
      dailyUsage: user.dailyUsage
    })
  }

  static async checkLimit(jid, type) {
    const user = await this.getById(jid)
    const plan = PREMIUM_PLANS[user.premiumPlan]
    const limit = type === 'command' ? plan.dailyLimit : plan.dailyLimit * 2

    return {
      used: user.dailyUsage[type + 's'] || 0,
      limit,
      remaining: limit - (user.dailyUsage[type + 's'] || 0)
    }
  }

  // Achievement system
  static async addAchievement(jid, achievementId) {
    const user = await this.getById(jid)

    if (!user.achievements.includes(achievementId)) {
      const updatedAchievements = [...user.achievements, achievementId]
      await this.update(jid, { achievements: updatedAchievements })

      // Give bonus XP for achievement
      await this.addExperience(jid, 50)

      return true
    }

    return false
  }

  static async getAchievements(jid) {
    const user = await this.getById(jid)
    return user.achievements
  }

  // User statistics
  static async getStats(jid) {
    const user = await this.getById(jid)
    const levelInfo = await this.getLevelInfo(jid)
    const premiumStatus = await this.checkPremiumStatus(jid)
    const plan = PREMIUM_PLANS[user.premiumPlan]

    return {
      user: {
        name: user.name,
        number: user.number,
        registered: user.registered,
        joinDate: user.joinDate,
        lastSeen: user.lastSeen
      },
      level: levelInfo,
      premium: {
        plan: user.premiumPlan,
        planName: plan.name,
        isActive: premiumStatus,
        expiry: user.premiumExpiry,
        features: plan.features
      },
      usage: {
        today: user.dailyUsage,
        limits: user.limits
      },
      achievements: user.achievements.length,
      warnings: user.warnings,
      banned: user.banned
    }
  }

  // Admin methods
  static async banUser(jid, reason = '') {
    return await this.update(jid, {
      banned: true,
      banReason: reason,
      banDate: new Date().toISOString()
    })
  }

  static async unbanUser(jid) {
    return await this.update(jid, {
      banned: false,
      banReason: null,
      banDate: null
    })
  }

  static async addWarning(jid, reason = '') {
    const user = await this.getById(jid)
    const newWarnings = user.warnings + 1

    const updatedUser = await this.update(jid, {
      warnings: newWarnings
    })

    // Auto-ban after 3 warnings
    if (newWarnings >= 3) {
      await this.banUser(jid, 'Auto-ban: 3 warnings reached')
    }

    return updatedUser
  }

  // Search and list methods
  static async searchUsers(query) {
    const db = await Database.connect()
    const users = Object.values(db.data.users)

    return users.filter(user =>
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.number.includes(query) ||
      user.jid.includes(query)
    )
  }

  static async getTopUsers(limit = 10) {
    const db = await Database.connect()
    const users = Object.values(db.data.users)

    return users
      .filter(user => user.registered)
      .sort((a, b) => b.experience - a.experience)
      .slice(0, limit)
      .map((user, index) => ({
        rank: index + 1,
        name: user.name,
        level: user.level,
        experience: user.experience,
        premiumPlan: user.premiumPlan
      }))
  }

  static async getRegisteredUsers() {
    const db = await Database.connect()
    const users = Object.values(db.data.users)

    return users.filter(user => user.registered)
  }

  // Balance management methods
  static async addBalance(jid, amount, reason = 'Unknown') {
    const user = await this.getById(jid)
    const newBalance = user.balance + amount
    const newTotalEarned = user.totalEarned + (amount > 0 ? amount : 0)

    await this.update(jid, {
      balance: newBalance,
      totalEarned: newTotalEarned
    })

    // Log transaction
    console.log(`💰 Balance Update: ${user.name} (+${amount}) - ${reason}`)

    return newBalance
  }

  static async subtractBalance(jid, amount, reason = 'Unknown') {
    const user = await this.getById(jid)

    if (user.balance < amount) {
      throw new Error('Insufficient balance')
    }

    const newBalance = user.balance - amount
    const newTotalSpent = user.totalSpent + amount

    await this.update(jid, {
      balance: newBalance,
      totalSpent: newTotalSpent
    })

    // Log transaction
    console.log(`💸 Balance Deduct: ${user.name} (-${amount}) - ${reason}`)

    return newBalance
  }

  static async getBalance(jid) {
    const user = await this.getById(jid)
    return user.balance || 0
  }

  static async transferBalance(fromJid, toJid, amount) {
    const fromUser = await this.getById(fromJid)
    const toUser = await this.getById(toJid)

    if (fromUser.balance < amount) {
      throw new Error('Insufficient balance for transfer')
    }

    if (amount < 100) {
      throw new Error('Minimum transfer amount is 100')
    }

    // Deduct from sender
    await this.subtractBalance(fromJid, amount, `Transfer to ${toUser.name}`)

    // Add to receiver
    await this.addBalance(toJid, amount, `Transfer from ${fromUser.name}`)

    return { success: true, amount }
  }

  static async claimDaily(jid) {
    const user = await this.getById(jid)
    const today = new Date().toISOString().split('T')[0]

    if (user.lastDaily === today) {
      throw new Error('Daily bonus already claimed today')
    }

    // Calculate daily bonus based on level
    const baseBonus = 500
    const levelBonus = user.level * 50
    const premiumMultiplier = user.premiumPlan !== 'FREE' ? 1.5 : 1
    const dailyAmount = Math.floor((baseBonus + levelBonus) * premiumMultiplier)

    await this.addBalance(jid, dailyAmount, 'Daily bonus')
    await this.update(jid, { lastDaily: today })

    return dailyAmount
  }
  // Enhanced ranking system methods
  static async updateAllRanks() {
    const db = await Database.connect()
    const users = Object.values(db.data.users)

    // Sort users by experience (descending)
    const sortedUsers = users
      .filter(user => user.registered)
      .sort((a, b) => b.experience - a.experience)

    // Update ranks
    const updatePromises = sortedUsers.map(async (user, index) => {
      const newRank = index + 1
      if (user.rank !== newRank) {
        await this.update(user.jid, {
          rank: newRank,
          lastRankUpdate: new Date().toISOString()
        })
      }
    })

    await Promise.all(updatePromises)

    // Update cache
    this.rankCache = {
      data: sortedUsers.slice(0, RANK_CONFIG.maxRankCache),
      lastUpdate: Date.now(),
      expiry: Date.now() + RANK_CONFIG.cacheExpiry
    }

    console.log(`🏆 Updated ranks for ${sortedUsers.length} users`)
    return sortedUsers
  }

  static async updateUserRank(jid) {
    const db = await Database.connect()
    const user = await this.getById(jid)

    if (!user.registered) return null

    // Get all registered users sorted by experience
    const users = Object.values(db.data.users)
      .filter(u => u.registered)
      .sort((a, b) => b.experience - a.experience)

    // Find user's new rank
    const userIndex = users.findIndex(u => u.jid === jid)
    const newRank = userIndex !== -1 ? userIndex + 1 : null

    if (newRank && user.rank !== newRank) {
      await this.update(jid, {
        rank: newRank,
        lastRankUpdate: new Date().toISOString()
      })
    }

    return newRank
  }

  static async getUserRank(jid) {
    const user = await this.getById(jid)

    if (!user || !user.registered) return null

    // Check if rank is cached and recent
    if (user.rank && user.lastRankUpdate) {
      const lastUpdate = new Date(user.lastRankUpdate).getTime()
      const now = Date.now()

      // If rank was updated within the last 5 minutes, use cached rank
      if (now - lastUpdate < RANK_CONFIG.updateInterval) {
        return user.rank
      }
    }

    // Otherwise, calculate fresh rank
    return await this.updateUserRank(jid)
  }

  static async getTopUsers(limit = 10) {
    // Check cache first
    if (this.rankCache.data && Date.now() < this.rankCache.expiry) {
      return this.rankCache.data
        .slice(0, limit)
        .map((user, index) => ({
          rank: index + 1,
          jid: user.jid,
          name: user.name,
          level: user.level,
          experience: user.experience,
          premiumPlan: user.premiumPlan
        }))
    }

    // Update cache if expired
    const sortedUsers = await this.updateAllRanks()

    return sortedUsers
      .slice(0, limit)
      .map((user, index) => ({
        rank: index + 1,
        jid: user.jid,
        name: user.name,
        level: user.level,
        experience: user.experience,
        premiumPlan: user.premiumPlan
      }))
  }

  static async getRankingStats() {
    const db = await Database.connect()
    const users = Object.values(db.data.users).filter(user => user.registered)

    const totalUsers = users.length
    const averageLevel = users.reduce((sum, user) => sum + user.level, 0) / totalUsers
    const averageXP = users.reduce((sum, user) => sum + user.experience, 0) / totalUsers
    const topUser = users.sort((a, b) => b.experience - a.experience)[0]

    return {
      totalUsers,
      averageLevel: Math.round(averageLevel * 100) / 100,
      averageXP: Math.round(averageXP),
      topUser: topUser ? {
        name: topUser.name,
        level: topUser.level,
        experience: topUser.experience
      } : null,
      lastCacheUpdate: new Date(this.rankCache.lastUpdate).toISOString()
    }
  }

  static async getUserRankInfo(jid) {
    const user = await this.getById(jid)
    if (!user || !user.registered) return null

    const rank = await this.getUserRank(jid)
    const totalUsers = await this.getRegisteredUsers()
    const percentile = rank ? Math.round((1 - (rank - 1) / totalUsers.length) * 100) : 0

    return {
      rank,
      totalUsers: totalUsers.length,
      percentile,
      level: user.level,
      experience: user.experience,
      lastRankUpdate: user.lastRankUpdate
    }
  }

  // Scheduled rank update (call this periodically)
  static async scheduleRankUpdate() {
    try {
      await this.updateAllRanks()
      console.log('🔄 Scheduled rank update completed')
    } catch (error) {
      console.error('❌ Error in scheduled rank update:', error)
    }
  }
}



export default User