import localization from './localization.js';

// Middleware untuk menginisialisasi localization berdasarkan user language
export async function initializeLocalization(m, user) {
    try {
        if (!user) return 'id'; // default language

        const userLang = user.language || user.preferences?.language || 'id';

        // Set locale untuk sesi ini
        localization.setLocale(userLang);

        return userLang;
    } catch (error) {
        console.error('Error initializing localization:', error);
        localization.setLocale('id'); // fallback to Indonesian
        return 'id';
    }
}

// Helper function untuk mendapatkan teks terlokalisasi dengan fallback
export function getLocalizedText(key, params = {}, fallbackLang = 'id') {
    try {
        return localization.t(key, params);
    } catch (error) {
        console.error(`Localization error for key "${key}":`, error);
        // Fallback ke bahasa default
        const currentLang = localization.getLocale();
        if (currentLang !== fallbackLang) {
            localization.setLocale(fallbackLang);
            const fallbackText = localization.t(key, params);
            localization.setLocale(currentLang); // restore original locale
            return fallbackText;
        }
        return key; // return key jika gagal total
    }
}

// Helper untuk format angka berdasarkan locale
export function formatNumber(number, locale = null) {
    return localization.formatNumber(number, locale);
}

// Helper untuk format tanggal berdasarkan locale
export function formatDate(date, locale = null, options = {}) {
    return localization.formatDate(date, locale, options);
}

// Export singleton instance
export default {
    initializeLocalization,
    getLocalizedText,
    formatNumber,
    formatDate,
    localization
};