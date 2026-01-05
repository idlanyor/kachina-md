import UnifiedGroup from '../database/models/UnifiedGroup.js';
import { cacheGroupMetadata, clearGroupCache } from './caching.js';
import { logger } from './logger.js';

// Spam tracking with memory management
const spamTracker = new Map();
const SPAM_TRACKER_CLEANUP_INTERVAL = 60000; // 1 minute

// Clean up old spam tracking data periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of spamTracker.entries()) {
        // Remove entries older than 5 minutes
        if (now - data.lastActivity > 300000) {
            spamTracker.delete(key);
        }
    }
}, SPAM_TRACKER_CLEANUP_INTERVAL);

export async function improvedGroupModerationMiddleware(sock, m, next) {
    try {
        // Only process group messages
        if (!m.isGroup) {
            return next();
        }

        const groupId = m.chat;
        const senderId = m.sender;
        
        // Get group settings with unified model
        const settings = await UnifiedGroup.getSettings(groupId);
        
        // Track member activity and sync with actual group metadata
        await trackMemberActivity(sock, groupId, senderId, m);
        
        // Check if member is banned
        if (await UnifiedGroup.isMemberBanned(groupId, senderId)) {
            logger.info(`Banned user ${senderId} attempted to send message in group ${groupId}`);
            // Don't process the message further for banned users
            return;
        }

        // Process moderation features
        let messageDeleted = false;
        
        // Anti-spam check
        if (settings.antiSpam && !m.isAdmin) {
            messageDeleted = await handleAntiSpam(sock, m, groupId, senderId, settings);
            if (messageDeleted) return;
        }

        // Anti-link check
        if (settings.antiLink && !m.isAdmin && m.type === 'text') {
            messageDeleted = await handleAntiLink(sock, m, groupId, senderId, settings);
            if (messageDeleted) return;
        }

        // Anti-toxic check
        if (settings.antiToxic && !m.isAdmin && m.type === 'text') {
            messageDeleted = await handleAntiToxic(sock, m, groupId, senderId, settings);
            if (messageDeleted) return;
        }

        // Anti-media check
        if (settings.antiMedia && !m.isAdmin && settings.mediaTypes.includes(m.type)) {
            messageDeleted = await handleAntiMedia(sock, m, groupId, senderId, settings);
            if (messageDeleted) return;
        }

        // Update message statistics
        await UnifiedGroup.incrementStat(groupId, 'messages');
        
        // Handle auto-delete if enabled
        await handleAutoDelete(sock, m, groupId, settings);
        
        // Continue to next middleware
        next();
        
    } catch (error) {
        logger.error('Group moderation middleware error:', error);
        next(); // Continue processing even if middleware fails
    }
}

async function trackMemberActivity(sock, groupId, senderId, m) {
    try {
        // Update member's last seen and add if new
        await UnifiedGroup.addOrUpdateMember(groupId, senderId, {
            name: m.pushName || 'Unknown',
            lastSeen: new Date().toISOString()
        });
        
        // Periodically sync with actual group metadata (every 10 messages per group)
        const syncKey = `sync_${groupId}`;
        const currentCount = (spamTracker.get(syncKey)?.count || 0) + 1;
        
        if (currentCount >= 10) {
            try {
                const groupMetadata = await sock.groupMetadata(groupId);
                await UnifiedGroup.syncGroupMembers(groupId, groupMetadata);
                
                // Clear cache after sync
                clearGroupCache(groupId);
                
                // Reset counter
                spamTracker.set(syncKey, { count: 0, lastActivity: Date.now() });
            } catch (error) {
                logger.warn('Failed to sync group metadata:', error);
            }
        } else {
            spamTracker.set(syncKey, { count: currentCount, lastActivity: Date.now() });
        }
        
    } catch (error) {
        logger.error('Error tracking member activity:', error);
    }
}

async function handleAntiSpam(sock, m, groupId, senderId, settings) {
    try {
        const spamKey = `${groupId}-${senderId}`;
        const now = Date.now();
        
        if (!spamTracker.has(spamKey)) {
            spamTracker.set(spamKey, {
                messages: [],
                lastWarning: 0,
                lastActivity: now
            });
        }
        
        const userSpam = spamTracker.get(spamKey);
        userSpam.messages.push(now);
        userSpam.lastActivity = now;
        
        // Remove old messages outside time window
        userSpam.messages = userSpam.messages.filter(
            time => now - time < settings.spamTimeWindow
        );
        
        if (userSpam.messages.length >= settings.spamThreshold) {
            const action = determineAction(settings, 'spam', senderId, groupId);
            
            if (action.action === 'warn') {
                await UnifiedGroup.warnMember(groupId, senderId, 'Spam detected');
                await m.reply('⚠️ *Spam Warning*\nPlease slow down your messages.');
            } else if (action.action === 'kick') {
                await UnifiedGroup.warnMember(groupId, senderId, 'Spam - Auto kick');
                await sock.groupParticipantsUpdate(groupId, [senderId], 'remove');
                await m.reply(`🚫 *Auto Kick*\n@${senderId.split('@')[0]} has been kicked for spam.`);
            } else if (action.action === 'ban') {
                await UnifiedGroup.banMember(groupId, senderId, 'Spam - Auto ban');
                await sock.groupParticipantsUpdate(groupId, [senderId], 'remove');
                await m.reply(`🚫 *Auto Ban*\n@${senderId.split('@')[0]} has been banned for spam.`);
            }
            
            // Clear spam messages
            userSpam.messages = [];
            return true; // Message was handled
        }
        
        return false;
        
    } catch (error) {
        logger.error('Error handling anti-spam:', error);
        return false;
    }
}

async function handleAntiLink(sock, m, groupId, senderId, settings) {
    try {
        const message = m.message.conversation || '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = message.match(urlRegex);
        
        if (urls) {
            const hasWhitelistedLink = urls.some(url => 
                settings.whitelistLinks.some(whitelist => 
                    url.includes(whitelist)
                )
            );
            
            if (!hasWhitelistedLink) {
                const action = determineAction(settings, 'link', senderId, groupId);
                
                if (action.action === 'warn') {
                    await UnifiedGroup.warnMember(groupId, senderId, 'Link sharing not allowed');
                    await m.reply('⚠️ *Link Warning*\nSharing links is not allowed in this group.');
                } else if (action.action === 'kick') {
                    await UnifiedGroup.warnMember(groupId, senderId, 'Link - Auto kick');
                    await sock.groupParticipantsUpdate(groupId, [senderId], 'remove');
                    await m.reply(`🚫 *Auto Kick*\n@${senderId.split('@')[0]} has been kicked for sharing links.`);
                } else if (action.action === 'ban') {
                    await UnifiedGroup.banMember(groupId, senderId, 'Link - Auto ban');
                    await sock.groupParticipantsUpdate(groupId, [senderId], 'remove');
                    await m.reply(`🚫 *Auto Ban*\n@${senderId.split('@')[0]} has been banned for sharing links.`);
                }
                
                // Delete the message
                await sock.sendMessage(groupId, { delete: m.key });
                return true;
            }
        }
        
        return false;
        
    } catch (error) {
        logger.error('Error handling anti-link:', error);
        return false;
    }
}

async function handleAntiToxic(sock, m, groupId, senderId, settings) {
    try {
        const message = m.message.conversation || '';
        const hasToxicWord = settings.toxicWords.some(word => 
            message.toLowerCase().includes(word.toLowerCase())
        );
        
        if (hasToxicWord) {
            const action = determineAction(settings, 'toxic', senderId, groupId);
            
            if (action.action === 'warn') {
                await UnifiedGroup.warnMember(groupId, senderId, 'Toxic language detected');
                await m.reply('⚠️ *Toxic Warning*\nPlease use appropriate language.');
            } else if (action.action === 'kick') {
                await UnifiedGroup.warnMember(groupId, senderId, 'Toxic - Auto kick');
                await sock.groupParticipantsUpdate(groupId, [senderId], 'remove');
                await m.reply(`🚫 *Auto Kick*\n@${senderId.split('@')[0]} has been kicked for toxic language.`);
            } else if (action.action === 'ban') {
                await UnifiedGroup.banMember(groupId, senderId, 'Toxic - Auto ban');
                await sock.groupParticipantsUpdate(groupId, [senderId], 'remove');
                await m.reply(`🚫 *Auto Ban*\n@${senderId.split('@')[0]} has been banned for toxic language.`);
            }
            
            // Delete the message
            await sock.sendMessage(groupId, { delete: m.key });
            return true;
        }
        
        return false;
        
    } catch (error) {
        logger.error('Error handling anti-toxic:', error);
        return false;
    }
}

async function handleAntiMedia(sock, m, groupId, senderId, settings) {
    try {
        const action = determineAction(settings, 'media', senderId, groupId);
        
        if (action.action === 'warn') {
            await UnifiedGroup.warnMember(groupId, senderId, 'Media sharing not allowed');
            await m.reply('⚠️ *Media Warning*\nSharing media is not allowed in this group.');
        } else if (action.action === 'kick') {
            await UnifiedGroup.warnMember(groupId, senderId, 'Media - Auto kick');
            await sock.groupParticipantsUpdate(groupId, [senderId], 'remove');
            await m.reply(`🚫 *Auto Kick*\n@${senderId.split('@')[0]} has been kicked for sharing media.`);
        } else if (action.action === 'ban') {
            await UnifiedGroup.banMember(groupId, senderId, 'Media - Auto ban');
            await sock.groupParticipantsUpdate(groupId, [senderId], 'remove');
            await m.reply(`🚫 *Auto Ban*\n@${senderId.split('@')[0]} has been banned for sharing media.`);
        }
        
        // Delete the message
        await sock.sendMessage(groupId, { delete: m.key });
        return true;
        
    } catch (error) {
        logger.error('Error handling anti-media:', error);
        return false;
    }
}

async function handleAutoDelete(sock, m, groupId, settings) {
    try {
        if (settings.autoDelete && settings.deleteCommands && m.isCommand) {
            setTimeout(async () => {
                try {
                    await sock.sendMessage(groupId, { delete: m.key });
                } catch (error) {
                    logger.error('Auto delete error:', error);
                }
            }, settings.deleteCommandsDelay);
        }
    } catch (error) {
        logger.error('Error handling auto delete:', error);
    }
}

function determineAction(settings, violationType, senderId, groupId) {
    // Default thresholds
    const thresholds = {
        'spam': 3,
        'link': 2,
        'promote': 1,
        'toxic': 2,
        'media': 2
    };
    
    const threshold = thresholds[violationType] || 3;
    const actionType = `${violationType}Action`;
    const defaultAction = settings[actionType] || 'warn';
    
    // Check warning count
    const warningCount = UnifiedGroup.getMemberWarningsCount(groupId, senderId);
    
    if (warningCount >= threshold) {
        return { action: defaultAction, reason: `Too many ${violationType} violations` };
    }
    
    return { action: 'warn', reason: `${violationType} violation` };
}

// Welcome/Goodbye handler with unified model
export async function handleGroupEvents(sock, event) {
    try {
        const { id: groupId, participants, action } = event;
        const settings = await UnifiedGroup.getSettings(groupId);
        
        if (action === 'add' && participants.length > 0 && settings.welcome) {
            for (const participant of participants) {
                // Add member to database
                await UnifiedGroup.addOrUpdateMember(groupId, participant, {
                    name: participant.split('@')[0],
                    joinDate: new Date().toISOString()
                });
                
                const welcomeMsg = settings.welcomeMessage
                    .replace('@user', `@${participant.split('@')[0]}`)
                    .replace('@group', event.subject || 'Group');
                
                await sock.sendMessage(groupId, {
                    text: `🎉 *Welcome!*\n\n${welcomeMsg}`,
                    mentions: [participant]
                });
            }
        }
        
        if (action === 'remove' && participants.length > 0 && settings.goodbye) {
            for (const participant of participants) {
                // Remove member from database (but keep if banned)
                if (!(await UnifiedGroup.isMemberBanned(groupId, participant))) {
                    await UnifiedGroup.removeMember(groupId, participant);
                }
                
                const goodbyeMsg = settings.goodbyeMessage
                    .replace('@user', `@${participant.split('@')[0]}`)
                    .replace('@group', event.subject || 'Group');
                
                await sock.sendMessage(groupId, {
                    text: `👋 *Goodbye!*\n\n${goodbyeMsg}`,
                    mentions: [participant]
                });
            }
        }
        
    } catch (error) {
        logger.error('Group events handler error:', error);
    }
}

// Logging handler with unified model
export async function handleGroupLogging(sock, m, action, details = {}) {
    try {
        if (!m.isGroup) return;
        
        const groupId = m.chat;
        const settings = await UnifiedGroup.getSettings(groupId);
        
        if (settings.enableLogs && settings.logGroup) {
            const logMessage = `📊 *Group Log*\n\n` +
                `🏷️ *Group:* ${m.chat}\n` +
                `👤 *User:* @${m.sender.split('@')[0]}\n` +
                `⚡ *Action:* ${action}\n` +
                `📝 *Details:* ${JSON.stringify(details, null, 2)}\n` +
                `🕒 *Time:* ${new Date().toLocaleString('id-ID')}`;
            
            await sock.sendMessage(settings.logGroup, { 
                text: logMessage,
                mentions: [m.sender]
            });
        }
        
    } catch (error) {
        logger.error('Group logging error:', error);
    }
}