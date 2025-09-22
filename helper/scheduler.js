import { logger } from './logger.js';
import cron from 'node-cron';
import fetch from 'node-fetch';

class AutoNotification {
    constructor() {
        this.sock = null;
        this.isRunning = false;
        this.scheduledJobs = new Map();
        this.apiBaseUrl = globalThis.ryzumi.backendAnime
        this.apiEndpoint = globalThis.ryzumi.endpointAnime;
    }

    init(sock) {
        this.sock = sock;
        this.startDailyNotification();
        logger.info('📅 Anime notification scheduler initialized');
    }

    startDailyNotification() {
        if (this.scheduledJobs.has('daily_12pm')) {
            this.scheduledJobs.get('daily_12pm').destroy();
        }

        const job = cron.schedule('0 07 * * *', async () => {
            await this.sendDailyAnimeNotification();
        }, {
            scheduled: true,
            timezone: 'Asia/Jakarta'
        });

        this.scheduledJobs.set('daily_12pm', job);
        this.isRunning = true;
        logger.info('⏰ Daily anime notification scheduled for 12:00 PM (Asia/Jakarta)');
    }

    async fetchAnimeData() {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            logger.error('❌ Error fetching anime data:', error);
            return null;
        }
    }

    getCurrentDayName() {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const today = new Date();
        return days[today.getDay()];
    }

    filterAnimeByDay(animeList, targetDay) {
        if (!animeList || !Array.isArray(animeList)) {
            return [];
        }

        return animeList.filter(anime => {
            if (anime.rate && anime.rate[1]) {
                return anime.rate[1].trim().toLowerCase() === targetDay.toLowerCase();
            }
            return false;
        });
    }

    async sendDailyAnimeNotification() {
        try {
            if (!this.sock) {
                logger.error('❌ Socket not available for anime notification');
                return;
            }
    
            const targetNumber = '120363401901734192@g.us';
            const currentDate = new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Jakarta'
            });
            
            const currentTime = new Date().toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Jakarta'
            });
    
            const currentDay = this.getCurrentDayName();
            logger.info(`🗓️ Fetching anime for ${currentDay}`);
    
            const animeData = await this.fetchAnimeData();
            if (!animeData) {
                logger.error('❌ Failed to fetch anime data');
                return;
            }
    
            const todayAnime = this.filterAnimeByDay(animeData, currentDay);
    
            if (todayAnime.length === 0) {
                let message = `🎌 *JADWAL ANIME HARI INI*\n\n`;
                message += `📅 ${currentDate}\n`;
                message += `⏰ ${currentTime}\n\n`;
                message += `😔 Tidak ada anime yang tayang hari ${currentDay}\n\n`;
                message += `🔄 Coba cek lagi besok untuk jadwal anime terbaru!`;
                message += `\n\n🤖 Auto Update by: ${globalThis.botName || 'Kachina Bot'}`;

                await this.sock.sendMessage(targetNumber, { text: message });
                return;
            }

            let animeList = `🎌 *JADWAL ANIME HARI INI*\n\n`;
            animeList += `📅 ${currentDate}\n`;
            animeList += `⏰ ${currentTime}\n\n`;
            animeList += `🎯 *${todayAnime.length} Anime Tayang Hari ${currentDay}*\n\n`;

            todayAnime.forEach((anime, index) => {
                const episodeInfo = anime.eps && anime.eps[1] ? anime.eps[1].trim() : 'TBA';
                animeList += `${index + 1}. *${anime.judul}*\n`;
                animeList += `📊 Episode: ${episodeInfo}\n`;
                animeList += `🔗 Link: https://anime.antidonasi.web.id/anime/${anime.slug}\n\n`;
            });

            animeList += `✨ Selamat menonton anime favorit kalian!\n`;
            animeList += `\n🤖 Auto Update by: ${globalThis.botName || 'Kachina Bot'}`;

            await this.sock.sendMessage(targetNumber, { text: animeList });
            logger.success(`📤 Anime notification sent to ${targetNumber.split('@')[0]} - ${todayAnime.length} anime for ${currentDay}`);
    
        } catch (error) {
            logger.error('❌ Error sending anime notification:', error);
        }
    }

    async sendTestNotification() {
        try {
            if (!this.sock) {
                logger.error('❌ Socket not available for test notification');
                return false;
            }

            const targetNumber = '62895395590009@s.whatsapp.net';
            const currentDay = this.getCurrentDayName();
            
            const animeData = await this.fetchAnimeData();
            if (!animeData) {
                logger.error('❌ Failed to fetch anime data for test');
                return false;
            }

            const todayAnime = this.filterAnimeByDay(animeData, currentDay);
    
            if (todayAnime.length === 0) {
                let message = `🧪 *TEST ANIME NOTIFICATION*\n\n`;
                message += `📅 Test pada: ${new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`;
                message += `⏰ ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n`;
                message += `😔 Tidak ada anime yang tayang hari ${currentDay}\n\n`;
                message += `🔄 Coba cek lagi besok untuk jadwal anime terbaru!`;
                message += `\n\n🧪 *Ini adalah pesan test*\n🤖 Auto Update by: ${globalThis.botName || 'Kachina Bot'}`;

                await this.sock.sendMessage(targetNumber, { text: message });
                return true;
            }

            let testMessage = `🧪 *TEST ANIME NOTIFICATION*\n\n`;
            testMessage += `📅 Test pada: ${new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`;
            testMessage += `⏰ ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n`;
            testMessage += `🎯 *${todayAnime.length} Anime Tayang Hari ${currentDay}*\n\n`;

            todayAnime.forEach((anime, index) => {
                const episodeInfo = anime.eps && anime.eps[1] ? anime.eps[1].trim() : 'TBA';
                testMessage += `${index + 1}. *${anime.judul}*\n`;
                testMessage += `📊 Episode: ${episodeInfo}\n`;
                testMessage += `🔗 Link: https://anime.antidonasi.web.id/anime/${anime.slug}\n\n`;
            });

            testMessage += `✨ Selamat menonton anime favorit kalian!\n`;
            testMessage += `\n🧪 *Ini adalah pesan test*\n🤖 Auto Update by: ${globalThis.botName || 'Kachina Bot'}`;

            await this.sock.sendMessage(targetNumber, { text: testMessage });
            logger.success(`📤 Test anime notification sent to ${targetNumber.split('@')[0]} - ${todayAnime.length} anime for ${currentDay}`);
            return true;
    
        } catch (error) {
            logger.error('❌ Error sending test anime notification:', error);
            return false;
        }
    }

    stop() {
        this.scheduledJobs.forEach((job, name) => {
            job.destroy();
            logger.info(`🛑 Stopped scheduled job: ${name}`);
        });
        this.scheduledJobs.clear();
        this.isRunning = false;
        logger.info('📅 Anime notification scheduler stopped');
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            activeJobs: Array.from(this.scheduledJobs.keys()),
            nextRun: this.isRunning ? 'Daily at 12:00 PM (Asia/Jakarta)' : 'Not scheduled',
            apiEndpoint: this.apiEndpoint,
            currentDay: this.getCurrentDayName()
        };
    }

    async getAnimePreview() {
        try {
            const animeData = await this.fetchAnimeData();
            if (!animeData) return null;
            
            const currentDay = this.getCurrentDayName();
            const todayAnime = this.filterAnimeByDay(animeData, currentDay);
            
            return {
                day: currentDay,
                count: todayAnime.length,
                anime: todayAnime.slice(0, 5)
            };
        } catch (error) {
            logger.error('❌ Error getting anime preview:', error);
            return null;
        }
    }
}

const autoNotification = new AutoNotification();
export default autoNotification;