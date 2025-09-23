import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class Localization {
    constructor() {
        this.locales = {};
        this.defaultLocale = 'id';
        this.currentLocale = 'id';
        this.loadLocales();
    }

    loadLocales() {
        try {
            const localesDir = path.join(__dirname, '../locales');
            if (!fs.existsSync(localesDir)) {
                console.warn('Locales directory not found');
                return;
            }

            const files = fs.readdirSync(localesDir).filter(file => file.endsWith('.json'));

            for (const file of files) {
                const locale = path.basename(file, '.json');
                const filePath = path.join(localesDir, file);

                try {
                    const data = fs.readFileSync(filePath, 'utf8');
                    this.locales[locale] = JSON.parse(data);
                } catch (error) {
                    console.error(`Error loading locale ${locale}:`, error.message);
                }
            }
        } catch (error) {
            console.error('Error loading locales:', error.message);
        }
    }

    setLocale(locale) {
        if (this.locales[locale]) {
            this.currentLocale = locale;
            return true;
        }
        return false;
    }

    getLocale() {
        return this.currentLocale;
    }

    getAvailableLocales() {
        return Object.keys(this.locales);
    }

    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.locales[this.currentLocale];

        if (!value) {
            value = this.locales[this.defaultLocale];
        }

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key;
            }
        }

        if (typeof value !== 'string') {
            return key;
        }

        return this.interpolate(value, params);
    }

    interpolate(text, params) {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    getUserLocale(user) {
        return user?.language || this.defaultLocale;
    }

    setUserLocale(userId, locale) {
        if (this.locales[locale]) {
            return { success: true, locale };
        }
        return { success: false, error: 'Locale not supported' };
    }

    formatNumber(number, locale = null) {
        const targetLocale = locale || this.currentLocale;

        try {
            return new Intl.NumberFormat(this.getIntlLocale(targetLocale)).format(number);
        } catch (error) {
            return number.toString();
        }
    }

    formatDate(date, locale = null, options = {}) {
        const targetLocale = locale || this.currentLocale;

        try {
            const defaultOptions = {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };

            return new Intl.DateTimeFormat(
                this.getIntlLocale(targetLocale),
                { ...defaultOptions, ...options }
            ).format(date);
        } catch (error) {
            return date.toString();
        }
    }

    getIntlLocale(locale) {
        const localeMap = {
            'id': 'id-ID',
            'en': 'en-US',
            'ar': 'ar-SA',
            'zh': 'zh-CN',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'ja': 'ja-JP',
            'ko': 'ko-KR'
        };

        return localeMap[locale] || 'en-US';
    }

    reloadLocales() {
        this.locales = {};
        this.loadLocales();
    }
}

const localization = new Localization();

export default localization;
export { Localization };