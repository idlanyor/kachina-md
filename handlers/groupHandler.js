import Database from '../helper/database.js';
import { messageFilter } from '../helper/cooldown.js';
import { cacheGroupMetadata } from '../helper/caching.js';
import { Welcome, Leave } from '../lib/canvafy.js';
import { logger } from '../helper/logger.js';

export class GroupHandler {
    static async handleAntiLink(sock, m, command) {
        if (!m.isGroup) return false;

        // Whitelist link pada media (image, video, audio)
        if (["image", "video", "audio"].includes(m.type)) {
            return false;
        }
        
        if (messageFilter.isPlatformLink(command)) {
            return false;
        }

        const group = await Database.getGroup(m.chat);
        const isAdmin = await m.isAdmin;
        const isBotAdmin = await m.isBotAdmin;
        const isOwner = await m.isOwner();

        if (group.antiLink && isBotAdmin && !isAdmin && !isOwner && messageFilter.isLink(command)) {
            await m.reply(`🚫 *Link terdeteksi!*
Maaf, mengirim link di grup ini tidak diperbolehkan. Kamu akan dikeluarkan dari grup.`);
            await sock.sendMessage(m.chat, { delete: m.key });
            await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
            return true;
        }

        return false;
    }

    static async handleAntiToxic(sock, m, command) {
        if (!m.isGroup) return false;

        const group = await Database.getGroup(m.chat);
        const isBotAdmin = await m.isBotAdmin;
        const isAdmin = await m.isAdmin;
        const isOwner = await m.isOwner();

        if (group.antiToxic && isBotAdmin && !isAdmin && !isOwner && messageFilter.isToxic(command)) {
            const user = await Database.getUser(m.sender);
            const warnings = (user.warnings || 0) + 1;
            await Database.updateUser(m.sender, { warnings });
            
            if (warnings < 3) {
                await m.reply(`🤬 *Kata kasar terdeteksi!*
Maaf, kata toxic tidak diperbolehkan di grup ini.
⚠️ Warning: ${warnings}/3
Jika mencapai 3 warning, kamu akan dikeluarkan dari grup.`);
                await sock.sendMessage(m.chat, { delete: m.key });
            } else {
                await Database.updateUser(m.sender, { warnings: 0 });
                await m.reply(`🚫 Kamu telah dikeluarkan dari grup karena melanggar aturan toxic 3x!`);
                await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
            }
            return true;
        }

        return false;
    }

    static async handleGroupParticipantsUpdate(sock, update) {
        try {
            const { id, participants, action } = update;

            const groupMetadata = await cacheGroupMetadata(sock, id);
            const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            // Note: Admin privilege is NOT required to send welcome/leave messages,
            // so we no longer bail out when the bot isn't admin.
            // We still avoid acting on our own join/leave events below.

            for (const participant of participants) {
                if (participant === botNumber) continue;

                if (action === 'add') {
                    await this.handleWelcome(sock, id, participant, groupMetadata);
                } else if (action === 'remove') {
                    await this.handleLeave(sock, id, participant, groupMetadata);
                }
            }
        } catch (error) {
            logger.error('Error handling group participants update:', error);
        }
    }

    static async handleWelcome(sock, groupId, participant, groupMetadata) {
        try {
            const group = await Database.getGroup(groupId);
            if (!group.welcome) return;

            const contact = await sock.onWhatsApp(participant);
            const memberName = contact[0]?.notify || participant.split('@')[0];

            let welcomeImage = null;
            try {
                welcomeImage = await Welcome(sock, participant, groupMetadata.subject, memberName);
            } catch (e) {
                // Fallback to text-only when image generation fails
                logger.warn('Welcome image generation failed, sending text-only message');
            }

            let welcomeMessage = group.welcomeMessage && group.welcomeMessage.trim() !== ''
                ? group.welcomeMessage
                    .replace(/@user/gi, `@${participant.split('@')[0]}`)
                    .replace(/@group/gi, groupMetadata.subject)
                : `👋 *SELAMAT DATANG!*\n\n` +
                `Halo @${participant.split('@')[0]}! 🎉\n` +
                `Selamat datang di grup *${groupMetadata.subject}*\n\n` +
                `📝 *Silakan perkenalkan diri kamu:*\n` +
                `• Nama lengkap :\n` +
                `• Umur :\n` +
                `• Hobi atau minat :\n`;

            if (welcomeImage) {
                await sock.sendMessage(groupId, {
                    image: welcomeImage,
                    caption: welcomeMessage,
                    mentions: [participant]
                });
            } else {
                await sock.sendMessage(groupId, {
                    text: welcomeMessage,
                    mentions: [participant]
                });
            }
        } catch (error) {
            logger.error('Error handling welcome:', error);
        }
    }

    static async handleLeave(sock, groupId, participant, groupMetadata) {
        try {
            const group = await Database.getGroup(groupId);
            if (!group.leave) return;

            const contact = await sock.onWhatsApp(participant);
            const memberName = contact[0]?.notify || participant.split('@')[0];

            let leaveImage = null;
            try {
                leaveImage = await Leave(sock, participant, groupMetadata.subject, memberName);
            } catch (e) {
                // Fallback to text-only when image generation fails
                logger.warn('Leave image generation failed, sending text-only message');
            }

            let leaveMessage = group.leaveMessage && group.leaveMessage.trim() !== ''
                ? group.leaveMessage
                    .replace(/@user/gi, `@${participant.split('@')[0]}`)
                    .replace(/@group/gi, groupMetadata.subject)
                : `👋 *SELAMAT TINGGAL!*\n\n` +
                `@${participant.split('@')[0]} telah meninggalkan grup *${groupMetadata.subject}*\n\n` +
                `Semoga sukses selalu! 🙏`;

            if (leaveImage) {
                await sock.sendMessage(groupId, {
                    image: leaveImage,
                    caption: leaveMessage,
                    mentions: [participant]
                });
            } else {
                await sock.sendMessage(groupId, {
                    text: leaveMessage,
                    mentions: [participant]
                });
            }
        } catch (error) {
            logger.error('Error handling leave:', error);
        }
    }
}
