import axios from 'axios';
import { load } from 'cheerio';
import FormData from 'form-data';

export default async function threadsdl(url) {
    try {
        const form = new FormData();
        form.append('search', url);
        const { data } = await axios.post('https://threadsdownload.net/ms?fresh-partial=true', form, {
            headers: {
                accept: '*/*',
                'content-type': 'multipart/form-data',
                origin: 'https://threadsdownload.net',
                referer: 'https://threadsdownload.net/ms',
                'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"Android"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
            }
        });
        const $ = load(data);
        
        const jsonString = $(`script[type='application/json']`).text().trim();
        
        let braceCount = 0;
        let endIndex = -1;
        for (let i = 0; i < jsonString.length; i++) {
            if (jsonString[i] === '{') braceCount++;
            if (jsonString[i] === '}') braceCount--;
            if (braceCount === 0 && jsonString[i] === '}') {
                endIndex = i + 1;
                break;
            }
        }
        
        if (endIndex === -1) {
            console.error('Failed to find valid JSON!');
            return null;
        }
        
        const validJsonString = jsonString.slice(0, endIndex);
        const jsonData = JSON.parse(validJsonString);
        
        return jsonData.v[0][1];
    } catch (error) {
        throw new Error(error.message);
    }
}

// Usage:
const resp = await threadsdl('https://www.threads.com/@rubent_bungsu/post/DOoKnC3D3Jj?xmt=AQF0Aruz_bBPYaga6fh1Fe6ks1kLKifGSvF17T80hmdkjQ');
console.log(resp.videos);