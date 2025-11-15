import Database from './database.js'
import { resolve } from 'path'
import { getMedia } from './mediaMsg.js';
import { readFileSync } from 'fs';
import { cacheGroupMetadata } from './caching.js';


const thumbPath = resolve(import.meta.dirname, '../media/thumbnail.jpg')

/**
 * Normalize JID to handle @lid format
 * When addressingMode is "lid", WhatsApp uses alternative JID format
 * We need to use the Alt version which has standard @s.whatsapp.net format
 * Reference: https://github.com/WhiskeySockets/Baileys/issues/2013
 */
export function normalizeJid(key, isGroup = false) {
    if (key.addressingMode === "lid") {
        if (isGroup) {
            return key.participant || key.participantAlt;
        } else {
            return key.remoteJid || key.remoteJidAlt;
        }
    }

    if (isGroup) {
        return key.participant;
    }

    return key.remoteJid;
}

/**
 * Menambahkan handler dan properti tambahan ke objek pesan
 * @param {object} m - Objek pesan dari Baileys
 * @param {object} sock - Instance socket WhatsApp
 * @returns {object} Objek pesan yang sudah ditambahkan handler
 */
export function addMessageHandler(m, sock) {

    m.chat = normalizeJid(m.key, false);
    m.isGroup = m.chat.endsWith('@g.us');
    m.sender = normalizeJid(m.key, m.isGroup);
    // console.log(m)
    m.senderNumber = m.sender?.split('@')[0];
    m.pushName = m.pushName || 'No Name';
    m.type = getMessageType(m.message);
    m.groupMetadata = m.isGroup ? cacheGroupMetadata(sock, m.chat) : null;
    m.ephemeralDuration = m.isGroup ? m.groupMetadata?.ephemeralDuration : 0
    m.isOwner = () => {
        const number = m.sender.split('@')[0]
        return globalThis.ownerNumber.includes(number)
    }

    m.isBotAdmin = m.isGroup ? (
        async () => {
            const metadata = await m.groupMetadata;
            return metadata?.participants?.find(p => p.id === sock.user.id)?.admin !== null;
        }
    )() : false;

    m.isAdmin = m.isGroup ? (
        async () => {
            const metadata = await m.groupMetadata;
            return metadata?.participants?.find(p => {
                return p.id === m.sender
            })?.admin !== null;
        }
    )() : false;

    m.quoted = null;
    if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedMsg = m.message.extendedTextMessage.contextInfo.quotedMessage;
        const ctxInfo = m.message.extendedTextMessage.contextInfo;

        // Cek jika quoted message adalah view once
        const viewOnceMsg = quotedMsg?.viewOnceMessageV2?.message;
        const actualMsg = viewOnceMsg || quotedMsg;

        // Normalize quoted sender (handle @lid format)
        const quotedSender = ctxInfo.addressingMode === "lid"
            ? (ctxInfo.participantAlt || ctxInfo.participant)
            : ctxInfo.participant;

        m.quoted = {
            message: actualMsg,
            key: {
                remoteJid: m.chat,
                // Update untuk v7: tambahkan remoteJidAlt jika ada
                ...(ctxInfo.remoteJidAlt && {
                    remoteJidAlt: ctxInfo.remoteJidAlt
                }),
                fromMe: quotedSender === sock.user.id,
                id: ctxInfo.stanzaId,
                participant: ctxInfo.participant,
                // Update untuk v7: tambahkan participantAlt jika ada
                ...(ctxInfo.participantAlt && {
                    participantAlt: ctxInfo.participantAlt
                }),
                addressingMode: ctxInfo.addressingMode
            },
            type: getMessageType(actualMsg),
            sender: quotedSender,
            senderNumber: quotedSender?.split('@')[0],
            text: getQuotedText(actualMsg),
            download: async () => {
                return await getMedia({
                    message: quotedMsg,
                    key: m.quoted.key
                });
            }
        };
    }

    const baseMessage = m.message?.ephemeralMessage?.message || m.message;
    const ctxs = [
        baseMessage?.extendedTextMessage?.contextInfo,
        baseMessage?.imageMessage?.contextInfo,
        baseMessage?.videoMessage?.contextInfo,
        baseMessage?.audioMessage?.contextInfo,
        baseMessage?.documentMessage?.contextInfo
    ].filter(Boolean);
    m.mentionedJid = ctxs.reduce((acc, ci) => {
        const list = Array.isArray(ci?.mentionedJid) ? ci.mentionedJid : [];
        for (const jid of list) {
            if (!acc.includes(jid)) acc.push(jid);
        }
        return acc;
    }, []);

    /**
     * Download media dari pesan
     * @returns {Promise<Buffer>} Buffer media
     */
    m.download = async () => {
        return await getMedia({
            message: m.message,
            key: m.key
        });
    };

    /**
     * Balas pesan dengan teks atau objek pesan
     * @param {string|object} text - Teks balasan atau objek pesan WhatsApp
     * @param {object} options - Opsi pengiriman
     * @param {boolean} [options.quoted=true] - Apakah akan quote pesan asli
     * @param {boolean} [options.useContext=true] - Apakah menggunakan context info default (thumbnail, dll)
     * @param {string[]} [options.mention=[m.sender]] - Array JID yang akan di-mention (default: pengirim pesan)
     * @returns {Promise<object>} Hasil pengiriman pesan
     * @example
     * // Balas dengan teks sederhana (otomatis mention pengirim)
     * await m.reply('Halo!', {})
     *
     * // Balas tanpa quote
     * await m.reply('Halo!', { quoted: false })
     *
     * // Balas dengan mention tambahan
     * await m.reply('Halo semua!', { mention: [m.sender, '628123456789@s.whatsapp.net'] })
     *
     * // Balas dengan objek pesan (gambar)
     * await m.reply({ image: buffer, caption: 'Ini gambar' }, {})
     */
    m.reply = async (text, {quoted = true, useContext = true, mention = [m.sender]  } = {}) => {
        const defaultContext = {
            forwardingScore: 256,
            externalAdReply: {
                title: `乂 ${globalThis.botName} 乂`,
                body: globalThis.owner,
                mediaUrl: "https://antidonasi.web.id",
                description: 'Kanata-V3',
                previewType: "PHOTO",
                thumbnail: readFileSync(thumbPath),
                sourceUrl: "https://whatsapp.com/channel/0029VagADOLLSmbaxFNswH1m",
            },
            mentionedJid: mention
        }


        if (typeof text === 'string') {
            return await sock.sendMessage(m.chat, {
                text: text,
                mentions: mention,
                contextInfo: useContext ? defaultContext : undefined
            }, {
                quoted: quoted ? m : null,
                // ephemeralExpiratio :
            })
        }

        if (typeof text === 'object') {
            if (text.newsletterName) {
                defaultContext.forwardedNewsletterMessageInfo.newsletterName = text.newsletterName
                delete text.newsletterName
            }

            // Gabungkan contextInfo dari text dengan defaultContext jika useContext true
            const finalContextInfo = useContext ? {
                ...defaultContext,
                ...(text.contextInfo || {})
            } : text.contextInfo

            return await sock.sendMessage(m.chat, {
                ...text,
                mentions: mention,
                contextInfo: finalContextInfo
            }, {
                quoted: quoted ? m : null
            })
        }
    };

    /**
     * Ambil data user dari database
     * @returns {Promise<object>} Data user
     */
    m.getUser = async () => {
        return await Database.getUser(m.sender);
    };

    /**
     * Ambil data grup dari database
     * @returns {Promise<object|null>} Data grup atau null jika bukan grup
     */
    m.getGroup = async () => {
        if (!m.isGroup) return null;
        return await Database.getGroup(m.chat);
    };

    /**
     * Kirim pesan list/menu interaktif
     * @param {string} text - Teks utama pesan
     * @param {Array} sections - Array section untuk list menu
     * @param {object} opts - Opsi tambahan
     * @param {string} [opts.header='Kanata Bot'] - Header pesan
     * @param {string} [opts.footer='© 2024 Kanata'] - Footer pesan
     * @param {string} [opts.buttonText='Pilih Menu'] - Teks tombol
     * @param {boolean} [opts.quoted=true] - Apakah quote pesan asli
     * @returns {Promise<object>} Hasil pengiriman pesan
     */
    m.sendListMessage = async (text, sections = [], opts = {}) => {
        const defaultOpts = {
            header: 'Kanata Bot',
            footer: '© 2024 Kanata',
            buttonText: 'Pilih Menu',
            quoted: true,
            newsletterName: 'Kanata Bot',
            externalAdReply: {
                title: "Kanata Bot",
                body: "Simple WhatsApp Bot",
                thumbnailUrl: globalThis.ppUrl,
                sourceUrl: "https://github.com/base-kanata",
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }

        opts = { ...defaultOpts, ...opts }

        const listMessage = {
            text: text,
            footer: opts.footer,
            title: opts.header,
            buttonText: opts.buttonText,
            sections: sections,
            viewOnce: true,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 9999999,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363305152329358@newsletter',
                    newsletterName: opts.newsletterName,
                    serverMessageId: -1
                },
                externalAdReply: opts.externalAdReply
            }
        }

        return await sock.sendMessage(m.chat, listMessage, {
            quoted: opts.quoted ? m : null
        })
    }

    return m;
}

/**
 * Mendapatkan tipe pesan dari objek message
 * @param {object} message - Objek message dari Baileys
 * @returns {string|object|null} Tipe pesan atau objek info sticker
 */
function getMessageType(message) {
    if (!message) return null;

    const types = {
        conversation: 'text',
        extendedTextMessage: 'text',
        imageMessage: 'image',
        videoMessage: 'video',
        audioMessage: 'audio',
        documentMessage: 'document',
        stickerMessage: 'sticker',
        contactMessage: 'contact',
        locationMessage: 'location',
        contactsArrayMessage: 'contacts',
        liveLocationMessage: 'liveLocation',
        templateButtonReplyMessage: 'template',
        buttonsResponseMessage: 'buttons',
        listResponseMessage: 'list',
        interactiveResponseMessage: 'interactive'
    };

    const messageType = Object.keys(message)[0];

    // Tambahan penanganan untuk stiker
    if (messageType === 'stickerMessage') {
        const stickerInfo = message[messageType];
        return {
            type: 'sticker',
            isAnimated: stickerInfo.isAnimated || false,
            mimetype: stickerInfo.mimetype,
            fileLength: stickerInfo.fileLength,
            height: stickerInfo.height,
            width: stickerInfo.width
        };
    }

    return types[messageType] || messageType;
}

/**
 * Mendapatkan teks dari pesan yang di-quote
 * @param {object} message - Objek message yang di-quote
 * @returns {string|null} Teks dari pesan atau null
 */
function getQuotedText(message) {
    if (!message) return null;

    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;

    return null;
}
