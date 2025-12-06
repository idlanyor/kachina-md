import axios from 'axios';

async function ssweb2(url, { width = 1280, height = 720, full_page = false, device_scale = 1 } = {}) {
    if (!url) throw new Error('URL is required');
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
        url = 'https://' + url;
    }
    
    const { data } = await axios.post('https://gcp.imagy.app/screenshot/createscreenshot', {
        url: url,
        browserWidth: parseInt(width),
        browserHeight: parseInt(height),
        fullPage: full_page,
        deviceScaleFactor: parseInt(device_scale),
        format: 'png'
    }, {
        headers: {
            'content-type': 'application/json',
            referer: 'https://imagy.app/full-page-screenshot-taker/',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
        }
    });
    
    return data.fileUrl;
}

export default ssweb2;
