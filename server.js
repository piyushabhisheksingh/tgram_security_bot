const express = require('express');
const { webhookCallback } = require('grammy');
const bot = require('./index');
const config = require('./config/config');
const logger = require('./utils/logger');

// Create Express app
const app = express();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Telegram Security Bot is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        environment: process.env.NODE_ENV || 'development',
        botToken: config.BOT_TOKEN ? 'configured' : 'missing',
        webhookMode: config.USE_WEBHOOKS
    };
    
    res.json(healthCheck);
});

// Webhook endpoint for Telegram
app.post(`/webhook/${config.BOT_TOKEN}`, webhookCallback(bot, 'express'));

// Set webhook endpoint
app.post('/setWebhook', async (req, res) => {
    try {
        const webhookUrl = `${config.WEBHOOK_URL}/webhook/${config.BOT_TOKEN}`;
        await bot.api.setWebhook(webhookUrl, {
            drop_pending_updates: true,
            allowed_updates: [
                'message',
                'edited_message',
                'channel_post',
                'edited_channel_post',
                'chat_member',
                'my_chat_member'
            ]
        });
        
        logger.info(`Webhook set to: ${webhookUrl}`);
        res.json({ success: true, webhook_url: webhookUrl });
    } catch (error) {
        logger.error('Failed to set webhook:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete webhook endpoint
app.post('/deleteWebhook', async (req, res) => {
    try {
        await bot.api.deleteWebhook({ drop_pending_updates: true });
        logger.info('Webhook deleted');
        res.json({ success: true, message: 'Webhook deleted' });
    } catch (error) {
        logger.error('Failed to delete webhook:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get webhook info
app.get('/webhookInfo', async (req, res) => {
    try {
        const info = await bot.api.getWebhookInfo();
        res.json(info);
    } catch (error) {
        logger.error('Failed to get webhook info:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bot information endpoint
app.get('/botInfo', async (req, res) => {
    try {
        const me = await bot.api.getMe();
        const database = require('./storage/database');
        const stats = database.getBotStats();
        
        res.json({
            bot: me,
            stats: stats,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to get bot info:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Statistics endpoint
app.get('/stats', (req, res) => {
    try {
        const database = require('./storage/database');
        const stats = database.getBotStats();
        
        res.json({
            ...stats,
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                platform: process.platform,
                nodeVersion: process.version
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to get stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Logs endpoint (for debugging - should be secured in production)
app.get('/logs', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const logFile = path.join(__dirname, 'logs', `bot_${new Date().toISOString().split('T')[0]}.log`);
        
        if (fs.existsSync(logFile)) {
            const logs = fs.readFileSync(logFile, 'utf8');
            const lines = logs.split('\n').slice(-100); // Last 100 lines
            
            res.json({
                success: true,
                logs: lines,
                file: logFile,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                success: true,
                logs: [],
                message: 'No log file found for today',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        logger.error('Failed to read logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    logger.error('Express error:', error);
    res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = config.PORT;
const server = app.listen(PORT, '0.0.0.0', async () => {
    logger.info(`Server started on port ${PORT}`);
    
    // If using webhooks, set the webhook
    if (config.USE_WEBHOOKS && config.WEBHOOK_URL && config.BOT_TOKEN) {
        try {
            const webhookUrl = `${config.WEBHOOK_URL}/webhook/${config.BOT_TOKEN}`;
            await bot.api.setWebhook(webhookUrl, {
                drop_pending_updates: true,
                allowed_updates: [
                    'message',
                    'edited_message',
                    'channel_post',
                    'edited_channel_post',
                    'chat_member',
                    'my_chat_member'
                ]
            });
            logger.info(`Webhook automatically set to: ${webhookUrl}`);
        } catch (error) {
            logger.error('Failed to automatically set webhook:', error);
        }
    } else {
        logger.info('Server started in polling mode (webhooks disabled)');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = app;
