const { Composer } = require('grammy');
const database = require('../storage/database');
const logger = require('../utils/logger');

const composer = new Composer();

// Global ban command
composer.command('gban', async (ctx) => {
    if (!ctx.isOwner() && !ctx.isBotAdmin()) {
        return await ctx.reply('❌ Only bot owner and admins can use global commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return await ctx.reply('❌ Please provide a user ID to globally ban.');
    }
    
    const userId = parseInt(args[0]);
    if (isNaN(userId)) {
        return await ctx.reply('❌ Please provide a valid user ID.');
    }
    
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    try {
        database.addGlobalBan(userId, ctx.from.id, reason);
        await ctx.reply(`🌐🚫 User ${userId} has been globally banned.\n**Reason:** ${reason}`);
        
        logger.info(`User ${userId} globally banned by ${ctx.from.id} for: ${reason}`);
        
        // Optionally ban from current chat if it's a group
        if (ctx.chat?.type !== 'private') {
            try {
                await ctx.banChatMember(userId);
                await ctx.reply(`🚫 User has also been banned from this group.`);
            } catch (error) {
                logger.warn(`Could not ban globally banned user from current chat: ${error.message}`);
            }
        }
        
    } catch (error) {
        logger.error('Global ban command error:', error);
        await ctx.reply('❌ Failed to globally ban user.');
    }
});

// Global unban command
composer.command('gunban', async (ctx) => {
    if (!ctx.isOwner() && !ctx.isBotAdmin()) {
        return await ctx.reply('❌ Only bot owner and admins can use global commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return await ctx.reply('❌ Please provide a user ID to globally unban.');
    }
    
    const userId = parseInt(args[0]);
    if (isNaN(userId)) {
        return await ctx.reply('❌ Please provide a valid user ID.');
    }
    
    try {
        const wasRemoved = database.removeGlobalBan(userId);
        if (wasRemoved) {
            await ctx.reply(`🌐✅ User ${userId} has been globally unbanned.`);
            logger.info(`User ${userId} globally unbanned by ${ctx.from.id}`);
        } else {
            await ctx.reply(`❌ User ${userId} was not globally banned.`);
        }
    } catch (error) {
        logger.error('Global unban command error:', error);
        await ctx.reply('❌ Failed to globally unban user.');
    }
});

// Global mute command
composer.command('gmute', async (ctx) => {
    if (!ctx.isOwner() && !ctx.isBotAdmin()) {
        return await ctx.reply('❌ Only bot owner and admins can use global commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return await ctx.reply('❌ Please provide a user ID to globally mute.');
    }
    
    const userId = parseInt(args[0]);
    if (isNaN(userId)) {
        return await ctx.reply('❌ Please provide a valid user ID.');
    }
    
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    try {
        database.addGlobalMute(userId, ctx.from.id, reason);
        await ctx.reply(`🌐🔇 User ${userId} has been globally muted.\n**Reason:** ${reason}`);
        
        logger.info(`User ${userId} globally muted by ${ctx.from.id} for: ${reason}`);
        
        // Optionally mute in current chat if it's a group
        if (ctx.chat?.type !== 'private') {
            try {
                await ctx.restrictChatMember(userId, {
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
                });
                await ctx.reply(`🔇 User has also been muted in this group.`);
            } catch (error) {
                logger.warn(`Could not mute globally muted user in current chat: ${error.message}`);
            }
        }
        
    } catch (error) {
        logger.error('Global mute command error:', error);
        await ctx.reply('❌ Failed to globally mute user.');
    }
});

// Global unmute command
composer.command('gunmute', async (ctx) => {
    if (!ctx.isOwner() && !ctx.isBotAdmin()) {
        return await ctx.reply('❌ Only bot owner and admins can use global commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return await ctx.reply('❌ Please provide a user ID to globally unmute.');
    }
    
    const userId = parseInt(args[0]);
    if (isNaN(userId)) {
        return await ctx.reply('❌ Please provide a valid user ID.');
    }
    
    try {
        const wasRemoved = database.removeGlobalMute(userId);
        if (wasRemoved) {
            await ctx.reply(`🌐🔊 User ${userId} has been globally unmuted.`);
            logger.info(`User ${userId} globally unmuted by ${ctx.from.id}`);
        } else {
            await ctx.reply(`❌ User ${userId} was not globally muted.`);
        }
    } catch (error) {
        logger.error('Global unmute command error:', error);
        await ctx.reply('❌ Failed to globally unmute user.');
    }
});

// List global bans
composer.command('gbanlist', async (ctx) => {
    if (!ctx.isOwner() && !ctx.isBotAdmin()) {
        return await ctx.reply('❌ Only bot owner and admins can view global lists.');
    }
    
    try {
        const globalBans = database.getGlobalBans();
        
        if (globalBans.length === 0) {
            return await ctx.reply('📋 Global ban list is empty.');
        }
        
        const banList = globalBans.slice(0, 20).map((ban, index) => {
            const date = new Date(ban.timestamp).toLocaleDateString();
            return `${index + 1}. User ID: ${ban.userId}\n   Reason: ${ban.reason}\n   Date: ${date}`;
        }).join('\n\n');
        
        await ctx.reply(`🌐🚫 **Global Ban List (${globalBans.length} total):**\n\n${banList}`, { parse_mode: 'Markdown' });
        
        if (globalBans.length > 20) {
            await ctx.reply(`... and ${globalBans.length - 20} more entries.`);
        }
    } catch (error) {
        logger.error('Global ban list command error:', error);
        await ctx.reply('❌ Failed to retrieve global ban list.');
    }
});

// List global mutes
composer.command('gmutelist', async (ctx) => {
    if (!ctx.isOwner() && !ctx.isBotAdmin()) {
        return await ctx.reply('❌ Only bot owner and admins can view global lists.');
    }
    
    try {
        const globalMutes = database.getGlobalMutes();
        
        if (globalMutes.length === 0) {
            return await ctx.reply('📋 Global mute list is empty.');
        }
        
        const muteList = globalMutes.slice(0, 20).map((mute, index) => {
            const date = new Date(mute.timestamp).toLocaleDateString();
            return `${index + 1}. User ID: ${mute.userId}\n   Reason: ${mute.reason}\n   Date: ${date}`;
        }).join('\n\n');
        
        await ctx.reply(`🌐🔇 **Global Mute List (${globalMutes.length} total):**\n\n${muteList}`, { parse_mode: 'Markdown' });
        
        if (globalMutes.length > 20) {
            await ctx.reply(`... and ${globalMutes.length - 20} more entries.`);
        }
    } catch (error) {
        logger.error('Global mute list command error:', error);
        await ctx.reply('❌ Failed to retrieve global mute list.');
    }
});

// Bot admin management (owner only)
composer.command('addadmin', async (ctx) => {
    if (!ctx.isOwner()) {
        return await ctx.reply('❌ Only the bot owner can add admins.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return await ctx.reply('❌ Please provide a user ID to add as bot admin.');
    }
    
    const userId = args[0];
    if (!/^\d+$/.test(userId)) {
        return await ctx.reply('❌ Please provide a valid user ID.');
    }
    
    try {
        database.addBotAdmin(userId);
        await ctx.reply(`✅ User ${userId} has been added as a bot admin.`);
        logger.info(`User ${userId} added as bot admin by owner ${ctx.from.id}`);
    } catch (error) {
        logger.error('Add admin command error:', error);
        await ctx.reply('❌ Failed to add bot admin.');
    }
});

// Remove bot admin (owner only)
composer.command('removeadmin', async (ctx) => {
    if (!ctx.isOwner()) {
        return await ctx.reply('❌ Only the bot owner can remove admins.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return await ctx.reply('❌ Please provide a user ID to remove from bot admins.');
    }
    
    const userId = args[0];
    
    try {
        const wasRemoved = database.removeBotAdmin(userId);
        if (wasRemoved) {
            await ctx.reply(`✅ User ${userId} has been removed from bot admins.`);
            logger.info(`User ${userId} removed from bot admins by owner ${ctx.from.id}`);
        } else {
            await ctx.reply(`❌ User ${userId} was not a bot admin.`);
        }
    } catch (error) {
        logger.error('Remove admin command error:', error);
        await ctx.reply('❌ Failed to remove bot admin.');
    }
});

// List bot admins
composer.command('adminlist', async (ctx) => {
    if (!ctx.isOwner() && !ctx.isBotAdmin()) {
        return await ctx.reply('❌ Only bot owner and admins can view admin list.');
    }
    
    try {
        const botAdmins = database.getBotAdmins();
        
        if (botAdmins.length === 0) {
            return await ctx.reply('📋 No bot admins configured.');
        }
        
        const adminList = botAdmins.map((admin, index) => {
            const date = admin.addedAt ? new Date(admin.addedAt).toLocaleDateString() : 'Unknown';
            return `${index + 1}. User ID: ${admin.userId}\n   Added: ${date}`;
        }).join('\n\n');
        
        await ctx.reply(`👑 **Bot Admins (${botAdmins.length} total):**\n\n${adminList}`, { parse_mode: 'Markdown' });
    } catch (error) {
        logger.error('Admin list command error:', error);
        await ctx.reply('❌ Failed to retrieve admin list.');
    }
});

module.exports = composer;
