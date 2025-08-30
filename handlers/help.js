const { Composer } = require('grammy');
const config = require('../config/config');

const composer = new Composer();

composer.command('help', async (ctx) => {
    const isPrivate = ctx.chat?.type === 'private';
    const isOwner = ctx.isOwner();
    const isBotAdmin = ctx.isBotAdmin();
    const isGroupAdmin = await ctx.isGroupAdmin();
    
    let helpMessage = `
🛡️ **Security Bot Help**

**🔰 Basic Commands (Everyone):**
• \`/start\` - Welcome message and bot info
• \`/help\` - Show this help message
• \`/userstats\` - View your personal statistics
• \`/violations\` - View your violations (groups only)
• \`/botinfo\` - Bot information and uptime

**📊 Features:**
🛡️ **Anti-Abuse** - Detects and removes inappropriate content
📏 **Anti-Copyright** - Enforces character limits and prevents edits  
🚫 **Anti-Promotion** - Blocks unwanted links and promotion
👥 **Whitelist** - Exempt trusted users from restrictions
📈 **Statistics** - Track group and user activity
🌐 **Global Moderation** - Cross-group moderation system
    `;
    
    if (!isPrivate && isGroupAdmin) {
        helpMessage += `

**👑 Group Admin Commands:**
• \`/settings\` - View current group settings
• \`/settoggle <feature>\` - Enable/disable features
• \`/setlevel <level>\` - Set moderation level (no/weak/moderate/strong/strict)
• \`/setcharlimit <number>\` - Set character limit (10-4000)
• \`/quicksetup\` - Quick setup with recommended settings
• \`/resetsettings\` - Reset all settings to defaults

**🔨 Moderation Commands:**
• \`/ban <user>\` - Ban a user
• \`/unban <user_id>\` - Unban a user
• \`/mute <user> [duration]\` - Mute a user (e.g., 30m, 2h, 1d)
• \`/unmute <user>\` - Unmute a user  
• \`/kick <user>\` - Kick a user

**👥 Whitelist Management:**
• \`/whitelist\` - View whitelist
• \`/whitelist add <user>\` - Add user to whitelist
• \`/whitelist remove <user>\` - Remove user from whitelist

**📊 Statistics:**
• \`/groupstats\` - View group statistics
• \`/topviolators\` - View top violators in group
        `;
    }
    
    if (isOwner || isBotAdmin) {
        helpMessage += `

**🌐 Global Commands (Bot Admins):**
• \`/gban <user_id> [reason]\` - Globally ban user
• \`/gunban <user_id>\` - Remove global ban
• \`/gmute <user_id> [reason]\` - Globally mute user
• \`/gunmute <user_id>\` - Remove global mute
• \`/gbanlist\` - View global ban list
• \`/gmutelist\` - View global mute list
• \`/botstats\` - View bot statistics
• \`/adminlist\` - View bot admin list
        `;
    }
    
    if (isOwner) {
        helpMessage += `

**👑 Owner Commands:**
• \`/addadmin <user_id>\` - Add bot admin
• \`/removeadmin <user_id>\` - Remove bot admin
• \`/backup\` - Create database backup
        `;
    }
    
    helpMessage += `

**🔧 Moderation Levels:**
• **No** - No automatic actions
• **Weak** - Warnings only
• **Moderate** - Warnings + message deletion
• **Strong** - Warnings + deletion + temporary mutes
• **Strict** - All actions including bans

**⚙️ Features Explained:**

🛡️ **Anti-Abuse Protection:**
Detects inappropriate content in messages, captions, and user bios using advanced filtering for Hindi, English, and Hinglish. Actions taken depend on moderation level.

📏 **Anti-Copyright Protection:**
Enforces character limits to prevent long copyrighted content. Also prevents message editing to maintain content integrity.

🚫 **Anti-Promotion Protection:**
Blocks unwanted promotional content including web links and Telegram links/channels. Helps maintain group focus.

👥 **Whitelist System:**
Allows exempting trusted users from all automatic moderation actions. Group admins with ban rights can manage the whitelist.

**📝 Usage Tips:**
• Reply to a user's message when using moderation commands
• Use user IDs for more reliable targeting
• Bot requires admin rights (ban/mute/promote) to function
• All features respect admin hierarchy and exemptions

**⚡ Rate Limits:**
• 3 messages per 2 seconds per user
• Flood protection: 5 messages per 10 seconds
• Violations result in temporary restrictions

**🆘 Need Help?**
Contact the bot owner: ${config.BOT_OWNER_ID}
    `;
    
    // Split message if too long
    const maxLength = 4000;
    if (helpMessage.length > maxLength) {
        const parts = [];
        let currentPart = '';
        const lines = helpMessage.split('\n');
        
        for (const line of lines) {
            if (currentPart.length + line.length > maxLength) {
                parts.push(currentPart);
                currentPart = line + '\n';
            } else {
                currentPart += line + '\n';
            }
        }
        if (currentPart) parts.push(currentPart);
        
        for (let i = 0; i < parts.length; i++) {
            const partNumber = parts.length > 1 ? ` (${i + 1}/${parts.length})` : '';
            await ctx.reply(parts[i] + partNumber, { parse_mode: 'Markdown' });
        }
    } else {
        await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    }
});

// Quick help for specific features
composer.command('helpabuse', async (ctx) => {
    const helpMessage = `
🛡️ **Anti-Abuse Help**

**What it does:**
Automatically detects and handles inappropriate content including profanity, hate speech, and abusive language in Hindi, English, and Hinglish.

**Moderation Levels:**
• **No** - Detection disabled
• **Weak** - Warnings only  
• **Moderate** - Warnings + message deletion
• **Strong** - Warnings + deletion + 30min mute
• **Strict** - Warnings + deletion + mute + potential ban

**Commands:**
• \`/settoggle antiabuse\` - Enable/disable
• \`/setlevel <level>\` - Change strictness

**Exemptions:**
• Bot owner and admins
• Group admins
• Whitelisted users (\`/whitelist add\`)
    `;
    
    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

composer.command('helpcopyright', async (ctx) => {
    const helpMessage = `
📏 **Anti-Copyright Help**

**What it does:**
Prevents sharing of long copyrighted content by enforcing character limits and blocking message edits.

**Features:**
• Character limit enforcement (default: 120)
• Message edit prevention
• Caption and bio checking

**Commands:**
• \`/settoggle anticopyright\` - Enable/disable
• \`/setcharlimit <number>\` - Set limit (10-4000)

**Actions:**
• Messages exceeding limit are deleted
• Edit attempts are blocked and deleted
• Users receive informative warnings

**Exemptions:**
• Bot owner and admins
• Group admins  
• Whitelisted users (\`/whitelist add\`)
    `;
    
    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

composer.command('helppromotion', async (ctx) => {
    const helpMessage = `
🚫 **Anti-Promotion Help**

**What it does:**
Blocks promotional content including web links and Telegram channel/group links to maintain group focus.

**Detection:**
• Web URLs (http/https)
• Telegram links (t.me, telegram.me)
• Channel/group invites
• Shortened URLs

**Commands:**
• \`/settoggle antipromotion\` - Enable/disable

**Actions:**
• Promotional messages are deleted
• Users receive warnings
• Repeated Telegram promotion → 1 hour mute

**Exemptions:**
• Bot owner and admins
• Group admins
• Whitelisted users (\`/whitelist add\`)
    `;
    
    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

module.exports = composer;
