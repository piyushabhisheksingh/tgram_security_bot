const { Composer } = require('grammy');
const database = require('../storage/database');
const logger = require('../utils/logger');

const composer = new Composer();

// Group stats command
composer.command('groupstats', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.isGroupAdmin()) {
        return await ctx.reply('❌ Only group admins can view group statistics.');
    }
    
    try {
        const chatId = ctx.chat.id;
        const stats = database.getGroupStats(chatId);
        const settings = database.getGroupSettings(chatId);
        
        const statsMessage = `
📊 **Group Statistics**

👥 **Members:** ${await getGroupMemberCount(ctx)}
📨 **Messages Processed:** ${stats.messagesProcessed}
⚠️ **Violations:** ${stats.violations}
🛡️ **Actions Taken:** ${stats.actionsTaken}

🔧 **Current Settings:**
• Anti-Abuse: ${settings.antiAbuse.enabled ? '✅' : '❌'} (${settings.antiAbuse.level})
• Anti-Copyright: ${settings.antiCopyright.enabled ? '✅' : '❌'} (${settings.antiCopyright.characterLimit} chars)
• Anti-Promotion: ${settings.antiPromotion.enabled ? '✅' : '❌'}
• Whitelist: ${settings.whitelist ? settings.whitelist.length : 0} users

📈 **Recent Activity (24h):**
• Messages: ${stats.messagesLast24h || 0}
• Violations: ${stats.violationsLast24h || 0}
• Actions: ${stats.actionsLast24h || 0}
        `;
        
        await ctx.reply(statsMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        logger.error('Group stats command error:', error);
        await ctx.reply('❌ Failed to retrieve group statistics.');
    }
});

// User stats command
composer.command('userstats', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const stats = database.getUserStats(userId);
        
        const statsMessage = `
👤 **Your Statistics**

📨 **Messages Sent:** ${stats.messagesSent}
⚠️ **Violations:** ${stats.violations}
🏆 **Reputation Score:** ${calculateReputationScore(stats)}

📊 **Violation Breakdown:**
• Anti-Abuse: ${stats.abuseViolations || 0}
• Anti-Copyright: ${stats.copyrightViolations || 0}
• Anti-Promotion: ${stats.promotionViolations || 0}

📈 **Activity:**
• Groups Active In: ${stats.groupsActiveIn || 0}
• Last Seen: ${stats.lastSeen ? new Date(stats.lastSeen).toLocaleDateString() : 'Unknown'}
        `;
        
        await ctx.reply(statsMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        logger.error('User stats command error:', error);
        await ctx.reply('❌ Failed to retrieve user statistics.');
    }
});

// Bot stats command (for admins)
composer.command('botstats', async (ctx) => {
    if (!ctx.isOwner() && !ctx.isBotAdmin()) {
        return await ctx.reply('❌ Only bot owner and admins can view bot statistics.');
    }
    
    try {
        const stats = database.getBotStats();
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        const statsMessage = `
🤖 **Bot Statistics**

📊 **Overall Stats:**
• Total Groups: ${stats.totalGroups}
• Total Users: ${stats.totalUsers}
• Messages Processed: ${stats.messagesProcessed}
• Total Actions: ${stats.actionsTaken}

🛡️ **Security Stats:**
• Global Bans: ${stats.globalBans || 0}
• Global Mutes: ${stats.globalMutes || 0}
• Total Violations: ${stats.totalViolations}

⚡ **Performance:**
• Uptime: ${hours}h ${minutes}m
• Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
• CPU Usage: ${process.cpuUsage().user / 1000000}s

📈 **Recent Activity (24h):**
• New Groups: ${stats.newGroupsLast24h || 0}
• Messages: ${stats.messagesLast24h || 0}
• Actions: ${stats.actionsLast24h || 0}

🔧 **Configuration:**
• Bot Admins: ${stats.botAdmins || 0}
• Active Features: ${getActiveFeatures().length}
        `;
        
        await ctx.reply(statsMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        logger.error('Bot stats command error:', error);
        await ctx.reply('❌ Failed to retrieve bot statistics.');
    }
});

// Violations command - show user's violations in current group
composer.command('violations', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    try {
        const userId = ctx.from.id;
        const chatId = ctx.chat.id;
        const violations = database.getUserViolations(chatId, userId);
        
        if (violations.length === 0) {
            return await ctx.reply('✅ You have no violations in this group.');
        }
        
        const violationList = violations.slice(-10).map((violation, index) => {
            const date = new Date(violation.timestamp).toLocaleDateString();
            const typeEmoji = getViolationEmoji(violation.type);
            return `${typeEmoji} ${violation.type} (${violation.severity}) - ${date}`;
        }).join('\n');
        
        const violationsMessage = `
⚠️ **Your Violations in This Group**

📊 **Total:** ${violations.length}
📋 **Recent (last 10):**

${violationList}

💡 **Tip:** Follow group rules to maintain a clean record!
        `;
        
        await ctx.reply(violationsMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        logger.error('Violations command error:', error);
        await ctx.reply('❌ Failed to retrieve violations.');
    }
});

// Top violators command (for admins)
composer.command('topviolators', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        return await ctx.reply('❌ This command can only be used in groups.');
    }
    
    if (!await ctx.isGroupAdmin()) {
        return await ctx.reply('❌ Only group admins can view violator statistics.');
    }
    
    try {
        const chatId = ctx.chat.id;
        const topViolators = database.getTopViolators(chatId, 10);
        
        if (topViolators.length === 0) {
            return await ctx.reply('✅ No violations recorded in this group.');
        }
        
        const violatorList = topViolators.map((violator, index) => {
            return `${index + 1}. User ${violator.userId}: ${violator.count} violations`;
        }).join('\n');
        
        const violatorsMessage = `
📊 **Top Violators in This Group**

${violatorList}

💡 **Tip:** Consider adjusting moderation settings if violations are high.
        `;
        
        await ctx.reply(violatorsMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        logger.error('Top violators command error:', error);
        await ctx.reply('❌ Failed to retrieve violator statistics.');
    }
});

async function getGroupMemberCount(ctx) {
    try {
        const count = await ctx.api.getChatMemberCount(ctx.chat.id);
        return count;
    } catch (error) {
        return 'Unknown';
    }
}

function calculateReputationScore(stats) {
    const messages = stats.messagesSent || 0;
    const violations = stats.violations || 0;
    
    // Simple reputation calculation
    let score = Math.max(0, messages - (violations * 10));
    
    if (score >= 1000) return '🌟 Excellent';
    if (score >= 500) return '✨ Good';
    if (score >= 100) return '👍 Fair';
    if (score >= 50) return '😐 Poor';
    return '⚠️ Very Poor';
}

function getViolationEmoji(type) {
    switch (type) {
        case 'abuse': return '🤬';
        case 'character_limit': return '📏';
        case 'promotion': return '📢';
        case 'telegram_promotion': return '📱';
        case 'edit_attempt': return '✏️';
        default: return '⚠️';
    }
}

function getActiveFeatures() {
    return [
        'Anti-Abuse Detection',
        'Anti-Copyright Protection',
        'Anti-Promotion Control',
        'Global Moderation',
        'Statistics Tracking',
        'Whitelist Management'
    ];
}

module.exports = composer;
