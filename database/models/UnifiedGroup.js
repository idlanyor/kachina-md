import Database from '../../helper/database.js';
import { clearGroupCache } from '../../helper/caching.js';
import { logger } from '../../helper/logger.js';

// Default group settings - unified structure
const defaultSettings = {
    // Basic settings
    name: '',
    description: '',
    welcome: false,
    goodbye: false, // Changed from 'leave' to 'goodbye' for consistency
    welcomeMessage: 'Selamat datang @user di grup @group!',
    goodbyeMessage: 'Selamat tinggal @user dari grup @group!',
    
    // Anti-spam settings
    antiSpam: false,
    spamThreshold: 5,
    spamTimeWindow: 10000, // 10 seconds
    spamAction: 'warn', // warn, kick, ban
    
    // Anti-link settings
    antiLink: false,
    whitelistLinks: ['youtube.com', 'youtu.be', 'facebook.com', 'instagram.com', 'tiktok.com'],
    linkAction: 'warn', // warn, kick, ban
    
    // Anti-promote settings
    antiPromote: false,
    promoteAction: 'warn', // warn, kick, ban
    
    // Anti-toxic settings
    antiToxic: false,
    toxicWords: ['anjing', 'bangsat', 'kontol', 'memek', 'babi', 'asu'],
    toxicAction: 'warn', // warn, kick, ban
    
    // Anti-media settings
    antiMedia: false,
    mediaTypes: ['image', 'video', 'audio', 'document'],
    mediaAction: 'warn', // warn, kick, ban
    
    // Auto-delete settings
    autoDelete: false,
    deleteCommands: true,
    deleteCommandsDelay: 30000, // 30 seconds
    
    // Member management
    maxMembers: 0, // 0 = unlimited
    autoKickInactive: false,
    inactiveDays: 30,
    
    // Admin settings
    onlyAdmin: false,
    adminCommands: ['kick', 'ban', 'promote', 'demote'],
    
    // Logging
    enableLogs: false,
    logGroup: '',
    
    // Custom commands
    customCommands: {},
    
    // Statistics
    stats: {
        messages: 0,
        commands: 0,
        kicks: 0,
        bans: 0,
        warnings: 0
    },
    
    // Member tracking
    members: [],
    bannedMembers: [],
    warnedMembers: {},
    
    // Auto open/close settings
    autoOpen: false,
    autoOpenTime: '05:00', // Format: HH:MM
    autoClose: false,
    autoCloseTime: '21:00', // Format: HH:MM
    lastAutoOpenExecuted: null, // Timestamp of last auto open execution
    lastAutoCloseExecuted: null, // Timestamp of last auto close execution

    // Prayer notification (legacy support)
    prayerNotification: false,

    // Timestamps
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
}

class UnifiedGroup {
    static async getSettings(groupId) {
        try {
            // First, try to get from the new Group model
            const db = await Database.connect()
            
            if (!db.data.groups[groupId]) {
                // Initialize with default settings
                db.data.groups[groupId] = { ...defaultSettings }
                await db.write()
                logger.info(`Initialized new group settings for: ${groupId}`)
            } else {
                // Migrate old settings to new structure if needed
                const groupData = db.data.groups[groupId]
                let needsMigration = false
                
                // Check for old field names and migrate
                if (groupData.leave !== undefined && groupData.goodbye === undefined) {
                    groupData.goodbye = groupData.leave
                    delete groupData.leave
                    needsMigration = true
                }
                
                if (groupData.leaveMessage !== undefined && groupData.goodbyeMessage === undefined) {
                    groupData.goodbyeMessage = groupData.leaveMessage
                    delete groupData.leaveMessage
                    needsMigration = true
                }
                
                // Ensure all default fields exist
                for (const [key, defaultValue] of Object.entries(defaultSettings)) {
                    if (groupData[key] === undefined) {
                        groupData[key] = defaultValue
                        needsMigration = true
                    }
                }
                
                if (needsMigration) {
                    groupData.updatedAt = new Date().toISOString()
                    await db.write()
                    logger.info(`Migrated group settings for: ${groupId}`)
                }
            }
            
            return db.data.groups[groupId]
            
        } catch (error) {
            logger.error('Error getting group settings:', error)
            return { ...defaultSettings }
        }
    }

    static async updateSetting(groupId, feature, value) {
        try {
            const db = await Database.connect()
            const settings = await this.getSettings(groupId)
            
            // Handle nested updates
            if (feature.includes('.')) {
                const keys = feature.split('.')
                let current = settings
                for (let i = 0; i < keys.length - 1; i++) {
                    if (!current[keys[i]]) current[keys[i]] = {}
                    current = current[keys[i]]
                }
                current[keys[keys.length - 1]] = value
            } else {
                settings[feature] = value
            }
            
            settings.updatedAt = new Date().toISOString()
            db.data.groups[groupId] = settings
            await db.write()
            
            // Clear cache to ensure fresh data
            clearGroupCache(groupId)
            
            logger.info(`Updated group setting: ${groupId}.${feature} = ${value}`)
            return settings
            
        } catch (error) {
            logger.error('Error updating group setting:', error)
            throw error
        }
    }

    // Member management with proper tracking
    static async addOrUpdateMember(groupId, memberId, memberInfo = {}, options = { write: true }) {
        try {
            const settings = await this.getSettings(groupId)
            const existingMemberIndex = settings.members.findIndex(m => m.id === memberId)
            
            const memberData = {
                id: memberId,
                name: memberInfo.name || '',
                joinDate: memberInfo.joinDate || new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                ...memberInfo
            }
            
            if (existingMemberIndex >= 0) {
                // Update existing member
                settings.members[existingMemberIndex] = {
                    ...settings.members[existingMemberIndex],
                    ...memberData,
                    joinDate: settings.members[existingMemberIndex].joinDate // Preserve original join date
                }
            } else {
                // Add new member
                settings.members.push(memberData)
            }
            
            if (options.write) {
                await this.updateSetting(groupId, 'members', settings.members)
            }
            logger.info(`Added/updated member: ${memberId} in group: ${groupId}`)
            
            return settings
            
        } catch (error) {
            logger.error('Error adding/updating member:', error)
            throw error
        }
    }

    static async removeMember(groupId, memberId, options = { write: true }) {
        try {
            const settings = await this.getSettings(groupId)
            settings.members = settings.members.filter(m => m.id !== memberId)
            if (options.write) {
                await this.updateSetting(groupId, 'members', settings.members)
            }
            logger.info(`Removed member: ${memberId} from group: ${groupId}`)
            return settings
        } catch (error) {
            logger.error('Error removing member:', error)
            throw error
        }
    }

    // Ban management
    static async banMember(groupId, memberId, reason = '') {
        try {
            const settings = await this.getSettings(groupId)
            
            // Initialize bannedMembers if it doesn't exist
            if (!settings.bannedMembers) {
                settings.bannedMembers = []
            }
            
            // Check if already banned
            if (settings.bannedMembers.some(m => m.id === memberId)) {
                logger.warn(`Member ${memberId} is already banned in group ${groupId}`)
                return settings
            }
            
            const bannedMember = {
                id: memberId,
                bannedAt: new Date().toISOString(),
                reason: reason
            }
            
            settings.bannedMembers.push(bannedMember)
            await this.updateSetting(groupId, 'bannedMembers', settings.bannedMembers)
            
            // Update stats
            if (!settings.stats) settings.stats = {}
            settings.stats.bans = (settings.stats.bans || 0) + 1
            await this.updateSetting(groupId, 'stats', settings.stats)
            
            logger.info(`Banned member: ${memberId} from group: ${groupId}, reason: ${reason}`)
            return settings
            
        } catch (error) {
            logger.error('Error banning member:', error)
            throw error
        }
    }

    static async unbanMember(groupId, memberId) {
        try {
            const settings = await this.getSettings(groupId)
            
            if (!settings.bannedMembers) {
                settings.bannedMembers = []
            }
            
            const originalLength = settings.bannedMembers.length
            settings.bannedMembers = settings.bannedMembers.filter(m => m.id !== memberId)
            
            if (settings.bannedMembers.length === originalLength) {
                logger.warn(`Member ${memberId} was not banned in group ${groupId}`)
            } else {
                await this.updateSetting(groupId, 'bannedMembers', settings.bannedMembers)
                logger.info(`Unbanned member: ${memberId} from group: ${groupId}`)
            }
            
            return settings
            
        } catch (error) {
            logger.error('Error unbanning member:', error)
            throw error
        }
    }

    // Warning management
    static async warnMember(groupId, memberId, reason = '') {
        try {
            const settings = await this.getSettings(groupId)
            
            // Initialize warnedMembers if it doesn't exist
            if (!settings.warnedMembers) {
                settings.warnedMembers = {}
            }
            
            const warning = {
                id: memberId,
                warnedAt: new Date().toISOString(),
                reason: reason
            }
            
            if (!settings.warnedMembers[memberId]) {
                settings.warnedMembers[memberId] = []
            }
            settings.warnedMembers[memberId].push(warning)
            
            await this.updateSetting(groupId, 'warnedMembers', settings.warnedMembers)
            
            // Update stats
            if (!settings.stats) settings.stats = {}
            settings.stats.warnings = (settings.stats.warnings || 0) + 1
            await this.updateSetting(groupId, 'stats', settings.stats)
            
            logger.info(`Warned member: ${memberId} in group: ${groupId}, reason: ${reason}`)
            return settings
            
        } catch (error) {
            logger.error('Error warning member:', error)
            throw error
        }
    }

    static async getMemberWarnings(groupId, memberId) {
        try {
            const settings = await this.getSettings(groupId)
            return (settings.warnedMembers || {})[memberId] || []
        } catch (error) {
            logger.error('Error getting member warnings:', error)
            return []
        }
    }

    static async clearMemberWarnings(groupId, memberId) {
        try {
            const settings = await this.getSettings(groupId)
            
            if (!settings.warnedMembers) {
                settings.warnedMembers = {}
            }
            
            delete settings.warnedMembers[memberId]
            await this.updateSetting(groupId, 'warnedMembers', settings.warnedMembers)
            
            logger.info(`Cleared warnings for member: ${memberId} in group: ${groupId}`)
            return settings
            
        } catch (error) {
            logger.error('Error clearing member warnings:', error)
            throw error
        }
    }

    // Utility methods
    static async isMemberBanned(groupId, memberId) {
        try {
            const settings = await this.getSettings(groupId)
            return (settings.bannedMembers || []).some(m => m.id === memberId)
        } catch (error) {
            logger.error('Error checking if member is banned:', error)
            return false
        }
    }

    static async getMemberWarningsCount(groupId, memberId) {
        try {
            const warnings = await this.getMemberWarnings(groupId, memberId)
            return warnings.length
        } catch (error) {
            logger.error('Error getting member warnings count:', error)
            return 0
        }
    }

    // Statistics
    static async incrementStat(groupId, statType) {
        try {
            const settings = await this.getSettings(groupId)
            if (!settings.stats) settings.stats = {}
            
            if (settings.stats[statType] !== undefined) {
                settings.stats[statType]++
                await this.updateSetting(groupId, 'stats', settings.stats)
            }
            
            return settings
        } catch (error) {
            logger.error('Error incrementing stat:', error)
            throw error
        }
    }

    // Bulk operations for better performance
    static async syncGroupMembers(groupId, groupMetadata) {
        try {
            const settings = await this.getSettings(groupId)
            const currentMemberIds = new Set(settings.members.map(m => m.id))
            const actualMemberIds = new Set(groupMetadata.participants.map(p => p.id))
            let membersModified = false

            // Add new members
            for (const participant of groupMetadata.participants) {
                if (!currentMemberIds.has(participant.id)) {
                    await this.addOrUpdateMember(groupId, participant.id, {
                        name: participant.notify || participant.name || participant.id.split('@')[0],
                        isAdmin: participant.admin || false
                    }, { write: false })
                    membersModified = true
                }
            }
            
            // Remove members who left (but keep banned members)
            for (const memberId of currentMemberIds) {
                if (!actualMemberIds.has(memberId) && !(await this.isMemberBanned(groupId, memberId))) {
                    await this.removeMember(groupId, memberId, { write: false })
                    membersModified = true
                }
            }

            if (membersModified) {
                await this.updateSetting(groupId, 'members', settings.members)
            }
            
            logger.info(`Synced members for group: ${groupId}`)
            return settings
            
        } catch (error) {
            logger.error('Error syncing group members:', error)
            throw error
        }
    }
}

export default UnifiedGroup