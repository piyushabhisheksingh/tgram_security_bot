const { Composer } = require('grammy');
const database = require('../storage/database');
const { detectLinks } = require('../utils/filters');
const logger = require('../utils/logger');
const config = require('../config/config');

const composer = new Composer();

// Handle text messages
composer.on('message:text', async (ctx, next) => {
    await checkForPromotionalContent(ctx, ctx.message.text);
    await next();
});

// Handle captions
composer.on('message:caption', async (ctx, next) => {
    await checkForPromotionalContent(ctx, ctx.message.caption);
    await next();
});

// Handle edited messages
composer.on('edited_message:text', async (ctx, next) => {
    await checkForPromotionalContent(ctx, ctx.editedMessage.text, true);
    await next();
});

composer.on('edited_message:caption', async (ctx, next) => {
    await checkForPromotionalContent(ctx, ctx.editedMessage.caption, true);
    await next();
});

async function checkForPromotionalContent(ctx, text, isEdit = false) {
    try {
        // Skip if private chat
        if (ctx.chat?.type === 'private') return;
        
        const chatId = ctx.chat.id;
        const userId = ctx.from.id;
        const groupSettings = database.getGroupSettings(chatId);
        
        // Check if anti-promotion is enabled
        if (!groupSettings.antiPromotion.enabled) return;
        
        // Check if user is exempted
        if (await isUserExempt(ctx, userId, chatId)) return;
        
        const linkDetection = detectLinks(text);
        
        if (linkDetection.hasLinks) {
            await handlePromotionalContent(ctx, linkDetection, isEdit);
        }
        
    } catch (error) {
        logger.error('Anti-promotion handler error:', error);
    }
}

async function handlePromotionalContent(ctx, detection, isEdit = false) {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    
    try {
        // Delete the message
        await ctx.deleteMessage();
        
        // Determine action based on link type
        let actionType = 'promotion';
        let warningLevel = 'medium';
        
        if (detection.telegramLinks.length > 0) {
            actionType = 'telegram_promotion';
            warningLevel = 'high';
        }
        
        // Send warning
        const linkTypes = [];
        if (detection.webLinks.length > 0) linkTypes.push(`${detection.webLinks.length} web link(s)`);
        if (detection.telegramLinks.length > 0) linkTypes.push(`${detection.telegramLinks.length} Telegram link(s)`);
        
        const warningMessage = `🚫 @${ctx.from.username || ctx.from.first_name}, promotional content is not allowed in this group.\n\n` +
            `**Detected:** ${linkTypes.join(', ')}\n` +
            `**${isEdit ? 'Edited message' : 'Message'} removed.**`;
        
        await ctx.reply(warningMessage, { parse_mode: 'Markdown' });
        
        logger.info(`Removed promotional content from user ${userId} in chat ${chatId}: ${linkTypes.join(', ')}`);
        database.recordViolation(chatId, userId, actionType, warningLevel);
        database.incrementActionsTaken();
        
        // Additional action for Telegram links (more severe)
        if (detection.telegramLinks.length > 0) {
            const violations = database.getUserViolations(chatId, userId);
            const telegramLinkViolations = violations.filter(v => v.type === 'telegram_promotion').length;
            
            // Mute for repeated Telegram link violations
            if (telegramLinkViolations >= 2) {
                try {
                    const muteUntil = Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour
                    await ctx.restrictChatMember(userId, {
                        can_send_messages: false,
                        until_date: muteUntil
                    });
                    
                    await ctx.reply(`🔇 @${ctx.from.username || ctx.from.first_name} has been muted for 1 hour due to repeated promotional violations.`);
                    logger.info(`Muted user ${userId} for repeated Telegram promotion in chat ${chatId}`);
                } catch (error) {
                    logger.warn(`Could not mute user for promotion: ${error.message}`);
                }
            }
        }
        
    } catch (error) {
        logger.error('Error handling promotional content:', error);
    }
}

async function isUserExempt(ctx, userId, chatId) {
    try {
        // Bot owner and admins are exempt
        if (userId.toString() === config.BOT_OWNER_ID || 
            config.BOT_ADMINS.includes(userId.toString())) {
            return true;
        }
        
        // Group admins are exempt
        const member = await ctx.api.getChatMember(chatId, userId);
        if (member.status === 'administrator' || member.status === 'creator') {
            return true;
        }
        
        // Whitelisted users are exempt
        const groupSettings = database.getGroupSettings(chatId);
        if (groupSettings.whitelist && groupSettings.whitelist.includes(userId)) {
            return true;
        }
        
        return false;
    } catch (error) {
        logger.warn('Error checking user exemption:', error);
        return false;
    }
}

module.exports = composer;
