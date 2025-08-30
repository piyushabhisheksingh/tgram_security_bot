const { Composer } = require('grammy');
const database = require('../storage/database');
const logger = require('../utils/logger');
const config = require('../config/config');

const composer = new Composer();

// Handle text messages
composer.on('message:text', async (ctx, next) => {
    await checkCharacterLimit(ctx, ctx.message.text);
    await next();
});

// Handle captions
composer.on('message:caption', async (ctx, next) => {
    await checkCharacterLimit(ctx, ctx.message.caption);
    await next();
});

// Handle message edits (prevent editing if enabled)
composer.on('edited_message', async (ctx, next) => {
    await handleMessageEdit(ctx);
    await next();
});

async function checkCharacterLimit(ctx, text) {
    try {
        // Skip if private chat
        if (ctx.chat?.type === 'private') return;
        
        const chatId = ctx.chat.id;
        const userId = ctx.from.id;
        const groupSettings = database.getGroupSettings(chatId);
        
        // Check if anti-copyright is enabled
        if (!groupSettings.antiCopyright.enabled) return;
        
        // Check if user is exempted
        if (await isUserExempt(ctx, userId, chatId)) return;
        
        const characterLimit = groupSettings.antiCopyright.characterLimit;
        
        if (text && text.length > characterLimit) {
            await handleCharacterLimitViolation(ctx, text.length, characterLimit);
        }
        
    } catch (error) {
        logger.error('Anti-copyright handler error:', error);
    }
}

async function handleMessageEdit(ctx) {
    try {
        // Skip if private chat
        if (ctx.chat?.type === 'private') return;
        
        const chatId = ctx.chat.id;
        const userId = ctx.from.id;
        const groupSettings = database.getGroupSettings(chatId);
        
        // Check if anti-copyright is enabled
        if (!groupSettings.antiCopyright.enabled) return;
        
        // Check if user is exempted
        if (await isUserExempt(ctx, userId, chatId)) return;
        
        // Prevent message editing
        try {
            await ctx.deleteMessage();
            await ctx.reply(
                `🚫 @${ctx.from.username || ctx.from.first_name}, message editing is not allowed in this group to prevent copyright violations.`,
                { reply_to_message_id: ctx.editedMessage.message_id }
            );
            
            logger.info(`Prevented message edit by user ${userId} in chat ${chatId}`);
            database.recordViolation(chatId, userId, 'edit_attempt', 'medium');
            database.incrementActionsTaken();
        } catch (error) {
            logger.warn(`Could not handle message edit: ${error.message}`);
        }
        
    } catch (error) {
        logger.error('Error handling message edit:', error);
    }
}

async function handleCharacterLimitViolation(ctx, messageLength, limit) {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    
    try {
        // Delete the message
        await ctx.deleteMessage();
        
        // Send warning
        const warningMessage = `⚠️ @${ctx.from.username || ctx.from.first_name}, your message was too long and has been removed.\n\n` +
            `**Message length:** ${messageLength} characters\n` +
            `**Limit:** ${limit} characters\n` +
            `**Exceeded by:** ${messageLength - limit} characters`;
        
        await ctx.reply(warningMessage, { parse_mode: 'Markdown' });
        
        logger.info(`Removed long message (${messageLength} chars) from user ${userId} in chat ${chatId}`);
        database.recordViolation(chatId, userId, 'character_limit', 'low');
        database.incrementActionsTaken();
        
    } catch (error) {
        logger.error('Error handling character limit violation:', error);
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
