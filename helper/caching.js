import NodeCache from 'node-cache';

const groupCache = new NodeCache({ 
    stdTTL: 300, 
    checkperiod: 60,
    useClones: false
});

export async function cacheGroupMetadata(sock, id) {
    const cached = groupCache.get(id);
    if (cached) {
        return cached;
    }

    try {
        const metadata = await sock.groupMetadata(id);
        if (metadata) {
            groupCache.set(id, metadata);
            console.log(`Group metadata cached for: ${id}`);
        }
        return metadata;
    } catch (error) {
        console.log('Failed to get group metadata for:', id, error.message);
        return null;
    }
}

export { groupCache };

export function clearGroupCache(jid = null) {
    if (jid) {
        groupCache.del(jid);
        console.log(`Cleared cache for group: ${jid}`);
    } else {
        groupCache.flushAll();
        console.log('Cleared all group metadata cache');
    }
}

export function getCacheStats() {
    return {
        keys: groupCache.keys().length,
        stats: groupCache.getStats()
    };
}