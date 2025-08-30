const { Composer } = require('grammy');
const database = require('../storage/database');
const logger = require('../utils/logger');
const config = require('../config/config');

const composer = new Composer();

// Main settings command
composer.command('settings', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.hasAdminRights(['can_restrict_members'])) {
        return await ctx.reply('❌ You need admin permissions to view settings.');
    }
    
    try {
        const chatId = ctx.chat.id;
        const settings = database.getGroupSettings(chatId);
        
        const settingsMessage = `
⚙️ **Group Security Settings**

🛡️ **Anti-Abuse Protection:**
• Status: ${settings.antiAbuse.enabled ? '✅ Enabled' : '❌ Disabled'}
• Level: ${settings.antiAbuse.level}
• Languages: ${settings.antiAbuse.languages.join(', ')}

📏 **Anti-Copyright Protection:**
• Status: ${settings.antiCopyright.enabled ? '✅ Enabled' : '❌ Disabled'}
• Character Limit: ${settings.antiCopyright.characterLimit}
• Edit Prevention: ${settings.antiCopyright.preventEdits ? '✅ Enabled' : '❌ Disabled'}

🚫 **Anti-Promotion Protection:**
• Status: ${settings.antiPromotion.enabled ? '✅ Enabled' : '❌ Disabled'}
• Block Web Links: ${settings.antiPromotion.blockWebLinks ? '✅' : '❌'}
• Block Telegram Links: ${settings.antiPromotion.blockTelegramLinks ? '✅' : '❌'}

👥 **Whitelist:**
• Users: ${settings.whitelist ? settings.whitelist.length : 0}

**Commands:**
• \`/settings toggle <feature>\` - Enable/disable features
• \`/settings level <level>\` - Set moderation level
• \`/settings charlimit <number>\` - Set character limit
• \`/whitelist add/remove <user>\` - Manage whitelist
        `;
        
        await ctx.reply(settingsMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        logger.error('Settings command error:', error);
        await ctx.reply('❌ Failed to retrieve settings.');
    }
});

// Toggle features
composer.command('settoggle', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.hasAdminRights(['can_restrict_members'])) {
        return await ctx.reply('❌ You need admin permissions to change settings.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return await ctx.reply(`❌ Usage: /settoggle <feature>
        
Available features:
• \`antiabuse\` - Anti-abuse protection
• \`anticopyright\` - Anti-copyright protection  
• \`antipromotion\` - Anti-promotion protection`);
    }
    
    const feature = args[0].toLowerCase();
    const chatId = ctx.chat.id;
    
    try {
        let success = false;
        let newStatus = false;
        
        switch (feature) {
            case 'antiabuse':
                newStatus = database.toggleAntiAbuse(chatId);
                success = true;
                break;
            case 'anticopyright':
                newStatus = database.toggleAntiCopyright(chatId);
                success = true;
                break;
            case 'antipromotion':
                newStatus = database.toggleAntiPromotion(chatId);
                success = true;
                break;
            default:
                await ctx.reply('❌ Unknown feature. Use: antiabuse, anticopyright, or antipromotion');
                return;
        }
        
        if (success) {
            await ctx.reply(`✅ ${feature} protection has been ${newStatus ? 'enabled' : 'disabled'}.`);
            logger.info(`${feature} ${newStatus ? 'enabled' : 'disabled'} in chat ${chatId} by admin ${ctx.from.id}`);
        }
    } catch (error) {
        logger.error('Settings toggle error:', error);
        await ctx.reply('❌ Failed to toggle feature.');
    }
});

// Set moderation level
composer.command('setlevel', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.hasAdminRights(['can_restrict_members'])) {
        return await ctx.reply('❌ You need admin permissions to change settings.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return await ctx.reply(`❌ Usage: /setlevel <level>
        
Available levels:
• \`no\` - No moderation
• \`weak\` - Light moderation (warnings only)
• \`moderate\` - Standard moderation (warnings + deletions)
• \`strong\` - Strict moderation (warnings + deletions + mutes)
• \`strict\` - Maximum moderation (all actions including bans)`);
    }
    
    const level = args[0].toLowerCase();
    const chatId = ctx.chat.id;
    
    if (!Object.keys(config.MODERATION_LEVELS).includes(level)) {
        return await ctx.reply('❌ Invalid level. Use: no, weak, moderate, strong, or strict');
    }
    
    try {
        database.setModerationLevel(chatId, level);
        await ctx.reply(`✅ Moderation level set to **${level}**.`);
        logger.info(`Moderation level set to ${level} in chat ${chatId} by admin ${ctx.from.id}`);
    } catch (error) {
        logger.error('Set level error:', error);
        await ctx.reply('❌ Failed to set moderation level.');
    }
});

// Set character limit
composer.command('setcharLimit', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.hasAdminRights(['can_restrict_members'])) {
        return await ctx.reply('❌ You need admin permissions to change settings.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return await ctx.reply('❌ Usage: /setcharlimit <number>\n\nExample: /setcharlimit 150');
    }
    
    const limit = parseInt(args[0]);
    if (isNaN(limit) || limit < 10 || limit > 4000) {
        return await ctx.reply('❌ Character limit must be between 10 and 4000.');
    }
    
    const chatId = ctx.chat.id;
    
    try {
        database.setCharacterLimit(chatId, limit);
        await ctx.reply(`✅ Character limit set to **${limit}** characters.`);
        logger.info(`Character limit set to ${limit} in chat ${chatId} by admin ${ctx.from.id}`);
    } catch (error) {
        logger.error('Set character limit error:', error);
        await ctx.reply('❌ Failed to set character limit.');
    }
});

// Quick setup command for new groups
composer.command('quicksetup', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.hasAdminRights(['can_restrict_members'])) {
        return await ctx.reply('❌ You need admin permissions to setup the bot.');
    }
    
    const chatId = ctx.chat.id;
    
    try {
        // Initialize with recommended settings
        database.setModerationLevel(chatId, 'moderate');
        database.setCharacterLimit(chatId, 120);
        database.toggleAntiAbuse(chatId, true);
        database.toggleAntiCopyright(chatId, true);
        database.toggleAntiPromotion(chatId, true);
        
        const setupMessage = `
✅ **Quick Setup Complete!**

🛡️ **Enabled Features:**
• Anti-Abuse: Moderate level
• Anti-Copyright: 120 character limit
• Anti-Promotion: Block all links

⚙️ **Next Steps:**
• Use \`/settings\` to view all options
• Use \`/whitelist add\` to exempt trusted users
• Use \`/help\` to see all commands

🔧 **Customization:**
• \`/setlevel <level>\` - Change moderation strictness
• \`/setcharlimit <number>\` - Adjust character limit
• \`/settoggle <feature>\` - Enable/disable features
        `;
        
        await ctx.reply(setupMessage, { parse_mode: 'Markdown' });
        logger.info(`Quick setup completed in chat ${chatId} by admin ${ctx.from.id}`);
    } catch (error) {
        logger.error('Quick setup error:', error);
        await ctx.reply('❌ Failed to complete quick setup.');
    }
});

// Reset settings command
composer.command('resetsettings', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.hasAdminRights(['can_restrict_members'])) {
        return await ctx.reply('❌ You need admin permissions to reset settings.');
    }
    
    const chatId = ctx.chat.id;
    
    try {
        database.resetGroupSettings(chatId);
        await ctx.reply(`✅ **Settings Reset Complete**

All security settings have been reset to defaults:
• Anti-Abuse: Enabled (moderate level)
• Anti-Copyright: Enabled (120 character limit)
• Anti-Promotion: Disabled
• Whitelist: Cleared

Use \`/settings\` to view current configuration.`);
        
        logger.info(`Settings reset in chat ${chatId} by admin ${ctx.from.id}`);
    } catch (error) {
        logger.error('Reset settings error:', error);
        await ctx.reply('❌ Failed to reset settings.');
    }
});

module.exports = composer;
