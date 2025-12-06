import axios from 'axios';

const ALICE_API_BASE = 'https://app.alice.ws/cli/v1';

const getApiKey = () => {
    // Ganti API key punyamu
    return globalThis.apiKey?.alice || process.env.ALICE_API_KEY || '';
};

const aliceApi = axios.create({
    baseURL: ALICE_API_BASE,
    headers: {
        'Content-Type': 'application/json'
    }
});

aliceApi.interceptors.request.use((config) => {
    config.headers.Authorization = `Bearer ${getApiKey()}`;
    return config;
});

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const handler = {
    command: ['alice', 'vpsalice', 'ephemera'],
    category: 'tools',
    isOwner: true,
    help: `Manage Alice Ephemera VPS

*Penggunaan:*
• .alice plans - Lihat daftar paket VPS
• .alice os <plan_id> - Lihat OS yang tersedia
• .alice create <plan_id> <os_id> <jam> - Buat VPS baru
• .alice list - Lihat daftar VPS aktif
• .alice info <id> - Lihat detail VPS
• .alice delete <id> - Hapus VPS
• .alice power <id> <action> - Power control (boot/shutdown/restart/poweroff)
• .alice renew <id> <jam> - Perpanjang VPS
• .alice profile - Lihat profil akun

*Contoh:*
.alice create 38 1 24 - Buat VPS Micro dengan Debian 12 selama 24 jam`,
    exec: async ({ sock, m, args }) => {
        try {
             if (!m.isOwner()) {
                await m.reply('❌ Perintah ini hanya untuk owner bot!');
                return;
            }
            if (!getApiKey()) {
                await m.reply('❌ API Key Alice belum dikonfigurasi. Silakan tambahkan di global.js:\nglobalThis.apiKey.alice = "client_id:secret"');
                return;
            }

            const subCommand = args.split(' ')[0]?.toLowerCase();
            const params = args.split(' ').slice(1);

            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            switch (subCommand) {
                case 'plans':
                case 'paket':
                    await handlePlans(sock, m);
                    break;

                case 'os':
                case 'image':
                    await handleOsImages(sock, m, params[0]);
                    break;

                case 'create':
                case 'deploy':
                case 'buat':
                    await handleDeploy(sock, m, params);
                    break;

                case 'list':
                case 'ls':
                case 'daftar':
                    await handleList(sock, m);
                    break;

                case 'info':
                case 'state':
                case 'status':
                    await handleState(sock, m, params[0]);
                    break;

                case 'delete':
                case 'hapus':
                case 'destroy':
                    await handleDelete(sock, m, params[0]);
                    break;

                case 'power':
                    await handlePower(sock, m, params[0], params[1]);
                    break;

                case 'renew':
                case 'perpanjang':
                    await handleRenew(sock, m, params[0], params[1]);
                    break;

                case 'profile':
                case 'profil':
                    await handleProfile(sock, m);
                    break;

                default:
                    await m.reply(`🖥️ *ALICE EPHEMERA VPS*

*Subcommand:*
• plans - Lihat daftar paket
• os <plan_id> - Lihat OS tersedia
• create <plan_id> <os_id> <jam> - Buat VPS
• list - Daftar VPS aktif
• info <id> - Detail VPS
• delete <id> - Hapus VPS
• power <id> <action> - Power control
• renew <id> <jam> - Perpanjang
• profile - Profil akun

_Ketik .alice plans untuk mulai_`);
            }

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error('Error in alice vps:', error);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            
            const errorMsg = error.response?.data?.message || error.message;
            await m.reply(`❌ Error: ${errorMsg}`);
        }
    }
};

async function handlePlans(sock, m) {
    const response = await aliceApi.get('/evo/plans');
    const plans = response.data.data;

    if (!plans || plans.length === 0) {
        await m.reply('❌ Tidak ada paket tersedia');
        return;
    }

    let text = `🖥️ *DAFTAR PAKET VPS ALICE*\n\n`;

    for (const plan of plans) {
        const memory = plan.memory >= 1024 ? `${(plan.memory / 1024).toFixed(0)}GB` : `${plan.memory}MB`;
        const disk = plan.disk >= 1000 ? `${(plan.disk / 1000).toFixed(0)}TB` : `${plan.disk}GB`;
        
        text += `*${plan.name}* (ID: ${plan.id})\n`;
        text += `├ CPU: ${plan.cpu} Core (${plan.cpu_name})\n`;
        text += `├ RAM: ${memory}\n`;
        text += `├ Disk: ${disk} ${plan.disk_type}\n`;
        text += `├ Speed: ${plan.show_speed}\n`;
        text += `├ Stock: ${plan.stock}\n`;
        text += `├ Region: ${plan.region === 2 ? 'Salt Lake City' : 'Unknown'}\n`;
        if (plan.gpu) text += `├ GPU: ${plan.gpu}\n`;
        text += `└ Status: ${plan.status === 1 ? '✅ Available' : '❌ Unavailable'}\n\n`;
    }

    text += `_Gunakan .alice os <plan_id> untuk melihat OS tersedia_`;

    await m.reply(text);
}

async function handleOsImages(sock, m, planId) {
    if (!planId) {
        await m.reply('❌ Masukkan plan ID\nContoh: .alice os 38');
        return;
    }

    const response = await aliceApi.get(`/evo/plans/${planId}/os-images`);
    const osGroups = response.data.data;

    if (!osGroups || osGroups.length === 0) {
        await m.reply('❌ Tidak ada OS tersedia untuk plan ini');
        return;
    }

    let text = `💿 *OS TERSEDIA UNTUK PLAN ${planId}*\n\n`;

    for (const group of osGroups) {
        text += `*${group.group_name}*\n`;
        for (const os of group.os_list) {
            text += `├ ID: ${os.id} - ${os.name}\n`;
        }
        text += '\n';
    }

    text += `_Gunakan .alice create ${planId} <os_id> <jam>_`;

    await m.reply(text);
}

async function handleDeploy(sock, m, params) {
    const [planId, osId, time] = params;

    if (!planId || !osId || !time) {
        await m.reply(`❌ Format salah!
*Penggunaan:* .alice create <plan_id> <os_id> <jam>
*Contoh:* .alice create 38 1 24

Gunakan .alice plans untuk melihat plan_id
Gunakan .alice os <plan_id> untuk melihat os_id`);
        return;
    }

    await m.reply('⏳ Sedang membuat VPS, mohon tunggu...');

    const response = await aliceApi.post('/evo/instances/deploy', {
        product_id: parseInt(planId),
        os_id: parseInt(osId),
        time: parseInt(time),
        ssh_key_id: null,
        boot_script: null
    });

    const vps = response.data.data;

    const text = `✅ *VPS BERHASIL DIBUAT!*

🆔 *ID:* ${vps.id}
📛 *Hostname:* ${vps.hostname}
📦 *Plan:* ${vps.plan}

*🔧 SPESIFIKASI:*
├ CPU: ${vps.cpu} Core (${vps.cpu_name})
├ RAM: ${formatBytes(vps.memory * 1024 * 1024)}
├ Disk: ${vps.disk}GB ${vps.disk_type}
├ OS: ${vps.os}
└ Speed: ${vps.show_speed}

*🌐 NETWORK:*
├ IPv4: ${vps.ipv4}
├ IPv6: ${vps.ipv6}
└ Region: ${vps.region}

*🔐 AKSES SSH:*
├ Host: ${vps.ipv4}
├ User: ${vps.user}
├ Pass: ${vps.password}
└ Port: 22

*⏰ WAKTU:*
├ Dibuat: ${vps.creation_at}
└ Expired: ${vps.expiration_at}

\`\`\`
ssh ${vps.user}@${vps.ipv4}
\`\`\``;

    await m.reply(text);
}

async function handleList(sock, m) {
    const response = await aliceApi.get('/evo/instances');
    const instances = response.data.data;

    if (!instances || instances.length === 0) {
        await m.reply('📭 Tidak ada VPS aktif');
        return;
    }

    let text = `🖥️ *DAFTAR VPS AKTIF*\n\n`;

    for (const vps of instances) {
        text += `*${vps.plan}* (ID: ${vps.id})\n`;
        text += `├ Host: ${vps.hostname}\n`;
        text += `├ IPv4: ${vps.ipv4}\n`;
        text += `├ OS: ${vps.os}\n`;
        text += `├ Status: ${vps.status === 'active' ? '🟢 Active' : '🔴 ' + vps.status}\n`;
        text += `└ Expired: ${vps.expiration_at}\n\n`;
    }

    text += `_Gunakan .alice info <id> untuk detail_`;

    await m.reply(text);
}

async function handleState(sock, m, instanceId) {
    if (!instanceId) {
        await m.reply('❌ Masukkan instance ID\nContoh: .alice info 12345');
        return;
    }

    const response = await aliceApi.get(`/evo/instances/${instanceId}/state`);
    const data = response.data.data;

    const memUsed = data.state?.memory?.memtotal - data.state?.memory?.memfree || 0;
    const memTotal = data.state?.memory?.memtotal || 0;
    const memPercent = memTotal > 0 ? ((memUsed / memTotal) * 100).toFixed(1) : 0;

    const text = `📊 *STATUS VPS ${instanceId}*

*🔧 SPESIFIKASI:*
├ Plan: ${data.name}
├ CPU: ${data.cpu} Core (${data.cpu_name})
├ RAM: ${formatBytes(data.memory * 1024 * 1024)}
└ Disk: ${data.disk}GB

*📈 RESOURCE USAGE:*
├ CPU: ${data.state?.cpu || 0}%
├ RAM: ${formatBytes(memUsed * 1024)} / ${formatBytes(memTotal * 1024)} (${memPercent}%)
└ State: ${data.state?.state || 'unknown'}

*🌐 NETWORK:*
├ IPv4: ${data.ipv4_primary}
├ IPv6: ${data.ipv6_primary}
├ Traffic In: ${formatBytes(data.state?.traffic?.in || 0)}
├ Traffic Out: ${formatBytes(data.state?.traffic?.out || 0)}
└ Total: ${formatBytes(data.state?.traffic?.total || 0)}

*💻 SYSTEM:*
├ OS: ${data.system?.name}
└ Status: ${data.status}`;

    await m.reply(text);
}

async function handleDelete(sock, m, instanceId) {
    if (!instanceId) {
        await m.reply('❌ Masukkan instance ID\nContoh: .alice delete 12345');
        return;
    }

    await m.reply(`⚠️ Menghapus VPS ${instanceId}...`);

    const response = await aliceApi.delete(`/evo/instances/${instanceId}`);

    await m.reply(`✅ VPS ${instanceId} berhasil dihapus!`);
}

async function handlePower(sock, m, instanceId, action) {
    const validActions = ['boot', 'shutdown', 'restart', 'poweroff'];

    if (!instanceId || !action) {
        await m.reply(`❌ Format salah!
*Penggunaan:* .alice power <id> <action>
*Actions:* boot, shutdown, restart, poweroff
*Contoh:* .alice power 12345 restart`);
        return;
    }

    if (!validActions.includes(action.toLowerCase())) {
        await m.reply(`❌ Action tidak valid!\nGunakan: ${validActions.join(', ')}`);
        return;
    }

    const response = await aliceApi.post(`/evo/instances/${instanceId}/power`, {
        action: action.toLowerCase()
    });

    const actionText = {
        boot: '🟢 Boot',
        shutdown: '🔴 Shutdown',
        restart: '🔄 Restart',
        poweroff: '⚫ Poweroff'
    };

    await m.reply(`✅ ${actionText[action.toLowerCase()]} berhasil untuk VPS ${instanceId}`);
}

async function handleRenew(sock, m, instanceId, hours) {
    if (!instanceId || !hours) {
        await m.reply(`❌ Format salah!
*Penggunaan:* .alice renew <id> <jam>
*Contoh:* .alice renew 12345 24`);
        return;
    }

    const response = await aliceApi.post(`/evo/instances/${instanceId}/renewals`, {
        time: parseInt(hours)
    });

    const data = response.data.data;

    await m.reply(`✅ *VPS DIPERPANJANG!*

🆔 Instance: ${instanceId}
⏱️ Ditambah: ${data.added_hours} jam
📅 Expired Baru: ${data.expiration_at}
⏰ Total Jam: ${data.total_service_hours} jam`);
}

async function handleProfile(sock, m) {
    const response = await aliceApi.get('/account/profile');
    const profile = response.data.data;

    const text = `👤 *PROFIL ALICE*

📛 *Username:* ${profile.username}
📧 *Email:* ${profile.email}
👤 *Nama:* ${profile.fullname}

💰 *Saldo:*
├ Credit: ${profile.credit}
├ Points: ${profile.points}
└ Spent: ${profile.total_spent}

🖥️ *Instance:*
├ Max: ${profile.max_instances}
└ Grade: ${profile.grade}

📍 *Lokasi:*
├ ${profile.address_1}
├ ${profile.city}
└ ${profile.country}

📅 *Tanggal:*
├ Register: ${profile.register_date}
└ Last Login: ${profile.lastlogin_date}`;

    await m.reply(text);
}

export default handler;
