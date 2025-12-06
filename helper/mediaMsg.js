import { downloadContentFromMessage } from "baileys"

export const getMedia = async (msg) => {
    try {
        console.log('[DEBUG] getMedia called with msg:', JSON.stringify(msg, null, 2));

        // Penanganan media normal
        // Unwrap ViewOnce messages
        const viewOnce = msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message;
        if (viewOnce) {
            console.log('[DEBUG] Unwrapping ViewOnce message');
            msg.message = viewOnce;
        }

        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'];
        let mediaMessage = null;
        let mediaType = null;

        for (const type of mediaTypes) {
            if (msg.message?.[type]) {
                mediaMessage = msg.message[type];
                mediaType = type;
                console.log(`[DEBUG] Found media type: ${type}`);
                break;
            }
            // Cek dalam quoted message
            if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.[type]) {
                mediaMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage[type];
                mediaType = type;
                console.log(`[DEBUG] Found quoted media type: ${type}`);
                break;
            }
        }

        console.log('[DEBUG] mediaMessage:', mediaMessage ? 'found' : 'not found');
        console.log('[DEBUG] mediaType:', mediaType);

        if (!mediaMessage || !mediaType) {
            console.log('[DEBUG] Returning null - no media found');
            return null;
        }

        console.log('[DEBUG] mediaMessage object keys:', Object.keys(mediaMessage));
        console.log('[DEBUG] mediaMessage:', JSON.stringify(mediaMessage, null, 2));
        console.log('[DEBUG] Calling downloadContentFromMessage with type:', mediaType.replace('Message', ''));

        const stream = await downloadContentFromMessage(mediaMessage, mediaType.replace('Message', ''));
        if (!stream) return null;

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        return buffer;
    } catch (error) {
        console.error('Error in getMedia:', error);
        return null;
    }
}