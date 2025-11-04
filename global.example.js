import localization from './helper/localization.js';

// variabel dasar
globalThis.owner = "Your Bot Owner Name";
globalThis.botName = "Kachina-MD";
globalThis.ownerNumber = ["YOUR_OWNER_NUMBER"]
// globalThis.botNumber = "YOUR_BOT_NUMBER"
globalThis.botNumber = "YOUR_BOT_NUMBER"
globalThis.sessionName = 'kachina-bot'
globalThis.WEBHOOK_PORT = 3036
globalThis.WEBHOOK_SECRET = 'YOUR_WEBHOOK_SECRET'

// Localization
globalThis.t = localization.t.bind(localization);
globalThis.setLocale = localization.setLocale.bind(localization);
globalThis.getUserLocale = localization.getUserLocale.bind(localization);
globalThis.localization = localization;
// globalThis.ppUrl = 'https://telegra.ph/file/8360caca1efd0f697d122.jpg'
globalThis.ppUrl = 'https://files.catbox.moe/uovwz0.jpg'
// globalThis.ppUrl = 'https://s3.ryzumi.vip/ryzumi-api/8d34c7318f962cbddd40384a.jpg'
// globalThis.ppUrl = 'https://files.catbox.moe/5lzdmq.png'
globalThis.bannerUrl = 'https://files.catbox.moe/2ytxp6.png'
globalThis.newsletterUrl = 'https://whatsapp.com/channel/0029VagADOLLSmbaxFNswH1m'

// Store Configuration
globalThis.storeConfig = {
    pterodactyl: {
        url: "https://your-panel-url.com",
        apiKey: "YOUR_PTERODACTYL_CLIENT_API_KEY",
        adminApiKey: "YOUR_PTERODACTYL_ADMIN_API_KEY",
        emailSuffix: "your-domain.com"
    },
    qris: {
        // Add your QRIS image URL here
        imageUrl: "YOUR_QRIS_IMAGE_URL"
    },
    admin: {
        owner: "YOUR_OWNER_NUMBER",
        storeAdmin: "YOUR_STORE_ADMIN_NUMBER"
    }
}
globalThis.premiumConfig = {

    qris: {
        // Add your QRIS image URL here
        imageUrl: "YOUR_QRIS_IMAGE_URL"
    },
    admin: {
        owner: "YOUR_OWNER_NUMBER",
        storeAdmin: "YOUR_STORE_ADMIN_NUMBER"
    }
}
globalThis.ryzumi = {
    backendAnime: "https://backend.ryzumi.vip/",
    endpointAnime: "https://backend.ryzumi.vip/anime?type=ongoing",
}

// Prayer Schedule Configuration
globalThis.prayerConfig = {
    apiUrl: "https://api.ryzumi.vip/api/search/jadwal-sholat",
    city: "Purbalingga",  // Bisa diganti sesuai lokasi
    // Untuk gambar tetap gunakan hikaru
    imageBaseUrl: "https://s3.nevaobjects.id/kanata-s3/kachina/prayer/",
    // Audio adzan (URL ke file MP3)
    adzanAudioUrl: "https://s3.nevaobjects.id/kanata-s3/kachina/prayer/adzan-full.mp3",
    // Enable/disable audio adzan
    enableAdzanAudio: true
}
// Products Configuration
globalThis.products = {
    nodejs: {
        a1: { name: "NodeJS Mini", ram: "1GB", cpu: "75%", price: 1000, nodeId: 1, eggId: 15 },
        a2: { name: "NodeJS Kroco", ram: "2GB", cpu: "100%", price: 2500, nodeId: 1, eggId: 15 },
        a3: { name: "NodeJS Karbit", ram: "3GB", cpu: "100%", price: 5000, nodeId: 1, eggId: 15 },
        a4: { name: "NodeJS Standar", ram: "4GB", cpu: "150%", price: 7500, nodeId: 1, eggId: 15 },
        a5: { name: "NodeJS Kakap", ram: "5GB", cpu: "200%", price: 10000, nodeId: 1, eggId: 15 },
        a6: { name: "NodeJS Sepuh", ram: "6GB", cpu: "250%", price: 12500, nodeId: 1, eggId: 15 },
        a7: { name: "NodeJS Suhu", ram: "7GB", cpu: "300%", price: 15000, nodeId: 1, eggId: 15 },
        a8: { name: "NodeJS Superior", ram: "8GB", cpu: "400%", price: 17500, nodeId: 1, eggId: 15 },
        a9: { name: "NodeJS Ultra", ram: "9GB", cpu: "400%", price: 20000, nodeId: 1, eggId: 15 }
    },
    vps: {
        b1: { name: "VPS Kroco", ram: "2GB", cpu: "100%", price: 5000, nodeId: 1, eggId: 16 },
        b2: { name: "VPS Karbit", ram: "4GB", cpu: "200%", price: 10000, nodeId: 1, eggId: 16 },
        b3: { name: "VPS Standar", ram: "6GB", cpu: "300%", price: 15000, nodeId: 1, eggId: 16 },
        b4: { name: "VPS Sepuh", ram: "8GB", cpu: "400%", price: 20000, nodeId: 1, eggId: 16 },
        b5: { name: "VPS Suhu", ram: "10GB", cpu: "500%", price: 25000, nodeId: 1, eggId: 16 },
        b6: { name: "VPS Ultimate", ram: "12GB", cpu: "600%", price: 35000, nodeId: 1, eggId: 16 }
    },
    python: {
        c1: { name: "Python Mini", ram: "1GB", cpu: "100%", price: 1000, nodeId: 1, eggId: 17 },
        c2: { name: "Python Kroco", ram: "2GB", cpu: "125%", price: 4000, nodeId: 1, eggId: 17 },
        c3: { name: "Python Karbit", ram: "3GB", cpu: "150%", price: 6000, nodeId: 1, eggId: 17 },
        c4: { name: "Python Standar", ram: "4GB", cpu: "200%", price: 8000, nodeId: 1, eggId: 17 },
        c5: { name: "Python Kakap", ram: "5GB", cpu: "225%", price: 10000, nodeId: 1, eggId: 17 },
        c6: { name: "Python Sepuh", ram: "6GB", cpu: "300%", price: 12000, nodeId: 1, eggId: 17 },
        c7: { name: "Python Suhu", ram: "7GB", cpu: "325%", price: 14000, nodeId: 1, eggId: 17 },
        c8: { name: "Python Ultimate", ram: "8GB", cpu: "400%", price: 16000, nodeId: 1, eggId: 17 }
    },
    go: {
        d1: { name: "Go Mini", ram: "1GB", cpu: "100%", price: 1000, nodeId: 1, eggId: 18 },
        d2: { name: "Go Kroco", ram: "2GB", cpu: "125%", price: 4000, nodeId: 1, eggId: 18 },
        d3: { name: "Go Karbit", ram: "3GB", cpu: "150%", price: 6000, nodeId: 1, eggId: 18 },
        d4: { name: "Go Standar", ram: "4GB", cpu: "200%", price: 8000, nodeId: 1, eggId: 18 },
        d5: { name: "Go Kakap", ram: "5GB", cpu: "225%", price: 10000, nodeId: 1, eggId: 18 },
        d6: { name: "Go Sepuh", ram: "6GB", cpu: "300%", price: 12000, nodeId: 1, eggId: 18 },
        d7: { name: "Go Suhu", ram: "7GB", cpu: "325%", price: 14000, nodeId: 1, eggId: 18 },
        d8: { name: "Go Ultimate", ram: "8GB", cpu: "400%", price: 16000, nodeId: 1, eggId: 18 }
    }
}

// fungsi dasar
globalThis.isOwner = (id) => {
    return id === globalThis.ownerNumber
}
globalThis.isBot = async (id) => {
    return id === botNumber
}

// Store helper functions
globalThis.isStoreAdmin = (id) => {
    // console.log(id)
    // console.log('anu',globalThis.storeConfig.admin.storeAdmin)
    return id === globalThis.storeConfig.admin.storeAdmin + '@s.whatsapp.net' || globalThis.ownerNumber.includes(id)
}

globalThis.getProduct = (code) => {
    const lowerCode = code.toLowerCase()
    for (const category in globalThis.products) {
        if (globalThis.products[category][lowerCode]) {
            return { ...globalThis.products[category][lowerCode], code: lowerCode, category }
        }
    }
    return null
}

// Initialize game objects
if (!global.sinonimGame) {
    global.sinonimGame = {};
}

// variabel apikey
globalThis.apiKey = {
    gemini: 'YOUR_GEMINI_API_KEY',
    gpt: 'YOUR_GPT_API_KEY',
    ytdl: 'YOUR_YTDL_API_KEY',
    fasturl: 'YOUR_FASTURL_API_KEY',
    mistral: 'YOUR_MISTRAL_API_KEY',
    removeBG: 'YOUR_REMOVEBG_API_KEY',
    groq: 'YOUR_GROQ_API_KEY',
    pdf: {
        secret: 'YOUR_PDF_SECRET_KEY',
        public: 'YOUR_PDF_PUBLIC_KEY'
    }
}
// variabel paired apikey with baseurl
globalThis.apiHelper = {
    medanpedia: {
        apiId: 'YOUR_MEDANPEDIA_API_ID',
        apiKey: 'YOUR_MEDANPEDIA_API_KEY'
    },
    lolhuman: {

        apikey: 'YOUR_LOLHUMAN_API_KEY',

        baseUrl: 'https://api.lolhuman.xyz/api/'

    },

    betabotz: {

        apikey: 'YOUR_BETABOTZ_API_KEY',

        baseUrl: 'https://api.betabotz.eu.org/api/'

    },

    skizotech: {

        apikey: 'YOUR_SKIZOTECH_API_KEY',

        baseUrl: 'https://skizo.tech/api/'

    },
    nyxs: {
        apikey: 'YOUR_NYXS_API_KEY',
        baseUrl: 'https://api.nyxs.pw/api/'
    }

}
