import axios from 'axios';
import * as cheerio from 'cheerio';
import FormData from 'form-data';

class KBBI {
    async login() {
        const ryn = await axios.get('https://kbbi.kemdikbud.go.id/Account/Login');
        const $ = cheerio.load(ryn.data);
        
        const initialCookies = ryn.headers['set-cookie'] ? ryn.headers['set-cookie'].join('; ') : '';
        
        const form = new FormData();
        form.append('__RequestVerificationToken', $('input[name="__RequestVerificationToken"]').attr('value'));
        form.append('Posel', 'rynn.stuff@neko2.net');
        form.append('KataSandi', 'RynnStuff20');
        form.append('IngatSaya', 'true');
        
        const rynn = await axios.post('https://kbbi.kemdikbud.go.id/Account/Login', form, {
            headers: {
                cookie: initialCookies,
                ...form.getHeaders()
            },
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400
        });
        
        const loginCookies = rynn.headers['set-cookie'] ? rynn.headers['set-cookie'].join('; ') : '';
        return loginCookies || initialCookies;
    }
    
    async search(word) {
        if (!word) throw new Error('Kata tidak boleh kosong');
        
        const cookies = await this.login();
        const { data } = await axios.get(`https://kbbi.kemdikbud.go.id/entri/${encodeURIComponent(word)}`, {
            headers: { cookie: cookies }
        });
        const $ = cheerio.load(data);
        const allHomographs = [];
        
        const entryElements = $('h2[style*=\'margin-bottom:3px\']');
        
        entryElements.each((index, element) => {
            const $currentH2 = $(element);
            const $clonedH2 = $currentH2.clone();
            
            const $nonStandardSmall = $clonedH2.find('small:contains(\'bentuk tidak baku:\')');
            let kataTidakBaku = null;
            if ($nonStandardSmall.length > 0) {
                kataTidakBaku = $nonStandardSmall.find('b').text().trim();
                $nonStandardSmall.remove();
            }
            
            const wordKey = $clonedH2.text().trim().replace(/(\d+)/g, '^$1');
            
            let entryDetails = { 
                makna: [],
                kata_tidak_baku: kataTidakBaku || null, 
                kata_turunan: [],
                gabungan_kata: []
            };
            
            const meaningListElement = $currentH2.nextAll('ul.adjusted-par, ol.last-list-child').first();
            
            if (meaningListElement.length > 0) {
                meaningListElement.find('li').each((i, liElem) => {
                    const $li = $(liElem);
                    
                    const usulkanMaknaBaruLink = $li.find('a.entrisButton span[title=\'Usulkan makna baru\']');
                    if (usulkanMaknaBaruLink.length > 0) return true;
                    
                    const kelas_kata = $li.find('span[title]').attr('title');
                    const $clonedLi = $li.clone();
                    
                    $clonedLi.find('font[color=\'red\'] > i > span[title]').closest('font').remove();
                    $clonedLi.find('span.entrisButton').remove();
                    
                    let deskripsiHtml = $clonedLi.html();
                    deskripsiHtml = deskripsiHtml.replace(/<font color='(grey|brown)'><i>\s*<\/i><\/font>/g, ''); 
                    deskripsiHtml = deskripsiHtml.replace(/<font color='(grey|brown)'><i>(.*?)<\/i><\/font>/g, '$2'); 
                    
                    const deskripsi = cheerio.load(deskripsiHtml).text().trim().replace(/\s+/g, ' ');
                    
                    if (kelas_kata && deskripsi) {
                        entryDetails.makna.push({ kelas_kata, deskripsi });
                    }
                });
            }
            
            let currentSibling = meaningListElement.next();
            while (currentSibling.length > 0 && !currentSibling.is('h2[style*=\'margin-bottom:3px\']') && !currentSibling.is('h4:contains(\'Peribahasa\')') && !currentSibling.is('h4:contains(\'Idiom\')')) {
                if (currentSibling.is('h4')) {
                    const h4Text = currentSibling.text().trim();
                    const nextUl = currentSibling.nextAll('ul.adjusted-par').first();
                    const items = [];
                    
                    if (nextUl.length > 0) {
                        nextUl.find('li a').each((i, el) => {
                            items.push($(el).text().trim());
                        });
                    }
                    
                    if (items.length > 0) {
                        if (h4Text.includes('Kata Turunan')) {
                            entryDetails['kata_turunan'] = items;
                        } else if (h4Text.includes('Gabungan Kata')) {
                            entryDetails['gabungan_kata'] = items;
                        }
                    }
                    currentSibling = (nextUl.length > 0) ? nextUl.next() : currentSibling.next();
                } else {
                    currentSibling = currentSibling.next();
                }
            }
            
            allHomographs.push({ [wordKey]: entryDetails });
        });
        
        const globalPeribahasaH4 = $(`h4:contains('Peribahasa')`).filter((i, el) => $(el).text().includes(`(mengandung [${word}])`)).last();
        const globalIdiomH4 = $(`h4:contains('Idiom')`).filter((i, el) => $(el).text().includes(`(mengandung [${word}])`)).last();
        
        let globalPeribahasa = [];
        if (globalPeribahasaH4.length > 0) {
            globalPeribahasaH4.nextAll('ul.adjusted-par').first().find('li a').each((i, el) => {
                globalPeribahasa.push($(el).text().trim());
            });
        }
        
        let globalIdiom = [];
        if (globalIdiomH4.length > 0) {
            globalIdiomH4.nextAll('ul.adjusted-par').first().find('li a').each((i, el) => {
                globalIdiom.push($(el).text().trim());
            });
        }
        
        return {
            kata: allHomographs,
            peribahasa: globalPeribahasa,
            idiom: globalIdiom
        };
    }
}

export default KBBI;
