export const handler = {
    command: ['autoreactstatus', 'ars'],
    help: 'Manage auto react to status feature',
    category: 'owner',
    isAdmin: false,
    isBotAdmin: false,
    isOwner: true,
    isGroup: false,
    exec: async ({ sock, m, args }) => {
        try {
            if (!args || args.length === 0) {
                // Show current configuration
                const config = globalThis.autoReactConfig;
                const statusEmoji = config.enabled ? '✅ Enabled' : '❌ Disabled';

                const infoMsg = `⚙️ *Auto React Status Configuration*

📊 *Status:* ${statusEmoji}

😊 *Reaction Emojis:*
${config.reactions.map((emoji, i) => `${i + 1}. ${emoji}`).join('\n')}

🚫 *Excluded Numbers:* ${config.excludeList.length > 0 ? config.excludeList.map(jid => `\n• ${jid.split('@')[0]}`).join('') : 'None'}

📝 *Commands:*
• \`!ars on\` - Enable auto react
• \`!ars off\` - Disable auto react
• \`!ars add <emoji>\` - Add reaction emoji
• \`!ars remove <emoji>\` - Remove reaction emoji
• \`!ars exclude @user\` - Exclude user from auto react
• \`!ars include @user\` - Remove user from exclude list`;

                await m.reply(infoMsg);
                return;
            }

            const subCommand = args.toLowerCase();

            switch (subCommand) {
                case 'on':
                case 'enable':
                    globalThis.autoReactConfig.enabled = true;
                    await m.reply('✅ Auto react status has been *enabled*');
                    break;

                case 'off':
                case 'disable':
                    globalThis.autoReactConfig.enabled = false;
                    await m.reply('❌ Auto react status has been *disabled*');
                    break;

                case 'add':
                    if (!args.split(' ')[1]) {
                        await m.reply('❌ Please provide an emoji to add\nExample: !ars add ❤️');
                        return;
                    }
                    const emojiToAdd = args.split(' ')[1];
                    if (globalThis.autoReactConfig.reactions.includes(emojiToAdd)) {
                        await m.reply('⚠️ This emoji is already in the reaction list');
                        return;
                    }
                    globalThis.autoReactConfig.reactions.push(emojiToAdd);
                    await m.reply(`✅ Added ${emojiToAdd} to reaction list`);
                    break;

                case 'remove':
                case 'delete':
                    if (!args.split(' ')[1]) {
                        await m.reply('❌ Please provide an emoji to remove\nExample: !ars remove ❤️');
                        return;
                    }
                    const emojiToRemove = args.split(' ')[1];
                    const emojiIndex = globalThis.autoReactConfig.reactions.indexOf(emojiToRemove);
                    if (emojiIndex === -1) {
                        await m.reply('⚠️ This emoji is not in the reaction list');
                        return;
                    }
                    globalThis.autoReactConfig.reactions.splice(emojiIndex, 1);
                    await m.reply(`✅ Removed ${emojiToRemove} from reaction list`);
                    break;

                case 'exclude':
                    if (!m.mentionedJid || m.mentionedJid.length === 0) {
                        await m.reply('❌ Please mention a user to exclude\nExample: !ars exclude @user');
                        return;
                    }
                    const userToExclude = m.mentionedJid[0];
                    if (globalThis.autoReactConfig.excludeList.includes(userToExclude)) {
                        await m.reply('⚠️ This user is already excluded');
                        return;
                    }
                    globalThis.autoReactConfig.excludeList.push(userToExclude);
                    await m.reply(`✅ Added @${userToExclude.split('@')[0]} to exclude list`, { mentions: [userToExclude] });
                    break;

                case 'include':
                    if (!m.mentionedJid || m.mentionedJid.length === 0) {
                        await m.reply('❌ Please mention a user to include\nExample: !ars include @user');
                        return;
                    }
                    const userToInclude = m.mentionedJid[0];
                    const userIndex = globalThis.autoReactConfig.excludeList.indexOf(userToInclude);
                    if (userIndex === -1) {
                        await m.reply('⚠️ This user is not in the exclude list');
                        return;
                    }
                    globalThis.autoReactConfig.excludeList.splice(userIndex, 1);
                    await m.reply(`✅ Removed @${userToInclude.split('@')[0]} from exclude list`, { mentions: [userToInclude] });
                    break;

                default:
                    await m.reply('❌ Unknown command. Use `!ars` to see available commands');
                    break;
            }

        } catch (error) {
            console.error('Auto react status config error:', error);
            await m.reply('❌ *Error*\nFailed to update auto react status configuration. Please try again.');
        }
    }
}

export default handler
