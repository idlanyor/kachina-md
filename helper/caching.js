import NodeCache from 'node-cache';

// Gunakan NodeCache untuk konsistensi dengan bot.js
const groupCache = new NodeCache({ 
    stdTTL: 300, // 5 menit TTL
    checkperiod: 60, // Check expired keys setiap 60 detik
    useClones: false
});

export async function cacheGroupMetadata(sock, id) {
    // Cek cache terlebih dahulu
    const cached = groupCache.get(id);
    if (cached) {
        return cached;
    }

    try {
        const metadata = await sock.groupMetadata(id);
        if (metadata) {
            // Simpan ke cache dengan TTL otomatis dari NodeCache
            groupCache.set(id, metadata);
            console.log(`Group metadata cached for: ${id}`);
        }
        return metadata;
    } catch (error) {
        console.log('Failed to get group metadata for:', id, error.message);
        return null;
    }
}

// Export cache instance untuk debugging atau manual management
export { groupCache };

// Fungsi untuk clear cache secara manual jika diperlukan
export function clearGroupCache(jid = null) {
    if (jid) {
        groupCache.del(jid);
        console.log(`Cleared cache for group: ${jid}`);
    } else {
        groupCache.flushAll();
        console.log('Cleared all group metadata cache');
    }
}

// Fungsi untuk mendapatkan statistik cache
export function getCacheStats() {
    return {
        keys: groupCache.keys().length,
        stats: groupCache.getStats()
    };
}