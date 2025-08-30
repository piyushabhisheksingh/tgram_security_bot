const { Bot, session, GrammyError, HttpError } = require('grammy');
const { limit } = require('@grammyjs/ratelimiter');
const { run } = require('@grammyjs/runner');
const express = require('express');
const config = require('./config/config');
const database = require('./storage/database');
const logger = require('./utils/logger');

// Import middleware
const securityMiddleware = require('./middleware/security');
const adminMiddleware = require('./middleware/admin');

// Import handlers
const antiAbuseHandler = require('./handlers/antiAbuse');
const antiCopyrightHandler = require('./handlers/antiCopyright');
const antiPromotionHandler = require('./handlers/antiPromotion');
const adminCommandsHandler = require('./handlers/adminCommands');
const globalCommandsHandler = require('./handlers/globalCommands');
const statsHandler = require('./handlers/stats');
const settingsHandler = require('./handlers/settings');
const helpHandler = require('./handlers/help');

// Create bot instance
const bot = new Bot(config.BOT_TOKEN);

// Session middleware for maintaining state
bot.use(session({
    initial: () => ({}),
}));

// Rate limiting middleware
bot.use(limit({
    timeFrame: 2000,
    limit: 3,
    storageAdapter: () => new Map(),
    keyGenerator: (ctx) => {
        return ctx.from?.id.toString();
    },
}));

// Custom middleware for logging and database initialization
bot.use(async (ctx, next) => {
    try {
        // Initialize group data if not exists
        if (ctx.chat?.type !== 'private') {
            await database.initializeGroup(ctx.chat.id);
        }
        
        // Log activity
        logger.info(`Message from ${ctx.from?.id} in chat ${ctx.chat?.id}`);
        
        await next();
    } catch (error) {
        logger.error('Middleware error:', error);
        throw error;
    }
});

// Security middleware
bot.use(securityMiddleware);

// Admin middleware
bot.use(adminMiddleware);

// Error handling
bot.catch((err) => {
    const ctx = err.ctx;
    logger.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    
    if (e instanceof GrammyError) {
        logger.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
        logger.error("Could not contact Telegram:", e);
    } else {
        logger.error("Unknown error:", e);
    }
});

// Command handlers
bot.command('start', async (ctx) => {
    const welcomeMessage = `
🛡️ *Security Bot* 🛡️

Welcome to the advanced Telegram Security Bot!

This bot provides comprehensive moderation and security features for your groups:

🔸 Anti-Abuse Protection
🔸 Anti-Copyright Enforcement  
🔸 Anti-Promotion Controls
🔸 Advanced Admin Tools
🔸 Global Moderation System
🔸 Statistics & Analytics

Use /help to see all available commands.

*Bot Owner:* ${config.BOT_OWNER_ID}
*Bot Admins:* ${config.BOT_ADMINS.length} configured
    `;
    
    await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
});

// Help command
bot.use(helpHandler);

// Settings commands
bot.use(settingsHandler);

// Admin commands
bot.use(adminCommandsHandler);

// Global commands (for bot owner/admins)
bot.use(globalCommandsHandler);

// Statistics commands
bot.use(statsHandler);

// Security handlers for message processing
bot.use(antiAbuseHandler);
bot.use(antiCopyrightHandler);
bot.use(antiPromotionHandler);

// Handle new group members
bot.on('message:new_chat_members', async (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    
    for (const member of newMembers) {
        // Check global ban list
        if (database.isGloballyBanned(member.id)) {
            try {
                await ctx.banChatMember(member.id);
                await ctx.reply(`🚫 User ${member.first_name} was globally banned and has been removed.`);
                logger.info(`Globally banned user ${member.id} was auto-banned from group ${ctx.chat.id}`);
            } catch (error) {
                logger.error(`Failed to ban globally banned user ${member.id}:`, error);
            }
            continue;
        }
        
        // Check global mute list
        if (database.isGloballyMuted(member.id)) {
            try {
                await ctx.restrictChatMember(member.id, {
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
                    can_change_info: false,
                    can_invite_users: false,
                    can_pin_messages: false,
                });
                await ctx.reply(`🔇 User ${member.first_name} was globally muted.`);
                logger.info(`Globally muted user ${member.id} was auto-muted in group ${ctx.chat.id}`);
            } catch (error) {
                logger.error(`Failed to mute globally muted user ${member.id}:`, error);
            }
        }
    }
});

// Handle user leaving group
bot.on('message:left_chat_member', async (ctx) => {
    const leftMember = ctx.message.left_chat_member;
    logger.info(`User ${leftMember.id} left group ${ctx.chat.id}`);
});

// Backup command for bot owner
bot.command('backup', async (ctx) => {
    if (ctx.from.id.toString() !== config.BOT_OWNER_ID) {
        return await ctx.reply('❌ Only the bot owner can create backups.');
    }
    
    try {
        const backupData = database.createBackup();
        const backupFile = Buffer.from(JSON.stringify(backupData, null, 2));
        
        await ctx.replyWithDocument({
            source: backupFile,
            filename: `security_bot_backup_${Date.now()}.json`
        }, {
            caption: '💾 Database backup created successfully!'
        });
        
        logger.info(`Backup created by bot owner ${ctx.from.id}`);
    } catch (error) {
        logger.error('Backup creation failed:', error);
        await ctx.reply('❌ Failed to create backup. Check logs for details.');
    }
});

// Send backup to owner's DM command (for testing)
bot.command('sendbackup', async (ctx) => {
    if (ctx.from.id.toString() !== config.BOT_OWNER_ID) {
        return await ctx.reply('❌ Only the bot owner can send backup files.');
    }
    
    try {
        await database.sendAutomaticBackup();
        await ctx.reply('✅ Backup file sent to your DM successfully!');
        logger.info(`Manual backup file send initiated by bot owner ${ctx.from.id}`);
    } catch (error) {
        logger.error('Manual backup file send failed:', error);
        await ctx.reply('❌ Failed to send backup file. Check logs for details.');
    }
});

// Bot info command
bot.command('botinfo', async (ctx) => {
    const stats = database.getBotStats();
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    const info = `
🤖 *Bot Information*

📊 *Statistics:*
• Groups: ${stats.totalGroups}
• Users: ${stats.totalUsers}
• Messages Processed: ${stats.messagesProcessed}
• Actions Taken: ${stats.actionsTaken}

⏱️ *Uptime:* ${hours}h ${minutes}m
🔧 *Version:* 1.0.0
👑 *Owner:* ${config.BOT_OWNER_ID}
🛡️ *Admins:* ${config.BOT_ADMINS.length}

💾 *Memory Usage:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
    `;
    
    await ctx.reply(info, { parse_mode: 'Markdown' });
});

// Initialize bot
async function initializeBot() {
    try {
        // Initialize database with bot instance for backup functionality
        await database.initialize(bot);
        logger.info('Database initialized successfully');
        
        // Get bot info
        const me = await bot.api.getMe();
        logger.info(`Bot @${me.username} initialized successfully`);
        
        // Start bot
        if (config.USE_WEBHOOKS) {
            // Webhook mode (for production)
            const app = express();
            app.use(express.json());
            
            app.post(`/webhook/${config.BOT_TOKEN}`, (req, res) => {
                bot.handleUpdate(req.body);
                res.sendStatus(200);
            });
            
            app.listen(config.PORT, '0.0.0.0', () => {
                logger.info(`Webhook server listening on port ${config.PORT}`);
            });
            
            // Set webhook
            await bot.api.setWebhook(`${config.WEBHOOK_URL}/webhook/${config.BOT_TOKEN}`);
            logger.info('Webhook set successfully');
        } else {
            // Polling mode (for development)
            const runner = run(bot);
            logger.info('Bot started in polling mode');
            
            // Graceful shutdown
            const stopRunner = () => runner.isRunning() && runner.stop();
            process.once('SIGINT', stopRunner);
            process.once('SIGTERM', stopRunner);
        }
        
    } catch (error) {
        logger.error('Failed to initialize bot:', error);
        process.exit(1);
    }
}

// Start the bot
initializeBot();

module.exports = bot;
