import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';

const execAsync = promisify(exec);

export const handler = {
    command: ['tovn', 'tomp3'],
    help: 'Konversi format audio\n\nPerintah:\n!tovn - Konversi audio ke voice note\n!tomp3 - Konversi voice note ke MP3',
    category:'tools',
    
    async exec({ m, sock }) {
        try {
            const cmd = m.command;
            await fs.ensureDir('./temp')
            
            // Validasi media yang di-reply
            const hasAudio = !!m.quoted?.message?.audioMessage
            const hasVideo = !!m.quoted?.message?.videoMessage

            if (cmd === 'tomp3') {
                if (!m.quoted || (!hasAudio && !hasVideo)) {
                    await m.reply('❌ Reply video atau audio yang ingin dikonversi ke MP3!')
                    return
                }
            } else {
                // tovn: dukung audio/voice note atau video untuk diubah ke VN
                if (!m.quoted || (!hasAudio && !hasVideo)) {
                    await m.reply('❌ Reply video atau audio/voice note yang ingin dikonversi ke VN!')
                    return
                }
            }

            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            const audio = await m.quoted.download();
            const mime = (m.quoted?.message?.audioMessage?.mimetype || m.quoted?.message?.videoMessage?.mimetype || '')
            let inExt = 'bin'
            if (/ogg|opus/i.test(mime)) inExt = 'ogg'
            else if (/mpeg|mp3/i.test(mime)) inExt = 'mp3'
            else if (/wav/i.test(mime)) inExt = 'wav'
            else if (/mp4|quicktime/i.test(mime)) inExt = 'mp4'
            else if (/3gpp/i.test(mime)) inExt = '3gp'

            const suffix = Date.now()
            const inputPath = `./temp/${m.chat}_${suffix}.in.${inExt}`;
            const outputPath = `./temp/${m.chat}_${suffix}.out.${cmd === 'tovn' ? 'ogg' : 'mp3'}`;

            await fs.promises.writeFile(inputPath, audio);

            // Proses konversi sesuai command
            if (cmd === 'tovn') {
                // Konversi ke format opus dengan bitrate yang sesuai untuk VN
                await execAsync(`ffmpeg -y -i "${inputPath}" -vn -af "silenceremove=1:0:-50dB" -c:a libopus -b:a 96k -ar 48000 -ac 1 "${outputPath}"`);
                
                await sock.sendMessage(m.chat, {
                    audio: { url: outputPath },
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true // Set true untuk mengirim sebagai voice note
                }, { quoted: m });
            } else {
                // Konversi ke format MP3 dengan kualitas yang lebih baik
                await execAsync(`ffmpeg -y -i "${inputPath}" -vn -acodec libmp3lame -b:a 192k "${outputPath}"`);
                
                await sock.sendMessage(m.chat, {
                    audio: { url: outputPath },
                    mimetype: 'audio/mpeg',
                    ptt: false // Set false untuk mengirim sebagai MP3
                }, { quoted: m });
            }

            // Hapus file temporary
            try { fs.unlinkSync(inputPath); } catch {}
            try { fs.unlinkSync(outputPath); } catch {}

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });

        } catch (error) {
            console.error(`Error in ${m.command}:`, error);
            await m.reply(`❌ Error: ${error.message}`);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
        }
    }
}; 
