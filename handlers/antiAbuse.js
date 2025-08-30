const { Composer } = require('grammy');
const database = require('../storage/database');
const { detectAbusiveContent, detectAbusiveContentAdvanced, calculateEscalationLevel } = require('../utils/filters');
const logger = require('../utils/logger');
const config = require('../config/config');

const composer = new Composer();

// Handle text messages
composer.on('message:text', async (ctx, next) => {
    await checkForAbuse(ctx, ctx.message.text);
    await next();
});

// Handle captions
composer.on('message:caption', async (ctx, next) => {
    await checkForAbuse(ctx, ctx.message.caption);
    await next();
});

// Handle media content (photos, videos, documents)
composer.on('message:photo', async (ctx, next) => {
    await checkForMediaAbuse(ctx, 'photo');
    if (ctx.message.caption) {
        await checkForAbuse(ctx, ctx.message.caption);
    }
    await next();
});

composer.on('message:video', async (ctx, next) => {
    await checkForMediaAbuse(ctx, 'video');
    if (ctx.message.caption) {
        await checkForAbuse(ctx, ctx.message.caption);
    }
    await next();
});

composer.on('message:document', async (ctx, next) => {
    await checkForMediaAbuse(ctx, 'document');
    if (ctx.message.caption) {
        await checkForAbuse(ctx, ctx.message.caption);
    }
    await next();
});

composer.on('message:sticker', async (ctx, next) => {
    await checkForMediaAbuse(ctx, 'sticker');
    await next();
});

// Handle edited messages
composer.on('edited_message:text', async (ctx, next) => {
    await checkForAbuse(ctx, ctx.editedMessage.text, true);
    await next();
});

composer.on('edited_message:caption', async (ctx, next) => {
    await checkForAbuse(ctx, ctx.editedMessage.caption, true);
    await next();
});

async function checkForAbuse(ctx, text, isEdit = false) {
    try {
        // Skip if private chat
        if (ctx.chat?.type === 'private') return;
        
        const chatId = ctx.chat.id;
        const userId = ctx.from.id;
        const groupSettings = database.getGroupSettings(chatId);
        
        // Check if anti-abuse is enabled
        if (!groupSettings.antiAbuse.enabled) return;
        
        // Check if user is exempted
        if (await isUserExempt(ctx, userId, chatId)) return;
        
        const moderationLevel = groupSettings.antiAbuse.level;
        
        // Use advanced detection with behavioral analysis
        const abuseDetected = detectAbusiveContentAdvanced(text, moderationLevel, userId, chatId);
        
        // Get user violation history for escalation
        const userViolations = database.getUserViolations(chatId, userId);
        const escalation = calculateEscalationLevel(userViolations, abuseDetected.severity);
        
        if (abuseDetected.isAbusive) {
            await handleAbusiveContent(ctx, abuseDetected, escalation, isEdit);
        }
        
    } catch (error) {
        logger.error('Anti-abuse handler error:', error);
    }
}

async function handleAbusiveContent(ctx, detection, escalation, isEdit = false) {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const groupSettings = database.getGroupSettings(chatId);
    const moderationLevel = config.MODERATION_LEVELS[groupSettings.antiAbuse.level];
    let actions = config.MODERATION_ACTIONS[moderationLevel] || [];
    
    // Apply escalation if needed
    if (escalation.shouldEscalate) {
        const escalatedLevel = config.MODERATION_LEVELS[escalation.escalatedSeverity];
        const escalatedActions = config.MODERATION_ACTIONS[escalatedLevel] || [];
        actions = escalatedActions.length > actions.length ? escalatedActions : actions;
        logger.info(`Escalated actions for repeat offender ${userId} in chat ${chatId}: ${escalation.recentViolationCount} recent violations`);
    }
    
    try {
        let actionTaken = false;
        
        // Delete message
        if (actions.includes('delete')) {
            try {
                await ctx.deleteMessage();
                actionTaken = true;
                logger.info(`Deleted abusive message from user ${userId} in chat ${chatId}`);
            } catch (error) {
                logger.warn(`Could not delete message: ${error.message}`);
            }
        }
        
        // Enhanced warning with behavioral analysis
        if (actions.includes('warn')) {
            let warningMessage = `⚠️ @${ctx.from.username || ctx.from.first_name}, your ${isEdit ? 'edited ' : ''}message contained inappropriate content and has been ${actionTaken ? 'removed' : 'flagged'}.\n\n`;
            
            // Add specific detection reasons
            if (detection.reasons.length > 0) {
                warningMessage += `**Issues Found:** ${detection.reasons.slice(0, 3).join(', ')}\n`;
            }
            
            // Add behavioral warnings if applicable
            if (detection.userBehavior.riskScore > 3) {
                warningMessage += `**Warning:** High-risk behavior detected\n`;
            }
            if (detection.spamAnalysis?.isSpam) {
                warningMessage += `**Spam Alert:** Message flagged as spam\n`;
            }
            if (detection.toxicity?.level === 'high') {
                warningMessage += `**Toxicity:** High toxicity level detected\n`;
            }
            
            // Add escalation warning
            if (escalation.shouldEscalate) {
                warningMessage += `\n🚨 **Escalation Notice:** ${escalation.recentViolationCount} violations in 24hrs - stricter actions applied\n`;
            }
            
            warningMessage += `\n**Risk Score:** ${detection.riskScore.toFixed(1)}/5 | **Level:** ${groupSettings.antiAbuse.level}`;
            
            try {
                await ctx.reply(warningMessage, { parse_mode: 'Markdown' });
            } catch (error) {
                logger.warn(`Could not send warning: ${error.message}`);
            }
        }
        
        // Mute user (temporary)
        if (actions.includes('mute')) {
            try {
                const muteUntil = Math.floor(Date.now() / 1000) + (30 * 60); // 30 minutes
                await ctx.restrictChatMember(userId, {
                    can_send_messages: false,
                    until_date: muteUntil
                });
                
                await ctx.reply(`🔇 @${ctx.from.username || ctx.from.first_name} has been muted for 30 minutes due to abusive content.`);
                logger.info(`Muted user ${userId} for 30 minutes in chat ${chatId}`);
            } catch (error) {
                logger.warn(`Could not mute user: ${error.message}`);
            }
        }
        
        // Ban user
        if (actions.includes('ban')) {
            try {
                await ctx.banChatMember(userId);
                await ctx.reply(`🚫 @${ctx.from.username || ctx.from.first_name} has been banned for severe abusive content.`);
                logger.info(`Banned user ${userId} from chat ${chatId}`);
            } catch (error) {
                logger.warn(`Could not ban user: ${error.message}`);
            }
        }
        
        // Record the enhanced violation with additional metadata
        database.recordViolation(chatId, userId, 'abuse', escalation.shouldEscalate ? escalation.escalatedSeverity : detection.severity);
        database.incrementActionsTaken();
        
        // Log advanced detection details
        logger.info(`Advanced abuse detection - User: ${userId}, Risk: ${detection.riskScore.toFixed(1)}, Toxicity: ${detection.toxicity?.level}, Spam: ${detection.spamAnalysis?.isSpam}, Escalated: ${escalation.shouldEscalate}`);
        
        // Update user behavior cache with violation
        if (detection.userBehavior) {
            detection.userBehavior.violations.push({
                type: 'abuse',
                severity: detection.severity,
                timestamp: Date.now(),
                escalated: escalation.shouldEscalate
            });
        }
        
    } catch (error) {
        logger.error('Error handling abusive content:', error);
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

async function checkForMediaAbuse(ctx, mediaType) {
    try {
        // Skip if private chat
        if (ctx.chat?.type === 'private') return;
        
        const chatId = ctx.chat.id;
        const userId = ctx.from.id;
        const groupSettings = database.getGroupSettings(chatId);
        
        // Check if anti-abuse is enabled
        if (!groupSettings.antiAbuse.enabled) return;
        
        // Check if user is exempted
        if (await isUserExempt(ctx, userId, chatId)) return;
        
        // Get user behavior for pattern analysis
        const userBehavior = database.getUserViolations(chatId, userId);
        const mediaViolations = userBehavior.filter(v => v.type === 'media_abuse');
        
        // Check for suspicious media patterns
        let suspicionScore = 0;
        const reasons = [];
        
        // Rate limiting for media
        const recentMedia = userBehavior.filter(v => 
            v.type === 'media_abuse' && 
            Date.now() - v.timestamp < 300000 // Last 5 minutes
        );
        
        if (recentMedia.length >= 5) {
            suspicionScore += 3;
            reasons.push('rapid_media_posting');
        }
        
        // Check file characteristics for documents
        if (mediaType === 'document' && ctx.message.document) {
            const doc = ctx.message.document;
            
            // Suspicious file extensions
            const suspiciousExts = ['.exe', '.bat', '.scr', '.com', '.pif', '.vbs', '.js'];
            if (suspiciousExts.some(ext => doc.file_name?.toLowerCase().endsWith(ext))) {
                suspicionScore += 4;
                reasons.push('suspicious_file_type');
            }
            
            // Very large files (potential spam)
            if (doc.file_size > 50 * 1024 * 1024) { // 50MB
                suspicionScore += 2;
                reasons.push('oversized_file');
            }
        }
        
        // Check for sticker spam
        if (mediaType === 'sticker') {
            const recentStickers = userBehavior.filter(v => 
                v.type === 'media_abuse' && 
                v.mediaType === 'sticker' &&
                Date.now() - v.timestamp < 60000 // Last minute
            );
            
            if (recentStickers.length >= 10) {
                suspicionScore += 3;
                reasons.push('sticker_spam');
            }
        }
        
        // Apply moderation based on score
        if (suspicionScore >= 3) {
            const moderationLevel = groupSettings.antiAbuse.level;
            const actions = config.MODERATION_ACTIONS[config.MODERATION_LEVELS[moderationLevel]] || [];
            
            try {
                // Delete suspicious media
                if (actions.includes('delete')) {
                    await ctx.deleteMessage();
                    logger.info(`Deleted suspicious ${mediaType} from user ${userId} in chat ${chatId}`);
                }
                
                // Warn about media abuse
                if (actions.includes('warn')) {
                    const warningMsg = `⚠️ @${ctx.from.username || ctx.from.first_name}, your ${mediaType} was flagged as suspicious.\n\n` +
                        `**Issues:** ${reasons.join(', ')}\n` +
                        `**Score:** ${suspicionScore}/5`;
                    
                    await ctx.reply(warningMsg, { parse_mode: 'Markdown' });
                }
                
                // Mute for repeated media abuse
                if (actions.includes('mute') && suspicionScore >= 4) {
                    const muteUntil = Math.floor(Date.now() / 1000) + (10 * 60); // 10 minutes
                    await ctx.restrictChatMember(userId, {
                        can_send_messages: false,
                        until_date: muteUntil
                    });
                    
                    await ctx.reply(`🔇 @${ctx.from.username || ctx.from.first_name} muted for 10 minutes due to suspicious media.`);
                }
                
                // Record the violation
                database.recordViolation(chatId, userId, 'media_abuse', suspicionScore >= 4 ? 'high' : 'medium');
                database.incrementActionsTaken();
                
            } catch (error) {
                logger.error('Error handling media abuse:', error);
            }
        }
        
    } catch (error) {
        logger.error('Media abuse checking error:', error);
    }
}

module.exports = composer;
