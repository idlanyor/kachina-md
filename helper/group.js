import { sanitizeBotId } from "./bot.js";
import { cacheGroupMetadata, groupCache } from "./caching.js";

export const getGroupMetadata = async ({ sock, id }) => {
    // Menggunakan fungsi cacheGroupMetadata dari caching.js
    let metadata = await cacheGroupMetadata(sock, id);
    
    if (!metadata) {
        // Fallback jika cache gagal
        try {
            metadata = await sock.groupMetadata(id);
        } catch (error) {
            console.error('Error getting group metadata:', error);
            return null;
        }
    }
    
    // Format metadata untuk konsistensi dengan implementasi sebelumnya
    const formattedMetadata = {
        id: metadata.id,
        subject: metadata.subject,
        subjectOwner: metadata.subjectOwner,
        subjectTime: metadata.subjectTime,
        size: metadata.size,
        creation: metadata.creation,
        owner: metadata.owner,
        desc: metadata.desc,
        descId: metadata.descId,
        linkedParent: metadata.linkedParent,
        restrict: metadata.restrict,
        announce: metadata.announce,
        isCommunity: metadata.isCommunity,
        isCommunityAnnounce: metadata.isCommunityAnnounce,
        joinApprovalMode: metadata.joinApprovalMode,
        memberAddMode: metadata.memberAddMode,
        participants: metadata.participants,
        ephemeralDuration: metadata.ephemeralDuration,
    };
    
    return formattedMetadata;
};

export const isBotAdmin = async ({ sock, id }) => {
    let metadata = await getGroupMetadata({ sock, id });
    return metadata.participants.find(v => v.id === sanitizeBotId(sock.user.id))?.admin;
};

export const isAdmin = async ({ sock, id, sender }) => {
    let metadata = await getGroupMetadata({ sock, id });
    return metadata.participants.find(v => v.id === sender)?.admin;
};

export const isSuperAdmin = async ({ sock, id, sender }) => {
    let metadata = await getGroupMetadata({ sock, id });
    return metadata.participants.find(v => v.id === sender)?.admin === 'superadmin';
};

export const isOwnerGrup = async ({ sock, id, sender }) => {
    let metadata = await getGroupMetadata({ sock, id });
    return metadata.owner === sender;
};

export const isGroup = async ({ sock, id }) => {
    let metadata = await getGroupMetadata({ sock, id });
    return metadata.id.endsWith('@g.us');
};