import Database from '../helper/database.js';
import { cacheGroupMetadata } from '../helper/caching.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { pluginLoader } from './pluginLoader.js';
import { AudioEffectsHandler } from './audioEffects.js';
import { logger } from '../helper/logger.js';

const execAsync = promisify(exec);

export class CommandHandler {
    static async handleBuiltinCommands(sock, m, cmd, args) {
        switch (cmd) {
            case 'ae': {
                const sub = (args[0] || '').toLowerCase();
                const help = '📋 Penggunaan: .ae <efek> (reply audio)\n\nEfek tersedia:\n- bass (bassboost)\n- 8d\n- vaporwave\n- nightcore\n- phaser\n- tremolo\n- vibrato\n- surround\n- pulsator\n- subboost\n- reverse\n- remove (hapus efek: normalize)';
                if (!sub) {
                    await m.reply(help);
                    return true;
                }

                const filters = {
                    bass: 'bass=g=20,dynaudnorm=f=200',
                    '8d': 'apulsator=hz=0.08',
                    vaporwave: 'aresample=48000,asetrate=48000*0.8',
                    nightcore: 'aresample=48000,asetrate=48000*1.25',
                    phaser: 'aphaser=in_gain=0.4',
                    tremolo: 'tremolo',
                    vibrato: 'vibrato=f=6.5',
                    surround: 'surround',
                    pulsator: 'apulsator=hz=1',
                    subboost: 'asubboost',
                    reverse: 'areverse',
                    remove: 'dynaudnorm=f=200'
                };

                const chain = filters[sub];
                if (!chain) {
                    await m.reply(help);
                    return true;
                }

                return await AudioEffectsHandler.applyFilter(sock, m, sub, chain);
            }

            case 'tovn':
                return await AudioEffectsHandler.handleToVn(sock, m, args);
            
            case 'tomp3':
                return await AudioEffectsHandler.handleToMp3(sock, m, args);
            
            case 'getpp':
                return await this.handleGetPp(sock, m, args);
            
            case 'getppgc':
                return await this.handleGetPpGc(sock, m, args);
            
            case 'catalog':
            case 'katalog':
                return await this.handleCatalog(sock, m);
            
            case 'order':
                return await this.handleOrder(sock, m);
            
            case 'order-status':
                return await this.handleOrderStatus(sock, m);
            
            case 'my-orders':
                return await this.handleMyOrders(sock, m);
            
            case 'payment-done':
                return await this.handlePaymentDone(sock, m);
            
            case 'payment-cancel':
                return await this.handlePaymentCancel(sock, m);
            
            case 'premium-catalog':
                return await this.handlePremiumCatalog(sock, m);
            
            case 'premium-order':
                return await this.handlePremiumOrder(sock, m);
            
            case 'premium-status':
                return await this.handlePremiumStatus(sock, m);
            
            case 'my-premium-orders':
                return await this.handleMyPremiumOrders(sock, m);
            
            case 'premium-payment-done':
                return await this.handlePremiumPaymentDone(sock, m);
            
            case 'premium-payment-cancel':
                return await this.handlePremiumPaymentCancel(sock, m);
            
            default:
                return false;
        }
    }

    static async handleMenu(sock, m) {
        try {
            const botName = globalThis.botName;
            const owner = globalThis.owner;
            const prefix = ".";
            const settings = await Database.getSettings();

            const modeEmoji = {
                'public': '📢',
                'self-private': '👤',
                'self-me': '👑'
            };
            const modeDesc = {
                'public': 'Semua bisa menggunakan',
                'self-private': 'Private chat & owner di grup',
                'self-me': 'Hanya owner'
            };

            const categories = await pluginLoader.getPluginCategories();

            let menuText = `╭─「 ${botName} 」
│
│ 👋 Hai @${m.sender.split("@")[0]}!
│ 
│ 📱 *INFO BOT*
│ ▸ Nama: ${botName}
│ ▸ Owner: ${owner}
│ ▸ Prefix: ${prefix}
│ ▸ Mode: ${modeEmoji[settings.botMode]} ${settings.botMode} 
│ ▸ Status: ${modeDesc[settings.botMode]}
│ ▸ Runtime: ${await this.runtime()}
│\n`;

            for (const [category, plugins] of Object.entries(categories)) {
                if (plugins.length === 0) continue;

                menuText += `│ ${category.toUpperCase()}\n`;
                for (const plugin of plugins) {
                    const cmdList = plugin.commands.map(cmd => `${prefix}${cmd}`).join(', ');
                    menuText += `│ ▸ ${cmdList}\n`;
                }
                menuText += '│\n';
            }

            menuText += `╰────────────⭐\n\n` +
                `*Note:* \n` +
                `• Mode saat ini: ${modeEmoji[settings.botMode]} ${settings.botMode}\n` +
                `• ${modeDesc[settings.botMode]}\n` +
                `• Gunakan bot dengan bijak!`;

            await m.reply({
                text: menuText,
                mentions: [m.sender],
                contextInfo: {
                    externalAdReply: {
                        title: "乂 Menu List 乂",
                        body: botName,
                        thumbnailUrl: `${globalThis.ppUrl}`,
                        sourceUrl: "https://whatsapp.com/channel/0029VagADOLLSmbaxFNswH1m",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });
            return true;
        } catch (error) {
            console.error('Error in menu:', error);
            await m.reply('❌ Terjadi kesalahan saat menampilkan menu');
            return true;
        }
    }

    static async handleExec(sock, m, args) {
        try {
            if (!await m.isOwner) {
                await m.reply('❌ Perintah ini hanya untuk owner bot!');
                return true;
            }

            const execCommand = args.join(' ');
            if (!execCommand) {
                await m.reply('❌ Masukkan perintah yang akan dieksekusi!');
                return true;
            }

            const { stdout, stderr } = await execAsync(execCommand);
            let result = '';

            if (stdout) result += `📤 *STDOUT*\n\n${stdout}\n`;
            if (stderr) result += `⚠️ *STDERR*\n\n${stderr}\n`;

            if (!result) result = '✅ Executed with no output';

            await m.reply(result);
            return true;
        } catch (error) {
            await m.reply(`❌ *ERROR*\n\n${error.message}`);
            return true;
        }
    }

    static async handleGetPp(sock, m, args) {
        try {
            let who;
            if (m.quoted) {
                who = m.quoted.sender;
            } else if (args[0]) {
                who = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            } else {
                who = m.sender;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            try {
                let pp = await sock.profilePictureUrl(who, 'image');
                await sock.sendMessage(m.chat, {
                    image: { url: pp },
                    caption: `*Profile Picture*\n ${m.quoted?.pushName || m.pushName || who.split('@')[0]}`,
                    mentions: [who],
                    contextInfo: {
                        externalAdReply: {
                            title: '乂 Profile Picture 乂',
                            body: `@${who.split('@')[0]}`,
                            thumbnailUrl: pp,
                            sourceUrl: pp,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m });
            } catch {
                await m.reply(`❌ User tidak memiliki foto profil atau foto profil private`);
            }

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });
            return true;
        } catch (error) {
            console.error('Error in getpp:', error);
            await m.reply(`❌ Error: ${error.message}`);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            return true;
        }
    }

    static async handleGetPpGc(sock, m, args) {
        try {
            if (!m.isGroup) {
                await m.reply('❌ Perintah ini hanya bisa digunakan di dalam grup!');
                return true;
            }

            await sock.sendMessage(m.chat, {
                react: { text: '⏳', key: m.key }
            });

            try {
                let pp = await sock.profilePictureUrl(m.chat, 'image');
                await sock.sendMessage(m.chat, {
                    image: { url: pp },
                    caption: `*Group Profile Picture*\n${(await cacheGroupMetadata(sock, m.chat)).subject}`,
                    contextInfo: {
                        externalAdReply: {
                            title: '乂 Group Profile Picture 乂',
                            body: (await cacheGroupMetadata(sock, m.chat)).subject,
                            thumbnailUrl: pp,
                            sourceUrl: pp,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m });
            } catch {
                await m.reply(`❌ Grup tidak memiliki foto profil atau foto profil private`);
            }

            await sock.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });
            return true;
        } catch (error) {
            console.error('Error in getppgc:', error);
            await m.reply(`❌ Error: ${error.message}`);
            await sock.sendMessage(m.chat, {
                react: { text: '❌', key: m.key }
            });
            return true;
        }
    }

    // Store commands
    static async handleCatalog(sock, m) {
        try {
            const { catalogCmd } = await import('../plugins/misc/store.js');
            await catalogCmd(sock, m);
            return true;
        } catch (error) {
            logger.error('Error in catalog command:', error);
            await m.reply('❌ Terjadi kesalahan saat menampilkan katalog.');
            return true;
        }
    }

    static async handleOrder(sock, m) {
        try {
            const { orderCmd } = await import('../plugins/misc/store.js');
            await orderCmd(sock, m);
            return true;
        } catch (error) {
            logger.error('Error in order command:', error);
            await m.reply('❌ Terjadi kesalahan saat memproses pesanan.');
            return true;
        }
    }

    static async handleOrderStatus(sock, m) {
        try {
            const { orderStatusCmd } = await import('../plugins/misc/store.js');
            await orderStatusCmd(sock, m);
            return true;
        } catch (error) {
            logger.error('Error in order status command:', error);
            await m.reply('❌ Terjadi kesalahan saat mengecek status pesanan.');
            return true;
        }
    }

    static async handleMyOrders(sock, m) {
        try {
            const { myOrdersCmd } = await import('../plugins/misc/store.js');
            await myOrdersCmd(sock, m);
            return true;
        } catch (error) {
            logger.error('Error in my orders command:', error);
            await m.reply('❌ Terjadi kesalahan saat mengambil daftar pesanan.');
            return true;
        }
    }

    static async handlePaymentDone(sock, m) {
        try {
            const { paymentDoneCmd } = await import('../plugins/misc/store.js');
            await paymentDoneCmd(sock, m);
            return true;
        } catch (error) {
            logger.error('Error in payment done command:', error);
            await m.reply('❌ Terjadi kesalahan saat memproses konfirmasi pembayaran.');
            return true;
        }
    }

    static async handlePaymentCancel(sock, m) {
        try {
            const { paymentCancelCmd } = await import('../plugins/misc/store.js');
            await paymentCancelCmd(sock, m);
            return true;
        } catch (error) {
            logger.error('Error in payment cancel command:', error);
            await m.reply('❌ Terjadi kesalahan saat membatalkan pembayaran.');
            return true;
        }
    }

    // Premium commands
    static async handlePremiumCatalog(sock, m) {
        try {
            const { premiumCatalogCmd } = await import('../plugins/misc/premium.js');
            await premiumCatalogCmd(sock, m);
            return true;
        } catch (error) {
            logger.error('Error in premium catalog command:', error);
            await m.reply('❌ Terjadi kesalahan saat menampilkan katalog premium.');
            return true;
        }
    }

    static async handlePremiumOrder(sock, m) {
        try {
            const { premiumOrderCmd } = await import('../plugins/misc/premium.js');
            await premiumOrderCmd(sock, m);
            return true;
        } catch (error) {
            logger.error('Error in premium order command:', error);
            await m.reply('❌ Terjadi kesalahan saat memproses pesanan premium.');
            return true;
        }
    }

    static async handlePremiumStatus(sock, m) {
        try {
            const { premiumStatusCmd } = await import('../plugins/misc/premium.js');
            await premiumStatusCmd(sock, m);
            return true;
        } catch (error) {
            logger.error('Error in premium status command:', error);
            await m.reply('❌ Terjadi kesalahan saat mengecek status pesanan premium.');
            return true;
        }
    }

    static async handleMyPremiumOrders(sock, m) {
        try {
            const { myPremiumOrdersCmd } = await import('../plugins/misc/premium.js');
            await myPremiumOrdersCmd(sock, m);
            return true;
        } catch (error) {
            logger.error('Error in my premium orders command:', error);
            await m.reply('❌ Terjadi kesalahan saat mengambil daftar pesanan premium.');
            return true;
        }
    }

    static async handlePremiumPaymentDone(sock, m) {
        try {
            const { premiumPaymentDoneCmd } = await import('../plugins/misc/premium.js');
            await premiumPaymentDoneCmd(sock, m);
            return true;
        } catch (error) {
            logger.error('Error in premium payment done command:', error);
            await m.reply('❌ Terjadi kesalahan saat memproses konfirmasi pembayaran premium.');
            return true;
        }
    }

    static async handlePremiumPaymentCancel(sock, m) {
        try {
            const { premiumPaymentCancelCmd } = await import('../plugins/misc/premium.js');
            await premiumPaymentCancelCmd(sock, m);
            return true;
        } catch (error) {
            logger.error('Error in premium payment cancel command:', error);
            await m.reply('❌ Terjadi kesalahan saat membatalkan pembayaran premium.');
            return true;
        }
    }

    static async runtime() {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        return `${hours}h ${minutes}m ${seconds}s`;
    }
}
