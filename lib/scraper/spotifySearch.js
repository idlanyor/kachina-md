import axios from "axios"


const AUTH_URL = "https://accounts.spotify.com/api/token"
const SEARCH_URL = "https://api.spotify.com/v1/search"

function getLargestImage(images = []) {
    return images.reduce((max, img) => (img.height > (max.height || 0) ? img : max), {})?.url || null
}

async function getClientToken() {
    const creds = Buffer.from(`${globalThis.SPOTIFY_CLIENT_ID}:${globalThis.SPOTIFY_CLIENT_SECRET}`).toString("base64")
    const { data } = await axios.post(
        AUTH_URL,
        new URLSearchParams({ grant_type: "client_credentials" }),
        { headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" } }
    )
    return data.access_token
}

export async function spotifySearch(query) {
    try {
        const token = await getClientToken()
        const { data } = await axios.get(SEARCH_URL, {
            headers: { Authorization: `Bearer ${token}` },
            params: { q: query, type: "track,album,artist,playlist", include_external: "audio" }
        })

        const tracks = (data.tracks?.items || [])
            .filter(t => t?.id)
            .map(t => ({
                id: t.id,
                name: t.name,
                artists: t.artists.map(a => a.name),
                artist: t.artists.map(a => a.name).join(', '), // For compatibility
                album: {
                    id: t.album.id,
                    name: t.album.name,
                    image: getLargestImage(t.album.images),
                    release_date: t.album.release_date,
                    total_tracks: t.album.total_tracks
                },
                url: t.external_urls.spotify,
                preview: t.preview_url,
                popularity: t.popularity,
                duration_ms: t.duration_ms,
                track_number: t.track_number,
                image: getLargestImage(t.album.images) // For compatibility
            }))

        const albums = (data.albums?.items || [])
            .filter(a => a?.id)
            .map(a => ({
                id: a.id,
                name: a.name,
                artists: a.artists.map(x => x.name),
                image: getLargestImage(a.images),
                url: a.external_urls.spotify,
                release_date: a.release_date,
                total_tracks: a.total_tracks
            }))

        const artists = (data.artists?.items || [])
            .filter(a => a?.id)
            .map(a => ({
                id: a.id,
                name: a.name,
                image: getLargestImage(a.images),
                url: a.external_urls.spotify,
                genres: a.genres,
                popularity: a.popularity,
                followers: a.followers?.total
            }))

        const playlists = (data.playlists?.items || [])
            .filter(p => p?.id)
            .map(p => ({
                id: p.id,
                name: p.name,
                owner: p.owner.display_name,
                image: getLargestImage(p.images),
                url: p.external_urls.spotify,
                tracks_total: p.tracks?.total,
                description: p.description
            }))

        return { tracks, albums, artists, playlists }
    } catch (error) {
        console.error('Spotify Search Error:', error.message);
        return { tracks: [], albums: [], artists: [], playlists: [] };
    }
}

export default spotifySearch;
