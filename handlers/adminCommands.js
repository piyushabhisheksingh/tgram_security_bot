const { Composer } = require('grammy');
const database = require('../storage/database');
const logger = require('../utils/logger');

const composer = new Composer();

// Ban command
composer.command('ban', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.hasAdminRights(['can_restrict_members'])) {
        return await ctx.reply('❌ You need ban/unban permissions to use this command.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    const targetUser = await getTargetUser(ctx, args);
    
    if (!targetUser) {
        return await ctx.reply('❌ Please specify a user to ban. Reply to their message or provide username/ID.');
    }
    
    try {
        await ctx.banChatMember(targetUser.id);
        await ctx.reply(`🚫 User ${targetUser.first_name || targetUser.username} has been banned.`);
        
        logger.info(`User ${targetUser.id} banned from chat ${ctx.chat.id} by admin ${ctx.from.id}`);
        database.incrementActionsTaken();
    } catch (error) {
        logger.error('Ban command error:', error);
        await ctx.reply('❌ Failed to ban user. Make sure I have the necessary permissions.');
    }
});

// Unban command
composer.command('unban', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.hasAdminRights(['can_restrict_members'])) {
        return await ctx.reply('❌ You need ban/unban permissions to use this command.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return await ctx.reply('❌ Please provide a user ID to unban.');
    }
    
    const userId = parseInt(args[0]);
    if (isNaN(userId)) {
        return await ctx.reply('❌ Please provide a valid user ID.');
    }
    
    try {
        await ctx.unbanChatMember(userId);
        await ctx.reply(`✅ User with ID ${userId} has been unbanned.`);
        
        logger.info(`User ${userId} unbanned from chat ${ctx.chat.id} by admin ${ctx.from.id}`);
        database.incrementActionsTaken();
    } catch (error) {
        logger.error('Unban command error:', error);
        await ctx.reply('❌ Failed to unban user.');
    }
});

// Mute command
composer.command('mute', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.hasAdminRights(['can_restrict_members'])) {
        return await ctx.reply('❌ You need mute/unmute permissions to use this command.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    const targetUser = await getTargetUser(ctx, args);
    
    if (!targetUser) {
        return await ctx.reply('❌ Please specify a user to mute. Reply to their message or provide username/ID.');
    }
    
    // Parse duration (default: 1 hour)
    let duration = 3600; // 1 hour in seconds
    if (args.length > 1) {
        const durationArg = args[1];
        const durationMatch = durationArg.match(/^(\d+)([mhd]?)$/);
        if (durationMatch) {
            const value = parseInt(durationMatch[1]);
            const unit = durationMatch[2] || 'h';
            
            switch (unit) {
                case 'm': duration = value * 60; break;
                case 'h': duration = value * 3600; break;
                case 'd': duration = value * 86400; break;
            }
        }
    }
    
    try {
        const until = Math.floor(Date.now() / 1000) + duration;
        await ctx.restrictChatMember(targetUser.id, {
            can_send_messages: false,
            can_send_audios: false,
            can_send_documents: false,
            can_send_photos: false,
            can_send_videos: false,
            can_send_video_notes: false,
            can_send_voice_notes: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false,
            until_date: until
        });
        
        const durationText = formatDuration(duration);
        await ctx.reply(`🔇 User ${targetUser.first_name || targetUser.username} has been muted for ${durationText}.`);
        
        logger.info(`User ${targetUser.id} muted in chat ${ctx.chat.id} for ${duration}s by admin ${ctx.from.id}`);
        database.incrementActionsTaken();
    } catch (error) {
        logger.error('Mute command error:', error);
        await ctx.reply('❌ Failed to mute user.');
    }
});

// Unmute command
composer.command('unmute', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.hasAdminRights(['can_restrict_members'])) {
        return await ctx.reply('❌ You need mute/unmute permissions to use this command.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    const targetUser = await getTargetUser(ctx, args);
    
    if (!targetUser) {
        return await ctx.reply('❌ Please specify a user to unmute. Reply to their message or provide username/ID.');
    }
    
    try {
        await ctx.restrictChatMember(targetUser.id, {
            can_send_messages: true,
            can_send_audios: true,
            can_send_documents: true,
            can_send_photos: true,
            can_send_videos: true,
            can_send_video_notes: true,
            can_send_voice_notes: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true
        });
        
        await ctx.reply(`🔊 User ${targetUser.first_name || targetUser.username} has been unmuted.`);
        
        logger.info(`User ${targetUser.id} unmuted in chat ${ctx.chat.id} by admin ${ctx.from.id}`);
        database.incrementActionsTaken();
    } catch (error) {
        logger.error('Unmute command error:', error);
        await ctx.reply('❌ Failed to unmute user.');
    }
});

// Kick command
composer.command('kick', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.hasAdminRights(['can_restrict_members'])) {
        return await ctx.reply('❌ You need kick permissions to use this command.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    const targetUser = await getTargetUser(ctx, args);
    
    if (!targetUser) {
        return await ctx.reply('❌ Please specify a user to kick. Reply to their message or provide username/ID.');
    }
    
    try {
        await ctx.banChatMember(targetUser.id);
        await ctx.unbanChatMember(targetUser.id); // Unban immediately to allow rejoining
        
        await ctx.reply(`👢 User ${targetUser.first_name || targetUser.username} has been kicked.`);
        
        logger.info(`User ${targetUser.id} kicked from chat ${ctx.chat.id} by admin ${ctx.from.id}`);
        database.incrementActionsTaken();
    } catch (error) {
        logger.error('Kick command error:', error);
        await ctx.reply('❌ Failed to kick user.');
    }
});

// Whitelist commands
composer.command('whitelist', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.hasAdminRights(['can_restrict_members'])) {
        return await ctx.reply('❌ You need admin permissions to manage whitelist.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length === 0) {
        // Show whitelist
        const groupSettings = database.getGroupSettings(ctx.chat.id);
        const whitelist = groupSettings.whitelist || [];
        
        if (whitelist.length === 0) {
            return await ctx.reply('📋 Whitelist is empty.');
        }
        
        const userList = [];
        for (const userId of whitelist) {
            try {
                const member = await ctx.api.getChatMember(ctx.chat.id, userId);
                const name = member.user.first_name || member.user.username || `ID: ${userId}`;
                userList.push(`• ${name}`);
            } catch (error) {
                userList.push(`• Unknown user (ID: ${userId})`);
            }
        }
        
        await ctx.reply(`📋 **Whitelisted Users:**\n${userList.join('\n')}`, { parse_mode: 'Markdown' });
        return;
    }
    
    const action = args[0].toLowerCase();
    
    if (action === 'add') {
        const targetUser = await getTargetUser(ctx, args.slice(1));
        if (!targetUser) {
            return await ctx.reply('❌ Please specify a user to add to whitelist.');
        }
        
        database.addToWhitelist(ctx.chat.id, targetUser.id);
        await ctx.reply(`✅ User ${targetUser.first_name || targetUser.username} added to whitelist.`);
        
    } else if (action === 'remove') {
        const targetUser = await getTargetUser(ctx, args.slice(1));
        if (!targetUser) {
            return await ctx.reply('❌ Please specify a user to remove from whitelist.');
        }
        
        database.removeFromWhitelist(ctx.chat.id, targetUser.id);
        await ctx.reply(`✅ User ${targetUser.first_name || targetUser.username} removed from whitelist.`);
        
    } else {
        await ctx.reply('❌ Usage: /whitelist [add|remove] [user] or /whitelist to view list');
    }
});

async function getTargetUser(ctx, args) {
    // Check if replying to a message
    if (ctx.message.reply_to_message) {
        return ctx.message.reply_to_message.from;
    }
    
    // Check if username or ID provided
    if (args.length > 0) {
        const arg = args[0];
        
        // If it's a number, treat as user ID
        if (/^\d+$/.test(arg)) {
            try {
                const member = await ctx.api.getChatMember(ctx.chat.id, parseInt(arg));
                return member.user;
            } catch (error) {
                return null;
            }
        }
        
        // If it starts with @, treat as username
        if (arg.startsWith('@')) {
            const username = arg.slice(1);
            try {
                // We can't directly get user by username, so this is a limitation
                // In practice, users would need to forward a message or use user ID
                return null;
            } catch (error) {
                return null;
            }
        }
    }
    
    return null;
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m`;
    } else {
        return `${seconds}s`;
    }
}

module.exports = composer;
