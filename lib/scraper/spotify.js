import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrape spotdl.io
 * @param {String} url Spotify track URL
 */
export async function spotifyDownload(url) {
    try {
        if (!url.includes('open.spotify.com')) throw new Error('Invalid Spotify URL.');

        const baseRes = await axios.get('https://spotdl.io/', {
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const $ = load(baseRes.data);
        const token = $('meta[name="csrf-token"]').attr('content');
        const cookie = baseRes.headers['set-cookie'] ? baseRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';

        const api = axios.create({
            baseURL: 'https://spotdl.io',
            headers: {
                'cookie': cookie,
                'content-type': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'x-csrf-token': token,
                'x-requested-with': 'XMLHttpRequest'
            }
        });

        const metaResponse = await api.post('/getTrackData', { spotify_url: url });
        if (metaResponse.status !== 200) throw new Error('Failed to get metadata.');
        const meta = metaResponse.data;

        const convertResponse = await api.post('/convert', { urls: url });
        if (convertResponse.status !== 200) throw new Error('Failed to convert track.');
        
        let downloadData = convertResponse.data;
        let downloadUrl = downloadData.url;

        // If not immediately available, it might need polling (similar to spotmate)
        if (!downloadUrl && downloadData.task_id) {
            const taskId = downloadData.task_id;
            for (let i = 0; i < 20; i++) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const taskStatus = await api.get(`/tasks/${taskId}`).catch(e => e.response);
                if (taskStatus.data && taskStatus.data.data && taskStatus.data.data.status === 'finished') {
                    downloadUrl = taskStatus.data.data.download_url || taskStatus.data.data.url;
                    break;
                }
                if (taskStatus.data && taskStatus.data.data && taskStatus.data.data.status === 'failed') {
                    throw new Error("Convert failed: " + (taskStatus.data.data.message || "Unknown error"));
                }
            }
        }

        if (!downloadUrl) throw new Error('Failed to get download URL.');

        return {
            success: true,
            metadata: {
                title: meta.name || meta.data?.name,
                artist: meta.artists?.map(a => a.name).join(', ') || meta.data?.artists?.map(a => a.name).join(', '),
                album: meta.album?.name || meta.data?.album?.name,
                duration: meta.duration_ms || meta.data?.duration_ms,
                image: meta.album?.images?.[0]?.url || meta.data?.album?.images?.[0]?.url,
                id: meta.id || meta.spotify_id || meta.data?.id
            },
            download_url: downloadUrl
        };
    } catch (error) {
        console.error('Spotify Scraper Error:', error.message);
        throw error;
    }
}