const database = require('../storage/database');
const logger = require('../utils/logger');
const config = require('../config/config');

// Flood protection tracking
const floodTracker = new Map();

function cleanupFloodTracker() {
    const now = Date.now();
    for (const [key, data] of floodTracker.entries()) {
        if (now - data.lastMessage > config.FLOOD_WINDOW) {
            floodTracker.delete(key);
        }
    }
}

// Clean up flood tracker every minute
setInterval(cleanupFloodTracker, 60000);

async function securityMiddleware(ctx, next) {
    try {
        // Skip if private chat or no user
        if (ctx.chat?.type === 'private' || !ctx.from) {
            return await next();
        }
        
        const userId = ctx.from.id;
        const chatId = ctx.chat.id;
        const userKey = `${userId}:${chatId}`;
        
        // Check if user is exempted (admin, bot admin, bot owner, or whitelisted)
        const isExempt = await isUserExempt(ctx, userId, chatId);
        if (isExempt) {
            return await next();
        }
        
        // Flood protection
        const now = Date.now();
        const floodData = floodTracker.get(userKey) || { count: 0, lastMessage: now };
        
        if (now - floodData.lastMessage < config.FLOOD_WINDOW) {
            floodData.count++;
            if (floodData.count > config.FLOOD_LIMIT) {
                // Flood detected - take action
                try {
                    await ctx.restrictChatMember(userId, {
                        can_send_messages: false,
                        until_date: Math.floor(Date.now() / 1000) + 300 // 5 minutes mute
                    });
                    
                    await ctx.reply(`🚫 @${ctx.from.username || ctx.from.first_name} has been muted for 5 minutes due to flooding.`);
                    
                    logger.warn(`User ${userId} was muted for flooding in chat ${chatId}`);
                    database.incrementActionsTaken();
                } catch (error) {
                    logger.error(`Failed to mute flooding user ${userId}:`, error);
                }
                return; // Don't process the message
            }
        } else {
            floodData.count = 1;
        }
        
        floodData.lastMessage = now;
        floodTracker.set(userKey, floodData);
        
        // Increment message counter
        database.incrementMessagesProcessed();
        
        await next();
        
    } catch (error) {
        logger.error('Security middleware error:', error);
        await next(); // Continue processing even if security checks fail
    }
}

async function isUserExempt(ctx, userId, chatId) {
    try {
        // Bot owner is always exempt
        if (userId.toString() === config.BOT_OWNER_ID) {
            return true;
        }
        
        // Bot admins are always exempt
        if (config.BOT_ADMINS.includes(userId.toString())) {
            return true;
        }
        
        // Check if user is group admin
        try {
            const member = await ctx.api.getChatMember(chatId, userId);
            if (member.status === 'administrator' || member.status === 'creator') {
                return true;
            }
        } catch (error) {
            // If we can't check admin status, continue with other checks
            logger.warn(`Could not check admin status for user ${userId}:`, error.message);
        }
        
        // Check whitelist
        const groupSettings = database.getGroupSettings(chatId);
        if (groupSettings.whitelist && groupSettings.whitelist.includes(userId)) {
            return true;
        }
        
        return false;
    } catch (error) {
        logger.error('Error checking user exemption:', error);
        return false; // If we can't determine, don't exempt
    }
}

module.exports = securityMiddleware;
