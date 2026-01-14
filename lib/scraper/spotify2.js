import axios from 'axios';

class Spotify {
    constructor(url) {
        if (!url) throw new Error("Mana URL nya min");
        this.url = url;
        this.baseURL = "https://spotmate.online";
        this.userAgent =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
    }

    async getToken() {
        const res = await axios.get(this.baseURL, {
            headers: { "User-Agent": this.userAgent },
        });
        const html = res.data;
        const match = html.match(
            /<meta[^>]+(csrf[-_]?token|csrf|csrf_token)[^>]+content=["']([^"']+)["']/
        );
        if (!match) throw new Error("Token CSRF tidak ditemukan");
        const token = match[2];
        const cookie = (res.headers["set-cookie"] || [])
            .map((c) => c.split(";")[0])
            .join("; ");
        return { token, cookie };
    }

    async run() {
        try {
            const { token, cookie } = await this.getToken();
            const headers = {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": token,
                Cookie: cookie,
                Referer: this.baseURL + "/",
                "X-Requested-With": "XMLHttpRequest",
                "User-Agent": this.userAgent,
            };
            let result = {
                metadata: {},
                download: null
            }
            let r = await axios
                .post(this.baseURL + "/getTrackData", { spotify_url: this.url }, { headers })
                .catch((e) => e.response);
            if (r.status !== 200) throw new Error("Gagal ambil data metadata");
            const meta = r.data;
            result.metadata = {
                title: meta.name,
                id: meta.id,
                images: meta.album.images[0].url,
                duration: this.formatTime(meta.duration_ms),
                artist: meta.artists[0].name
            }

            // Convert Request
            let convert = await axios
                .post(this.baseURL + "/convert", { urls: this.url }, { headers })
                .catch((e) => e.response);
            if (convert.status !== 200) throw new Error("Gagal convert lagu");
            
            let downloadUrl = convert.data.url;
            if (!downloadUrl && convert.data.task_id) {
                 const taskId = convert.data.task_id;
                 for (let i = 0; i < 20; i++) {
                     await new Promise(resolve => setTimeout(resolve, 3000));
                     const taskStatus = await axios.get(`${this.baseURL}/tasks/${taskId}`, { headers }).catch(e => e.response);
                     if (taskStatus.data && taskStatus.data.data && taskStatus.data.data.status === 'finished') {
                         downloadUrl = taskStatus.data.data.download_url || taskStatus.data.data.url;
                         break;
                     }
                     if (taskStatus.data && taskStatus.data.data && taskStatus.data.data.status === 'failed') {
                         throw new Error("Convert failed: " + (taskStatus.data.data.message || "Unknown error"));
                     }
                 }
            }

            if (!downloadUrl) throw new Error("Gagal mendapatkan link download");

            const buffer = await axios.get(downloadUrl, { responseType: "arraybuffer" }).catch(e => e.response);
            result.download = Buffer.from(buffer.data) || downloadUrl
            return result;
        } catch (error) {
            console.error('Error in Spotify class:', error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
            }
            throw error;
        }
    }

    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

export { Spotify };
