import Group from '../database/models/Group.js';
import { logger } from '../helper/logger.js';

class GroupScheduler {
    constructor() {
        this.interval = null;
        this.sock = null;
    }

    // Initialize scheduler with WhatsApp socket
    init(sock) {
        this.sock = sock;

        // Run check every minute
        this.interval = setInterval(() => {
            this.checkScheduledActions();
        }, 60 * 1000); // Check every 60 seconds

        logger.info('Group Scheduler initialized');
    }

    // Stop scheduler
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            logger.info('Group Scheduler stopped');
        }
    }

    // Check if action was recently executed (within 2 minutes)
    wasRecentlyExecuted(lastExecutedTimestamp) {
        if (!lastExecutedTimestamp) return false;

        const now = new Date();
        const lastExecuted = new Date(lastExecutedTimestamp);
        const diffMinutes = (now - lastExecuted) / (1000 * 60);

        // Return true if executed within last 2 minutes (prevents duplicate execution)
        return diffMinutes < 2;
    }

    // Check all groups for scheduled actions
    async checkScheduledActions() {
        try {
            if (!this.sock || !this.sock.user) {
                return;
            }

            const groups = await Group.getAllGroups();
            const now = new Date();

            // Get current time in WIB (UTC+7)
            const wibOffset = 7 * 60; // 7 hours in minutes
            const localTime = new Date(now.getTime() + (wibOffset * 60 * 1000));
            const currentTime = `${String(localTime.getUTCHours()).padStart(2, '0')}:${String(localTime.getUTCMinutes()).padStart(2, '0')}`;

            for (const group of groups) {
                // Check auto open
                if (group.autoOpen && group.autoOpenTime === currentTime) {
                    // Check if not recently executed
                    if (!this.wasRecentlyExecuted(group.lastAutoOpenExecuted)) {
                        await this.openGroup(group.id, group);
                    }
                }

                // Check auto close
                if (group.autoClose && group.autoCloseTime === currentTime) {
                    // Check if not recently executed
                    if (!this.wasRecentlyExecuted(group.lastAutoCloseExecuted)) {
                        await this.closeGroup(group.id, group);
                    }
                }
            }

        } catch (error) {
            logger.error('Error in group scheduler:', error);
        }
    }

    // Open group
    async openGroup(groupId, groupSettings) {
        try {
            // Update group settings to not_announcement (open)
            await this.sock.groupSettingUpdate(groupId, 'not_announcement');

            // Get group metadata
            const groupMetadata = await this.sock.groupMetadata(groupId).catch(() => null);
            if (!groupMetadata) return;

            // Get group picture
            const ppgroup = await this.sock.profilePictureUrl(groupId, 'image').catch(_ => 'https://files.catbox.moe/2wynab.jpg');

            // Send notification
            await this.sock.sendMessage(groupId, {
                text: `*GRUP DIBUKA OTOMATIS 🔓*\n\n` +
                    `⏰ Waktu: ${groupSettings.autoOpenTime} WIB\n` +
                    `Sekarang semua peserta dapat mengirim pesan di grup ini\n\n` +
                    `🤖 Auto Open System`,
                contextInfo: {
                    externalAdReply: {
                        title: `${groupMetadata.subject}`,
                        body: 'Group Opened Automatically 🔓',
                        thumbnailUrl: ppgroup,
                        sourceUrl: `${globalThis.newsletterUrl || ''}`,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });

            // Update last executed timestamp to prevent duplicate execution
            await Group.updateLastAutoOpenExecuted(groupId);

            logger.info(`Auto opened group: ${groupId} at ${groupSettings.autoOpenTime}`);

        } catch (error) {
            logger.error(`Error opening group ${groupId}:`, error);
        }
    }

    // Close group
    async closeGroup(groupId, groupSettings) {
        try {
            // Update group settings to announcement (close)
            await this.sock.groupSettingUpdate(groupId, 'announcement');

            // Get group metadata
            const groupMetadata = await this.sock.groupMetadata(groupId).catch(() => null);
            if (!groupMetadata) return;

            // Get group picture
            const ppgroup = await this.sock.profilePictureUrl(groupId, 'image').catch(_ => 'https://files.catbox.moe/2wynab.jpg');

            // Send notification
            await this.sock.sendMessage(groupId, {
                text: `*GRUP DITUTUP OTOMATIS 🔒*\n\n` +
                    `⏰ Waktu: ${groupSettings.autoCloseTime} WIB\n` +
                    `Sekarang hanya admin yang dapat mengirim pesan di grup ini\n\n` +
                    `🤖 Auto Close System`,
                contextInfo: {
                    externalAdReply: {
                        title: `${groupMetadata.subject}`,
                        body: 'Group Closed Automatically 🔒',
                        thumbnailUrl: ppgroup,
                        sourceUrl: `${globalThis.newsletterUrl || ''}`,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });

            // Update last executed timestamp to prevent duplicate execution
            await Group.updateLastAutoCloseExecuted(groupId);

            logger.info(`Auto closed group: ${groupId} at ${groupSettings.autoCloseTime}`);

        } catch (error) {
            logger.error(`Error closing group ${groupId}:`, error);
        }
    }
}

// Export singleton instance
export default new GroupScheduler();
