import fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class AudioEffectsHandler {
    static async applyFilter(sock, m, filterName, filterChain) {
        try {
            if (!m.quoted || !m.quoted.message?.audioMessage) {
                await m.reply('Reply audio/voice note yang ingin diberi efek!');
                return true;
            }

            await m.reply(`⏳ Menerapkan efek: ${filterName} ...`);
            const audio = await m.quoted.download();
            await fs.ensureDir('./temp')
            const suffix = Date.now()
            const inputPath = `./temp/${m.chat}_${suffix}.in.mp3`;
            const outputPath = `./temp/${m.chat}_${suffix}.${filterName}.mp3`;

            await fs.promises.writeFile(inputPath, audio);
            await execAsync(`ffmpeg -y -i "${inputPath}" -af "${filterChain}" "${outputPath}"`);

            await sock.sendMessage(m.chat, {
                audio: { url: outputPath },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: m });

            try { fs.unlinkSync(inputPath); } catch {}
            try { fs.unlinkSync(outputPath); } catch {}
            return true;
        } catch (error) {
            await m.reply(`❌ Error menerapkan efek ${filterName}: ${error.message}`);
            return true;
        }
    }
    static async handleBass(sock, m, args) {
        try {
            if (!m.quoted || !m.quoted.message?.audioMessage) {
                await m.reply('❌ Reply audio yang ingin diberi efek bass!');
                return;
            }

            await m.reply('⏳ Sedang memproses audio...');
            const audio = await m.quoted.download();
            await fs.ensureDir('./temp')
            const suffix = Date.now()
            const inputPath = `./temp/${m.chat}_${suffix}.in.mp3`;
            const outputPath = `./temp/${m.chat}_${suffix}.bass.mp3`;

            await fs.promises.writeFile(inputPath, audio);
            await execAsync(`ffmpeg -i ${inputPath} -af "bass=g=15:f=110:w=0.6" ${outputPath}`);

            await sock.sendMessage(m.chat, {
                audio: { url: outputPath },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: m });

            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
        } catch (error) {
            await m.reply(`❌ Error: ${error.message}`);
        }
    }

    static async handleNightcore(sock, m, args) {
        try {
            if (!m.quoted || !m.quoted.message?.audioMessage) {
                await m.reply('❌ Reply audio yang ingin diberi efek nightcore!');
                return;
            }

            await m.reply('⏳ Sedang memproses audio...');
            const audio = await m.quoted.download();
            await fs.ensureDir('./temp')
            const suffix = Date.now()
            const inputPath = `./temp/${m.chat}_${suffix}.in.mp3`;
            const outputPath = `./temp/${m.chat}_${suffix}.nightcore.mp3`;

            await fs.promises.writeFile(inputPath, audio);
            await execAsync(`ffmpeg -i ${inputPath} -af "asetrate=44100*1.25,aresample=44100,atempo=1.05" ${outputPath}`);

            await sock.sendMessage(m.chat, {
                audio: { url: outputPath },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: m });

            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
        } catch (error) {
            await m.reply(`❌ Error: ${error.message}`);
        }
    }

    static async handleSlow(sock, m, args) {
        try {
            if (!m.quoted || !m.quoted.message?.audioMessage) {
                await m.reply('❌ Reply audio yang ingin diberi efek slow!');
                return;
            }

            await m.reply('⏳ Sedang memproses audio...');
            const audio = await m.quoted.download();
            await fs.ensureDir('./temp')
            const suffix = Date.now()
            const inputPath = `./temp/${m.chat}_${suffix}.in.mp3`;
            const outputPath = `./temp/${m.chat}_${suffix}.slow.mp3`;

            await fs.promises.writeFile(inputPath, audio);
            await execAsync(`ffmpeg -i ${inputPath} -af "atempo=0.8" ${outputPath}`);

            await sock.sendMessage(m.chat, {
                audio: { url: outputPath },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: m });

            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
        } catch (error) {
            await m.reply(`❌ Error: ${error.message}`);
        }
    }

    static async handleRobot(sock, m, args) {
        try {
            if (!m.quoted || !m.quoted.message?.audioMessage) {
                await m.reply('❌ Reply audio yang ingin diberi efek robot!');
                return;
            }

            await m.reply('⏳ Sedang memproses audio...');
            const audio = await m.quoted.download();
            await fs.ensureDir('./temp')
            const suffix = Date.now()
            const inputPath = `./temp/${m.chat}_${suffix}.in.mp3`;
            const outputPath = `./temp/${m.chat}_${suffix}.robot.mp3`;

            await fs.promises.writeFile(inputPath, audio);
            await execAsync(`ffmpeg -i ${inputPath} -af "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75" ${outputPath}`);

            await sock.sendMessage(m.chat, {
                audio: { url: outputPath },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: m });

            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
        } catch (error) {
            await m.reply(`❌ Error: ${error.message}`);
        }
    }

    static async handleReverse(sock, m, args) {
        try {
            if (!m.quoted || !m.quoted.message?.audioMessage) {
                await m.reply('❌ Reply audio yang ingin direverse!');
                return;
            }

            await m.reply('⏳ Sedang memproses audio...');
            const audio = await m.quoted.download();
            await fs.ensureDir('./temp')
            const suffix = Date.now()
            const inputPath = `./temp/${m.chat}_${suffix}.in.mp3`;
            const outputPath = `./temp/${m.chat}_${suffix}.reverse.mp3`;

            await fs.promises.writeFile(inputPath, audio);
            await execAsync(`ffmpeg -i ${inputPath} -af "areverse" ${outputPath}`);

            await sock.sendMessage(m.chat, {
                audio: { url: outputPath },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: m });

            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
        } catch (error) {
            await m.reply(`❌ Error: ${error.message}`);
        }
    }

    static async handleToVn(sock, m, args) {
        try {
            if (!m.quoted || !m.quoted.message?.audioMessage) {
                await m.reply('❌ Reply audio yang ingin dikonversi ke voice note!');
                return;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            const audio = await m.quoted.download();
            await fs.ensureDir('./temp')
            const suffix = Date.now()
            const inputPath = `./temp/${m.chat}_${suffix}.in.mp3`;
            const outputPath = `./temp/${m.chat}_${suffix}.vn.ogg`;

            await fs.promises.writeFile(inputPath, audio);
            await execAsync(`ffmpeg -y -i "${inputPath}" -vn -af "silenceremove=1:0:-50dB" -c:a libopus -b:a 96k -ar 48000 -ac 1 "${outputPath}"`);

            await sock.sendMessage(m.chat, {
                audio: { url: outputPath },
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            }, { quoted: m });

            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });
        } catch (error) {
            console.error('Error in tovn:', error);
            await m.reply(`❌ Error: ${error.message}`);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
        }
    }

    static async handleToMp3(sock, m, args) {
        try {
            if (!m.quoted || !m.quoted.message?.audioMessage) {
                await m.reply('❌ Reply voice note yang ingin dikonversi ke MP3!');
                return;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            const audio = await m.quoted.download();
            await fs.ensureDir('./temp')
            const suffix = Date.now()
            const inputPath = `./temp/${m.chat}_${suffix}.in.ogg`;
            const outputPath = `./temp/${m.chat}_${suffix}.audio.mp3`;

            await fs.promises.writeFile(inputPath, audio);
            await execAsync(`ffmpeg -i ${inputPath} -acodec libmp3lame -ab 320k ${outputPath}`);

            await sock.sendMessage(m.chat, {
                audio: { url: outputPath },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: m });

            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });
        } catch (error) {
            console.error('Error in tomp3:', error);
            await m.reply(`❌ Error: ${error.message}`);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
        }
    }
}
