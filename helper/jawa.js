import axios from 'axios';

const Jawa = {
    translate: async (text, { from = 'indo', to = 'krama-alus' } = {}) => {
        if (!text) throw new Error('Text is required.');
        
        const languageMap = {
            'indo': 'id',
            'jawa': 'jw',
            'krama-lugu': 'kl',
            'krama-alus': 'ka',
            'ngoko': 'ng'
        };
        
        const fromCode = languageMap[from];
        const toCode = languageMap[to];
        
        if (!fromCode) throw new Error(`Invalid 'from' language: ${from}`);
        if (!toCode) throw new Error(`Invalid 'to' language: ${to}`);
        
        const { data } = await axios.post('https://api.translatejawa.id/translate', {
            text: text.trim(),
            from: fromCode,
            to: toCode
        }, {
            headers: {
                'content-type': 'application/json',
                referer: 'https://translatejawa.id/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
            }
        });
        
        return data.result;
    },
    
    aksara: async (text, { direction = 'toJavanese', withSpace = true, withMurda = true } = {}) => {
        if (!text) throw new Error('Text is required.');
        
        const { data } = await axios.post('https://aksarajawa.id/api/translate', {
            text: text.trim(),
            direction: direction,
            options: {
                withSpace: withSpace,
                withMurda: withMurda,
                typeMode: true
            }
        }, {
            headers: {
                'content-type': 'application/json',
                referer: 'https://aksarajawa.id/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
            }
        });
        
        return data.result;
    }
};

export default Jawa;
