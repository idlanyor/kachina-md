import { logger } from './logger.js';
import cron from 'node-cron';
import fetch from 'node-fetch';
import { readFile, writeFile } from 'fs/promises';
import { setTimeout } from 'timers';
import { proto, generateWAMessageFromContent } from 'baileys';
import Database from './database.js';

class AutoNotification {
    constructor() {
        this.sock = null;
        this.isRunning = false;
        this.scheduledJobs = new Map();
        this.groupSchedulers = new Map(); 
        this.apiBaseUrl = globalThis.ryzumi.backendAnime
        this.apiEndpoint = globalThis.ryzumi.endpointAnime;
        this.prayerSchedulePath = 'lib/services/jadwalshalat.json';
        this.prayerApiUrl = `${globalThis.prayerConfig.apiUrl}?kota=${globalThis.prayerConfig.city}`;
    }

    init(sock) {
        this.sock = sock;
        this.startDailyNotification();
        this.initPrayerScheduler();
        logger.info('📅 Anime notification scheduler initialized');
        logger.info('🕌 Prayer notification scheduler initialized');
    }


    async initPrayerScheduler() {
        try {
            await this.fetchPrayerSchedule();
            const updateJob = cron.schedule('0 0 */28 * *', async () => {
                await this.fetchPrayerSchedule();
            }, {
                scheduled: true,
                timezone: 'Asia/Jakarta'
            });
            
            this.scheduledJobs.set('prayer_update', updateJob);
            logger.info('🕌 Prayer schedule auto-update enabled (every 28 days)');
            
            await this.loadPrayerGroupsFromDatabase();
        } catch (error) {
            logger.error('❌ Error initializing prayer scheduler:', error);
        }
    }

    async loadPrayerGroupsFromDatabase() {
        try {
            const groups = await Database.getAllPrayerNotificationGroups();
            logger.info(`📊 Loading prayer notifications for ${groups.length} group(s)`);
            
            for (const groupId of groups) {
                await this.schedulePrayerReminders(groupId);
            }
            
            if (groups.length > 0) {
                logger.success(`✅ Prayer notifications loaded for ${groups.length} group(s)`);
            }
        } catch (error) {
            logger.error('❌ Error loading prayer groups from database:', error);
        }
    }

    async fetchPrayerSchedule() {
        try {
            const response = await fetch(this.prayerApiUrl, {
                headers: {
                    'accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.schedules || data.schedules.length === 0) {
                throw new Error('No schedule data found in response');
            }
            
            await writeFile(this.prayerSchedulePath, JSON.stringify(data, null, 2));
            logger.success(`✅ Prayer schedule updated: ${new Date().toISOString()}`);
            return data;
        } catch (error) {
            logger.error('❌ Failed to fetch prayer schedule:', error);
            return null;
        }
    }

    delayUntil(targetTime, callback) {
        const now = new Date();
        const delay = targetTime - now;

        if (delay > 0) {
            return setTimeout(callback, delay);
        }
        return null;
    }

    clearGroupSchedulers(chatId) {
        if (this.groupSchedulers.has(chatId)) {
            const timeouts = this.groupSchedulers.get(chatId);
            timeouts.forEach(timeoutId => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            });
            this.groupSchedulers.set(chatId, []); 
            logger.info(`🧹 Cleared ${timeouts.length} existing scheduler(s) for ${chatId.split('@')[0]}`);
        }
    }

    async schedulePrayerReminders(chatId) {
        try {
            this.clearGroupSchedulers(chatId);
            
            const data = await readFile(this.prayerSchedulePath, 'utf-8');
            const scheduleData = JSON.parse(data);
            
            const today = new Date().toISOString().split('T')[0];
            
            const todaySchedule = scheduleData.schedules?.find(
                item => item.jadwal.date === today
            );

            if (!todaySchedule) {
                logger.warning('⚠️  Jadwal shalat tidak ditemukan untuk hari ini');
                return;
            }

            const jadwal = todaySchedule.jadwal;
            const now = new Date();
            
            const isFriday = now.getDay() === 5;
            
            const prayerTimes = [
                { name: 'Subuh', time: jadwal.subuh },
                { name: isFriday ? 'Jumatan' : 'Dzuhur', time: jadwal.dzuhur },
                { name: 'Ashar', time: jadwal.ashar },
                { name: 'Maghrib', time: jadwal.maghrib },
                { name: 'Isya', time: jadwal.isya }
            ];

            if (!this.groupSchedulers.has(chatId)) {
                this.groupSchedulers.set(chatId, []);
            }

            prayerTimes.forEach(({ name, time }) => {
                const [hours, minutes] = time.split(':').map(Number);
                const prayerTime = new Date(now);
                prayerTime.setHours(hours, minutes, 0, 0);

                const timeoutId = this.delayUntil(prayerTime, async () => {
                    try {
                        const titleText = name === 'Jumatan' 
                            ? '🕌 Waktu Shalat Jumat telah tiba' 
                            : `🕌 Waktu ${name} telah tiba`;
                        
                        if (globalThis.prayerConfig.enableAdzanAudio && globalThis.prayerConfig.adzanAudioUrl) {
                            try {
                                const audioResponse = await fetch(globalThis.prayerConfig.adzanAudioUrl);
                                const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
                                
                                await this.sock.sendMessage(chatId, {
                                    audio: audioBuffer,
                                    mimetype: 'audio/mpeg',
                                    ptt: false,
                                    fileName: `adzan-${name.toLowerCase()}.mp3`,
                                    contextInfo: {
                                        externalAdReply: {
                                            title: titleText,
                                            body: `${time} WIB • ${globalThis.prayerConfig.city}`,
                                            thumbnailUrl: this.getPrayerImage(name),
                                            sourceUrl: globalThis.newsletterUrl,
                                            mediaType: 1,
                                            renderLargerThumbnail: true
                                        }
                                    }
                                });
                                
                                logger.success(`✅ Prayer audio sent: ${name} to ${chatId.split('@')[0]}`);
                            } catch (audioError) {
                                logger.error(`❌ Error sending audio for ${name}:`, audioError.message);
                            }
                        }
                        
                        // Send text message notification
                        const message = generateWAMessageFromContent(chatId, proto.Message.fromObject({
                            extendedTextMessage: {
                                text: this.generatePrayerMessage(name, time),
                                contextInfo: {
                                    isForwarded: true,
                                    forwardingScore: 9999999,
                                    forwardedNewsletterMessageInfo: {
                                        newsletterJid: globalThis.newsletterUrl.replace('https://whatsapp.com/channel/', '') + '@newsletter',
                                        newsletterName: `${globalThis.botName} Prayer Times`,
                                        serverMessageId: -1
                                    },
                                    externalAdReply: {
                                        title: titleText,
                                        body: `${time} WIB • ${globalThis.prayerConfig.city}`,
                                        thumbnailUrl: this.getPrayerImage(name),
                                        sourceUrl: globalThis.newsletterUrl,
                                        mediaType: 1,
                                        renderLargerThumbnail: true
                                    }
                                }
                            }
                        }), { userJid: chatId });
                        
                        await this.sock.relayMessage(chatId, message.message, { messageId: message.key.id });
                        logger.success(`✅ Prayer notification sent: ${name} to ${chatId.split('@')[0]}`);
                    } catch (error) {
                        logger.error(`❌ Error sending prayer notification for ${name}:`, error.message);
                    }
                });
                
                if (timeoutId) {
                    this.groupSchedulers.get(chatId).push(timeoutId);
                }
            });

            logger.success(`✅ Prayer reminders scheduled for ${chatId.split('@')[0]} (${prayerTimes.length} times)`);
        } catch (error) {
            logger.error('❌ Error scheduling prayer reminders:', error);
        }
    }

    generatePrayerMessage(name, time) {
        let text = `╭─「 *SHALAT NOTIFICATION* 」\n`;
        text += `├ 🕌 *${name}*\n`;
        text += `├ 🕐 *${time} WIB*\n`;
        text += `├ 📍 *${globalThis.prayerConfig.city} dan sekitarnya*\n│\n`;

        switch (name) {
            case 'Terbit':
                text += `├ *Semangat Pagi*\n`;
                text += `├ Waktu *${name}* telah tiba\n`;
                text += `├ Selamat beraktifitas, semoga hari ini\n`;
                text += `├ senantiasa dilindungi Allah SWT 🤲🏻\n`;
                break;
            case 'Jumatan':
                text += `├ 🕌 *Waktu Shalat Jumat telah tiba!* 🕌\n`;
                text += `├ 📿 Mari segera menuju Masjid untuk menunaikan\n`;
                text += `├ shalat Jumat berjamaah 🤲🏻\n│\n`;
                text += `├ _"Hai orang-orang yang beriman, apabila diseru untuk\n`;
                text += `├ menunaikan shalat pada hari Jumat, maka bersegeralah\n`;
                text += `├ kamu kepada mengingat Allah dan tinggalkanlah jual beli.\n`;
                text += `├ Yang demikian itu lebih baik bagimu jika kamu mengetahui"_\n`;
                text += `├ (QS. Al-Jumu'ah: 9)\n│\n`;
                text += `├ 🌟 *Keutamaan Shalat Jumat:*\n`;
                text += `├ • Wajib bagi laki-laki Muslim\n`;
                text += `├ • Menghapus dosa antara 2 Jumat\n`;
                text += `├ • Mendapat pahala berlipat ganda\n`;
                text += `├ • Hari yang paling mulia dalam seminggu\n`;
                break;
            case 'Maghrib':
                text += `├ Waktu *${name}* telah tiba\n`;
                text += `├ Silakan persiapkan diri untuk shalat Berjamaah di masjid / mushola terdekat\n`;
                text += `├ sesungguhnya pahala shalat berjamaah adalah 27x lipat lebih banyak dibanding shalat sendirian 🤲🏻\n`;
                break;
            case 'Subuh':
                text += `├ 🌙 Waktu *${name}* telah tiba 🌙\n`;
                text += `├ Ayo shalat berjamaah!\n`;
                text += `├ Ambil wudhu dan bergegas menuju Masjid/Mushola terdekat\n`;
                text += `├ _Mereka yang memperoleh pahala paling besar karena mengerjakan sholat adalah mereka yang (tempat tinggalnya) paling jauh (dari masjid), kemudian mereka yang lebih jauh dari itu, dan seterusnya. Demikian pula orang yang menunggu mengerjakan sholat bersama imam memperoleh pahala yang lebih besar daripada orang yang mengerjakan sholat lalu pergi tidur_ 🤲🏻\n`;
                break;
            default:
                if (['Dzuhur', 'Ashar', 'Isya'].includes(name)) {
                    text += `├ Waktu Shalat *${name}* telah tiba\n`;
                    text += `├ Mari tinggalkan aktivitas sejenak\n`;
                    text += `├ Ambil wudhu dan laksanakan kewajiban 📿🤲🏻\n`;
                }
        }

        text += `╰──────────────────\n\n`;
        text += `_Powered by ${globalThis.botName}_`;
        return text;
    }

    getPrayerImage(name) {
        const baseUrl = globalThis.prayerConfig.imageBaseUrl;
        const images = {
            'Subuh': baseUrl + '960d151834ab1d4d7cf3ae525f5879fe.jpg',
            'Dzuhur': baseUrl + '960d151834ab1d4d7cf3ae525f5879fe.jpg',
            'Jumatan': baseUrl + '960d151834ab1d4d7cf3ae525f5879fe.jpg', 
            'Ashar': baseUrl + '960d151834ab1d4d7cf3ae525f5879fe.jpg',
            'Maghrib': baseUrl + '960d151834ab1d4d7cf3ae525f5879fe.jpg',
            'Isya': baseUrl + '960d151834ab1d4d7cf3ae525f5879fe.jpg',
        };
        return images[name] || baseUrl + '960d151834ab1d4d7cf3ae525f5879fe.jpg';
    }

    async addPrayerGroup(chatId) {
        try {
            const isAlreadyEnabled = await Database.isPrayerNotificationEnabled(chatId);
            if (!isAlreadyEnabled) {
                await Database.enablePrayerNotification(chatId);
                await this.schedulePrayerReminders(chatId);
                logger.success(`✅ Prayer notifications enabled for ${chatId.split('@')[0]}`);
                return true;
            }
            return false;
        } catch (error) {
            logger.error('❌ Error adding prayer group:', error);
            return false;
        }
    }

    async removePrayerGroup(chatId) {
        try {
            const isEnabled = await Database.isPrayerNotificationEnabled(chatId);
            if (isEnabled) {
                this.clearGroupSchedulers(chatId);
                
                await Database.disablePrayerNotification(chatId);
                logger.success(`✅ Prayer notifications disabled for ${chatId.split('@')[0]}`);
                return true;
            }
            return false;
        } catch (error) {
            logger.error('❌ Error removing prayer group:', error);
            return false;
        }
    }

    async getPrayerGroups() {
        try {
            return await Database.getAllPrayerNotificationGroups();
        } catch (error) {
            logger.error('❌ Error getting prayer groups:', error);
            return [];
        }
    }

    // ==================== ANIME NOTIFICATION METHODS ====================

    startDailyNotification() {
        if (this.scheduledJobs.has('daily_07am')) {
            this.scheduledJobs.get('daily_07am').destroy();
        }

        const job = cron.schedule('0 07 * * *', async () => {
            await this.sendDailyAnimeNotification();
        }, {
            scheduled: true,
            timezone: 'Asia/Jakarta'
        });

        this.scheduledJobs.set('daily_07am', job);
        this.isRunning = true;
        logger.info('⏰ Daily anime notification scheduled for 07:00 AM (Asia/Jakarta)');
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
            nextRun: this.isRunning ? 'Daily at 07:00 AM (Asia/Jakarta)' : 'Not scheduled',
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
