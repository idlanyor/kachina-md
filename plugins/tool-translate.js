import fetch from 'node-fetch';
import User from '../database/models/User.js';

const ISO_LANGUAGES = {
    'af': 'Afrikaans',
    'sq': 'Albanian',
    'am': 'Amharic',
    'ar': 'Arabic',
    'hy': 'Armenian',
    'az': 'Azerbaijani',
    'eu': 'Basque',
    'be': 'Belarusian',
    'bn': 'Bengali',
    'bs': 'Bosnian',
    'bg': 'Bulgarian',
    'ca': 'Catalan',
    'ceb': 'Cebuano',
    'ny': 'Chichewa',
    'zh': 'Chinese',
    'co': 'Corsican',
    'hr': 'Croatian',
    'cs': 'Czech',
    'da': 'Danish',
    'nl': 'Dutch',
    'en': 'English',
    'eo': 'Esperanto',
    'et': 'Estonian',
    'tl': 'Filipino',
    'fi': 'Finnish',
    'fr': 'French',
    'fy': 'Frisian',
    'gl': 'Galician',
    'ka': 'Georgian',
    'de': 'German',
    'el': 'Greek',
    'gu': 'Gujarati',
    'ht': 'Haitian Creole',
    'ha': 'Hausa',
    'haw': 'Hawaiian',
    'iw': 'Hebrew',
    'hi': 'Hindi',
    'hmn': 'Hmong',
    'hu': 'Hungarian',
    'is': 'Icelandic',
    'ig': 'Igbo',
    'id': 'Indonesian',
    'ga': 'Irish',
    'it': 'Italian',
    'ja': 'Japanese',
    'jw': 'Javanese',
    'kn': 'Kannada',
    'kk': 'Kazakh',
    'km': 'Khmer',
    'ko': 'Korean',
    'ku': 'Kurdish (Kurmanji)',
    'ky': 'Kyrgyz',
    'lo': 'Lao',
    'la': 'Latin',
    'lv': 'Latvian',
    'lt': 'Lithuanian',
    'lb': 'Luxembourgish',
    'mk': 'Macedonian',
    'mg': 'Malagasy',
    'ms': 'Malay',
    'ml': 'Malayalam',
    'mt': 'Maltese',
    'mi': 'Maori',
    'mr': 'Marathi',
    'mn': 'Mongolian',
    'my': 'Myanmar (Burmese)',
    'ne': 'Nepali',
    'no': 'Norwegian',
    'ps': 'Pashto',
    'fa': 'Persian',
    'pl': 'Polish',
    'pt': 'Portuguese',
    'pa': 'Punjabi',
    'ro': 'Romanian',
    'ru': 'Russian',
    'sm': 'Samoan',
    'gd': 'Scots Gaelic',
    'sr': 'Serbian',
    'st': 'Sesotho',
    'sn': 'Shona',
    'sd': 'Sindhi',
    'si': 'Sinhala',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'so': 'Somali',
    'es': 'Spanish',
    'su': 'Sundanese',
    'sw': 'Swahili',
    'sv': 'Swedish',
    'tg': 'Tajik',
    'ta': 'Tamil',
    'te': 'Telugu',
    'th': 'Thai',
    'tr': 'Turkish',
    'uk': 'Ukrainian',
    'ur': 'Urdu',
    'uz': 'Uzbek',
    'vi': 'Vietnamese',
    'cy': 'Welsh',
    'xh': 'Xhosa',
    'yi': 'Yiddish',
    'yo': 'Yoruba',
    'zu': 'Zulu'
};

// Bahasa yang menggunakan aksara non-latin
const NON_LATIN_SCRIPTS = [
    'ar', // Arabic
    'bn', // Bengali  
    'zh', // Chinese
    'gu', // Gujarati
    'iw', // Hebrew
    'hi', // Hindi
    'ja', // Japanese
    'kn', // Kannada
    'km', // Khmer
    'ko', // Korean
    'ml', // Malayalam
    'mr', // Marathi
    'my', // Myanmar
    'ne', // Nepali
    'pa', // Punjabi
    'ru', // Russian
    'sd', // Sindhi
    'si', // Sinhala
    'ta', // Tamil
    'te', // Telugu
    'th', // Thai
    'ur', // Urdu
];

async function detectLanguage(text) {
    try {
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);
        const data = await response.json();
        return data[2] || 'auto';
    } catch (error) {
        console.error('Error detecting language:', error);
        return 'auto';
    }
}

async function translate(text, targetLang = 'id', sourceLang = 'auto') {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&dt=rm&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const data = await response.json();

        let translatedText = '';
        data[0].forEach(item => {
            if (item[0]) translatedText += item[0];
        });

        // Ambil transliterasi jika bahasa target menggunakan aksara non-latin
        let transliteration = '';
        if (NON_LATIN_SCRIPTS.includes(targetLang)) {
            // Transliterasi ke Latin
            const transUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${targetLang}&tl=en&dt=t&dt=rm&q=${encodeURIComponent(translatedText)}`;
            const transResponse = await fetch(transUrl);
            const transData = await transResponse.json();

            if (transData[1] && transData[1][0] && transData[1][0][1]) {
                transliteration = transData[1][0][1];
            }
        }

        // Generate simple phonetic pronunciation
        const phoneticPronunciation = generatePhoneticPronunciation(translatedText, targetLang, transliteration);

        // Get context and nuances
        const contextNotes = getContextNotes(sourceLang, targetLang, text);

        return {
            text: translatedText,
            transliteration: transliteration,
            phoneticPronunciation: phoneticPronunciation,
            contextNotes: contextNotes,
            from: ISO_LANGUAGES[data[2]] || 'Unknown',
            to: ISO_LANGUAGES[targetLang] || 'Unknown',
            fromCode: data[2] || sourceLang,
            toCode: targetLang
        };
    } catch (error) {
        throw new Error(`Translation failed: ${error.message}`);
    }
}

function generatePhoneticPronunciation(text, langCode, transliteration = null) {
    // Simple phonetic pronunciation for common languages
    const phoneticMap = {
        'es': {
            'hola': 'oh-lah',
            'buenos días': 'bway-nohs dee-ahs',
            'gracias': 'grah-see-ahs',
            'adiós': 'ah-dee-ohs'
        },
        'fr': {
            'bonjour': 'bon-zhoor',
            'merci': 'mair-see',
            'au revoir': 'oh reh-vwar',
            'oui': 'wee'
        },
        'de': {
            'hallo': 'hah-loh',
            'danke': 'dahn-kuh',
            'auf wiedersehen': 'owf vee-der-zay-en',
            'ja': 'yah'
        },
        'it': {
            'ciao': 'chah-oh',
            'grazie': 'grah-tsee-eh',
            'arrivederci': 'ar-ree-veh-dair-chee',
            'si': 'see'
        },
        'pt': {
            'olá': 'oh-lah',
            'obrigado': 'oh-bree-gah-doo',
            'de nada': 'jee nah-dah',
            'sim': 'seeng'
        },
        'ja': {
            'こんにちは': 'kohn-nee-chee-wah',
            'ありがとう': 'ah-ree-gah-toh',
            'さようなら': 'sah-yoh-nah-rah',
            'はい': 'hah-ee'
        },
        'ko': {
            '안녕하세요': 'an-nyeong-hah-seh-yo',
            '감사합니다': 'kam-sah-ham-ni-da',
            '안녕히 가세요': 'an-nyeong-hee gah-seh-yo',
            '네': 'neh'
        },
        'zh': {
            '你好': 'nee-how',
            '谢谢': 'sheh-sheh',
            '再见': 'dzay-dzyen',
            '是': 'shuh'
        },
        'ar': {
            'مرحبا': 'mar-hah-bah',
            'شكرا': 'shoo-kran',
            'وداعا': 'wah-dah-an',
            'نعم': 'nah-am'
        },
        'hi': {
            'नमस्ते': 'nah-mas-tay',
            'धन्यवाद': 'dhan-yah-vahd',
            'अलविदा': 'al-vee-dah',
            'हाँ': 'hahn'
        },
        'ru': {
            'привет': 'pree-vyét',
            'спасибо': 'spah-see-bah',
            'до свидания': 'dah svee-dah-nee-yah',
            'да': 'dah'
        }
    };

    // If text is in our phonetic map, return the phonetic version
    if (phoneticMap[langCode] && phoneticMap[langCode][text.toLowerCase()]) {
        return phoneticMap[langCode][text.toLowerCase()];
    }

    // For non-Latin scripts, return transliteration if available
    if (NON_LATIN_SCRIPTS.includes(langCode)) {
        return transliteration || 'N/A';
    }

    // For other cases, return a simplified version or N/A
    return 'N/A';
}

function getContextNotes(sourceLang, targetLang, text) {
    // Provide context and nuances for specific language pairs
    const contexts = {
        'en-es': {
            'you': 'In Spanish, "you" can be "tú" (informal) or "usted" (formal). The translation depends on the context and relationship.',
            'love': 'In Spanish, "love" can be "amor" (noun) or "amar/querer" (verb). "Te quiero" is commonly used for affection, while "te amo" is deeper.'
        },
        'en-fr': {
            'you': 'In French, "you" can be "tu" (informal) or "vous" (formal/plural). The choice depends on familiarity and number of people.',
            'love': 'In French, "love" can be "amour" (noun) or "aimer" (verb). "Je t\'aime" expresses love, while "Je t\'adore" is more like "I adore you."'
        },
        'en-de': {
            'you': 'In German, "you" can be "du" (informal), "ihr" (plural informal), or "Sie" (formal). Formality is important in German culture.',
            'love': 'In German, "love" is "Liebe" (noun) or "lieben" (verb). "Ich liebe dich" is for romantic love, while "Ich habe dich lieb" is for platonic affection.'
        },
        'en-ja': {
            'you': 'Japanese often omits pronouns like "you" (あなた) when context is clear. Using it too much can sound unnatural.',
            'love': 'Japanese has several words for love: "愛" (ai) for deep love, "好き" (suki) for liking, and "恋" (koi) for romantic longing.'
        },
        'id-en': {
            'kamu': 'Indonesian "kamu" (you) is informal. "Anda" is formal/standard, while "Engkau" is poetic/intimate.',
            'cinta': 'Indonesian "cinta" is romantic love, while "sayang" can mean both love/dear and is used for family members too.'
        }
    };

    const key = `${sourceLang}-${targetLang}`;
    const reverseKey = `${targetLang}-${sourceLang}`;

    // Check for specific notes about this text
    const lowerText = text.toLowerCase();
    if (contexts[key] && contexts[key][lowerText]) {
        return contexts[key][lowerText];
    }
    if (contexts[reverseKey] && contexts[reverseKey][lowerText]) {
        return contexts[reverseKey][lowerText];
    }

    // General notes for language pairs
    const generalNotes = {
        'en-es': 'Spanish uses gendered nouns and adjectives. Articles (el/la) must match the gender of the noun.',
        'en-fr': 'French nouns have gender (masculine/feminine) which affects articles and adjectives.',
        'en-de': 'German has three grammatical genders (masculine, feminine, neuter) and four cases (nominative, accusative, dative, genitive).',
        'en-ja': 'Japanese is a context-dependent language with varying levels of politeness (keigo).',
        'en-ko': 'Korean uses honorifics to show respect and has different speech levels based on relationship.',
        'en-zh': 'Chinese is a tonal language where the same syllable can have different meanings based on tone.',
        'en-ar': 'Arabic is written right-to-left and has different forms depending on position in a word.',
        'en-hi': 'Hindi uses Devanagari script and has formal/informal distinctions.',
        'en-ru': 'Russian uses the Cyrillic alphabet and has six cases for nouns.',
        'id-en': 'Indonesian has no verb conjugations, tenses, or grammatical gender, making it simpler than English.'
    };

    if (generalNotes[key]) {
        return generalNotes[key];
    }
    if (generalNotes[reverseKey]) {
        return generalNotes[reverseKey];
    }

    return 'N/A';
}

export const handler = {
    command: ['translate'],
    help: 'Menerjemahkan teks ke berbagai bahasa.',
    category: 'tools',

    async exec({ m, args, sock }) {
        try {
            // Get user and set localization
            const user = await User.getById(m.sender);
            const userLang = user.preferences?.language || 'id';
            globalThis.localization.setLocale(userLang);

            let text, targetLang = 'id';
            args = args.split(' ');
            // Cek jika ada kode bahasa di args pertama
            if (args[0] && ISO_LANGUAGES[args[0].toLowerCase()]) {
                targetLang = args[0].toLowerCase();
                text = args.slice(1).join(' ');
            } else {
                text = args;
            }

            // Jika tidak ada teks tapi ada reply
            if (!text && m.quoted) {
                text = m.quoted.text || m.quoted.message?.conversation || '';
            }

            // Validasi input
            if (!text) {
                let helpText = `🌐 *${t('tools.translate.title')}*\n\n`;
                helpText += `${t('tools.translate.usage')}:\n`;
                helpText += `1. !tr <${t('tools.translate.language_code')}> <${t('tools.translate.text')}>\n`;
                helpText += `2. ${t('tools.translate.reply_message')} !tr <${t('tools.translate.language_code')}>\n\n`;
                helpText += `${t('common.example')}:\n`;
                helpText += `- !tr en ${t('tools.translate.example_text_1')}\n`;
                helpText += `- !tr ja ${t('tools.translate.example_text_2')}\n\n`;
                helpText += `${t('tools.translate.language_codes')}:\n`;

                Object.entries(ISO_LANGUAGES).forEach(([code, lang]) => {
                    helpText += `${code} = ${lang}\n`;
                });

                await m.reply(helpText);
                return;
            }

            // Tambahkan reaksi proses
            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            // Deteksi bahasa sumber
            const sourceLang = await detectLanguage(text);

            // Terjemahkan
            const result = await translate(text, targetLang, sourceLang);

            // Format pesan hasil sesuai dengan format yang diminta
            let response = `**Input Text:** "${text}"\n`;
            response += `**Target Language:** ${result.to} (${result.toCode})\n\n`;
            response += `---\n### **Source Language Detection**\n`;
            response += `- **Language:** ${result.from}\n`;
            response += `- **ISO Code:** ${result.fromCode}\n\n`;
            response += `---\n### **Translation**\n`;
            response += `- **Result:** ${result.text}\n\n`;
            response += `---\n### **Pronunciation Guide**\n`;
            response += `- **Phonetics:** ${result.phoneticPronunciation}\n\n`;
            response += `---\n### **Context & Nuances (Optional)**\n`;
            response += `- **Notes:** ${result.contextNotes}`;

            await m.reply(response);

            // Tambahkan reaksi sukses
            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in translate command:', error);
            await m.reply(`❌ Error: ${error.message}`);

            // Tambahkan reaksi error
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
        }
    }
}; 