import Database from './database.js'
import { generateWAMessageFromContent, proto } from 'baileys'
import { resolve } from 'path'
import { getMedia } from './mediaMsg.js';
import { readFileSync } from 'fs';
import { cacheGroupMetadata, groupCache } from './caching.js';


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

export function addMessageHandler(m, sock) {
    // Normalize chat and sender JID (handle @lid format)
    // Reference: https://github.com/WhiskeySockets/Baileys/issues/2013
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

    m.download = async () => {
        return await getMedia({
            message: m.message,
            key: m.key
        });
    };

    m.reply = async (text, quoted = true, useContext = true, newsletterName = `${globalThis.botName}`) => {
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
            }
        }


        if (typeof text === 'string') {
            return await sock.sendMessage(m.chat, {
                text: text,
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

            // Jika text.contextInfo ada dan useContext true, gabungkan dengan defaultContext
            const contextInfo = useContext ? {
                ...defaultContext,
                ...(text.contextInfo || {})
            } : text.contextInfo

            return await sock.sendMessage(m.chat, {
                ...text,
                contextInfo: contextInfo
            }, {
                quoted: quoted ? m : null
            })
        }
    };

    m.getUser = async () => {
        return await Database.getUser(m.sender);
    };

    m.getGroup = async () => {
        if (!m.isGroup) return null;
        return await Database.getGroup(m.chat);
    };

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

function getQuotedText(message) {
    if (!message) return null;

    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;

    return null;
}
