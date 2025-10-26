import autoNotification from '../helper/scheduler.js';

export const handler = {
    command: ['adzan'],
    category: 'group',
    help: 'Mengaktifkan/menonaktifkan notifikasi waktu shalat otomatis',
    isGroup: true,
    isAdmin: true,
    exec: async ({ sock, m, args }) => {
        try {
            if (!args) {
                const audioStatus = globalThis.prayerConfig.enableAdzanAudio ? '🔊 Aktif' : '🔇 Nonaktif';
                const status = `🕌 *PRAYER NOTIFICATION MENU*

📋 *Perintah tersedia:*
├ !adzan on - Aktifkan notifikasi
├ !adzan off - Matikan notifikasi
├ !adzan status - Cek status
├ !adzan info - Info jadwal hari ini
├ !adzan audio <on/off> - Toggle audio adzan

📍 *Lokasi:* ${globalThis.prayerConfig.city}
⏰ *Timezone:* Asia/Jakarta (WIB)
🔊 *Audio Adzan:* ${audioStatus}

_Gunakan !adzan <on/off/status/info/audio>_`

                await sock.sendMessage(m.chat, {
                    text: status,
                    contextInfo: {
                        externalAdReply: {
                            title: '🕌 Prayer Notification',
                            body: 'Notifikasi Waktu Shalat Otomatis',
                            thumbnailUrl: `${globalThis.ppUrl}`,
                            sourceUrl: `${globalThis.newsletterUrl}`,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                })
                return
            }

            const action = args.toLowerCase().split(' ')[0];

            switch (action) {
                case 'on':
                case 'aktif':
                case 'enable':
                    const added = await autoNotification.addPrayerGroup(m.chat);
                    if (added) {
                        await sock.sendMessage(m.chat, {
                            text: `✅ *Notifikasi Shalat Diaktifkan!*

Grup ini akan menerima notifikasi otomatis untuk:
🌙 Subuh
☀️ Dzuhur (Jumatan jika hari Jumat)
🌤️ Ashar
🌅 Maghrib
🌃 Isya

📍 Lokasi: ${globalThis.prayerConfig.city}
⏰ Notifikasi akan dikirim tepat pada waktu shalat`,
                            contextInfo: {
                                externalAdReply: {
                                    title: '✅ Prayer Notification Enabled',
                                    body: 'Notifikasi shalat telah diaktifkan',
                                    thumbnailUrl: `${globalThis.ppUrl}`,
                                    sourceUrl: `${globalThis.newsletterUrl}`,
                                    mediaType: 1,
                                    renderLargerThumbnail: true
                                }
                            }
                        })
                    } else {
                        await m.reply('⚠️ Notifikasi shalat sudah aktif untuk grup ini')
                    }
                    break

                case 'off':
                case 'nonaktif':
                case 'disable':
                    const removed = await autoNotification.removePrayerGroup(m.chat);
                    if (removed) {
                        await sock.sendMessage(m.chat, {
                            text: `✅ *Notifikasi Shalat Dinonaktifkan!*

Grup ini tidak akan lagi menerima notifikasi waktu shalat otomatis.

Ketik *!prayer on* untuk mengaktifkan kembali.`,
                            contextInfo: {
                                externalAdReply: {
                                    title: '🔕 Prayer Notification Disabled',
                                    body: 'Notifikasi shalat telah dinonaktifkan',
                                    thumbnailUrl: `${globalThis.ppUrl}`,
                                    sourceUrl: `${globalThis.newsletterUrl}`,
                                    mediaType: 1,
                                    renderLargerThumbnail: true
                                }
                            }
                        })
                    } else {
                        await m.reply('⚠️ Notifikasi shalat tidak aktif untuk grup ini')
                    }
                    break

                case 'status':
                    const groups = await autoNotification.getPrayerGroups();
                    const isActive = groups.includes(m.chat);
                    await sock.sendMessage(m.chat, {
                        text: `📊 *Status Notifikasi Shalat*

Status: ${isActive ? '✅ Aktif' : '❌ Tidak Aktif'}
📍 Lokasi: ${globalThis.prayerConfig.city}
⏰ Timezone: Asia/Jakarta (WIB)
👥 Total grup aktif: ${groups.length}

${isActive ? 'Ketik *!prayer off* untuk menonaktifkan' : 'Ketik *!prayer on* untuk mengaktifkan'}`,
                        contextInfo: {
                            externalAdReply: {
                                title: '📊 Prayer Notification Status',
                                body: isActive ? 'Status: Aktif' : 'Status: Tidak Aktif',
                                thumbnailUrl: `${globalThis.ppUrl}`,
                                sourceUrl: `${globalThis.newsletterUrl}`,
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    })
                    break

                case 'info':
                case 'jadwal':
                    try {
                        const { readFile } = await import('fs/promises');
                        const data = await readFile('lib/services/jadwalshalat.json', 'utf-8');
                        const scheduleData = JSON.parse(data);
                        
                        // Get today's date in YYYY-MM-DD format
                        const today = new Date().toISOString().split('T')[0];
                        
                        // Find today's schedule
                        const todaySchedule = scheduleData.schedules?.find(
                            item => item.jadwal.date === today
                        );

                        if (!todaySchedule) {
                            await m.reply('⚠️ Jadwal shalat untuk hari ini belum tersedia.\n\nSilakan coba lagi nanti.')
                            return
                        }

                        const jadwal = todaySchedule.jadwal;
                        const currentDate = jadwal.tanggal; // Sudah dalam format "Minggu, 26/10/2025"
                        
                        // Check if today is Friday
                        const now = new Date();
                        const isFriday = now.getDay() === 5;
                        const dzuhurLabel = isFriday ? '🕌 Jumatan' : '☀️ Dzuhur';

                        await sock.sendMessage(m.chat, {
                            text: `🕌 *JADWAL SHALAT HARI INI*

📅 ${currentDate}
📍 ${todaySchedule.lokasi}, ${todaySchedule.daerah}

🌙 Subuh: ${jadwal.subuh} WIB
🌅 Terbit: ${jadwal.terbit} WIB
🌄 Dhuha: ${jadwal.dhuha} WIB
${dzuhurLabel}: ${jadwal.dzuhur} WIB${isFriday ? ' *(Shalat Jumat)*' : ''}
🌤️ Ashar: ${jadwal.ashar} WIB
🌆 Maghrib: ${jadwal.maghrib} WIB
🌃 Isya: ${jadwal.isya} WIB

_Powered by ${globalThis.botName}_`,
                            contextInfo: {
                                externalAdReply: {
                                    title: '🕌 Jadwal Shalat Hari Ini',
                                    body: `${todaySchedule.lokasi} • ${currentDate}`,
                                    thumbnailUrl: `${globalThis.ppUrl}`,
                                    sourceUrl: `${globalThis.newsletterUrl}`,
                                    mediaType: 1,
                                    renderLargerThumbnail: true
                                }
                            }
                        })
                    } catch (error) {
                        await m.reply(`❌ Gagal mengambil jadwal shalat.\n\nError: ${error.message}`)
                    }
                    break

                case 'audio':
                case 'sound':
                    const audioAction = args.toLowerCase().split(' ')[1];
                    
                    if (!audioAction || !['on', 'off'].includes(audioAction)) {
                        const currentStatus = globalThis.prayerConfig.enableAdzanAudio ? '🔊 Aktif' : '🔇 Nonaktif';
                        await m.reply(`🔊 *Audio Adzan Status*\n\nStatus saat ini: ${currentStatus}\n\nGunakan:\n• !adzan audio on - Aktifkan audio\n• !adzan audio off - Matikan audio`)
                        return
                    }

                    if (audioAction === 'on') {
                        if (globalThis.prayerConfig.enableAdzanAudio) {
                            await m.reply('⚠️ Audio adzan sudah aktif')
                        } else {
                            globalThis.prayerConfig.enableAdzanAudio = true;
                            await sock.sendMessage(m.chat, {
                                text: `🔊 *Audio Adzan Diaktifkan!*\n\nSetiap notifikasi adzan akan disertai audio adzan.\n\n_Audio akan dikirim bersamaan dengan notifikasi teks._`,
                                contextInfo: {
                                    externalAdReply: {
                                        title: '🔊 Audio Adzan Enabled',
                                        body: 'Audio adzan telah diaktifkan',
                                        thumbnailUrl: `${globalThis.ppUrl}`,
                                        sourceUrl: `${globalThis.newsletterUrl}`,
                                        mediaType: 1,
                                        renderLargerThumbnail: true
                                    }
                                }
                            })
                        }
                    } else if (audioAction === 'off') {
                        if (!globalThis.prayerConfig.enableAdzanAudio) {
                            await m.reply('⚠️ Audio adzan sudah nonaktif')
                        } else {
                            globalThis.prayerConfig.enableAdzanAudio = false;
                            await sock.sendMessage(m.chat, {
                                text: `🔇 *Audio Adzan Dinonaktifkan!*\n\nNotifikasi adzan hanya akan mengirim teks tanpa audio.\n\n_Ketik !adzan audio on untuk mengaktifkan kembali._`,
                                contextInfo: {
                                    externalAdReply: {
                                        title: '🔇 Audio Adzan Disabled',
                                        body: 'Audio adzan telah dinonaktifkan',
                                        thumbnailUrl: `${globalThis.ppUrl}`,
                                        sourceUrl: `${globalThis.newsletterUrl}`,
                                        mediaType: 1,
                                        renderLargerThumbnail: true
                                    }
                                }
                            })
                        }
                    }
                    break

                default:
                    await m.reply(`❌ Perintah tidak dikenal: ${action}\n\nGunakan: !adzan <on/off/status/info/audio>`)
            }
        } catch (error) {
            console.error('Error in prayer notification:', error)
            await m.reply(`❌ Terjadi kesalahan: ${error.message}`)
        }
    }
}

