const config = require('../config/config');
const logger = require('./logger');

async function checkBotPermissions(ctx) {
    if (ctx.chat?.type === 'private') {
        return { hasPermissions: true, missingPermissions: [] };
    }
    
    try {
        const botMember = await ctx.api.getChatMember(ctx.chat.id, ctx.me.id);
        const requiredPermissions = [
            'can_delete_messages',
            'can_restrict_members',
            'can_promote_members'
        ];
        
        const missingPermissions = [];
        
        if (botMember.status !== 'administrator') {
            return {
                hasPermissions: false,
                missingPermissions: ['Bot needs to be an administrator']
            };
        }
        
        for (const permission of requiredPermissions) {
            if (!botMember[permission]) {
                missingPermissions.push(permission);
            }
        }
        
        return {
            hasPermissions: missingPermissions.length === 0,
            missingPermissions
        };
    } catch (error) {
        logger.error('Error checking bot permissions:', error);
        return {
            hasPermissions: false,
            missingPermissions: ['Unable to check permissions']
        };
    }
}

async function isUserAdmin(ctx, userId) {
    if (ctx.chat?.type === 'private') return false;
    
    try {
        const member = await ctx.api.getChatMember(ctx.chat.id, userId);
        return member.status === 'administrator' || member.status === 'creator';
    } catch (error) {
        logger.warn(`Could not check admin status for user ${userId}:`, error.message);
        return false;
    }
}

async function hasAdminRights(ctx, userId, rights = []) {
    if (ctx.chat?.type === 'private') return false;
    
    try {
        const member = await ctx.api.getChatMember(ctx.chat.id, userId);
        
        if (member.status === 'creator') return true;
        if (member.status !== 'administrator') return false;
        
        // Check specific rights
        for (const right of rights) {
            if (!member[right]) return false;
        }
        
        return true;
    } catch (error) {
        logger.warn(`Could not check admin rights for user ${userId}:`, error.message);
        return false;
    }
}

function isBotOwner(userId) {
    return userId.toString() === config.BOT_OWNER_ID;
}

function isBotAdmin(userId) {
    return config.BOT_ADMINS.includes(userId.toString());
}

function isExemptUser(userId) {
    return isBotOwner(userId) || isBotAdmin(userId);
}

async function canModerateUser(ctx, adminId, targetId) {
    if (adminId === targetId) return false;
    
    // Bot owner can moderate anyone
    if (isBotOwner(adminId)) return true;
    
    // Bot admins can moderate non-owners
    if (isBotAdmin(adminId) && !isBotOwner(targetId)) return true;
    
    // In groups, check admin hierarchy
    if (ctx.chat?.type !== 'private') {
        try {
            const adminMember = await ctx.api.getChatMember(ctx.chat.id, adminId);
            const targetMember = await ctx.api.getChatMember(ctx.chat.id, targetId);
            
            // Creator can moderate administrators
            if (adminMember.status === 'creator' && targetMember.status === 'administrator') {
                return true;
            }
            
            // Administrators cannot moderate other administrators or creator
            if (adminMember.status === 'administrator' && 
                (targetMember.status === 'administrator' || targetMember.status === 'creator')) {
                return false;
            }
            
            // Admins can moderate regular members
            if ((adminMember.status === 'administrator' || adminMember.status === 'creator') &&
                targetMember.status === 'member') {
                return true;
            }
        } catch (error) {
            logger.warn('Error checking moderation permissions:', error.message);
            return false;
        }
    }
    
    return false;
}

async function validateBotSetup(ctx) {
    const issues = [];
    
    // Check if bot is in a group
    if (ctx.chat?.type === 'private') {
        return { isValid: true, issues: [] };
    }
    
    try {
        // Check bot permissions
        const permissionCheck = await checkBotPermissions(ctx);
        if (!permissionCheck.hasPermissions) {
            issues.push({
                type: 'permissions',
                message: 'Missing required permissions',
                details: permissionCheck.missingPermissions
            });
        }
        
        // Check if there are any admins
        const admins = await ctx.api.getChatAdministrators(ctx.chat.id);
        const humanAdmins = admins.filter(admin => !admin.user.is_bot);
        
        if (humanAdmins.length === 0) {
            issues.push({
                type: 'no_admins',
                message: 'No human administrators found',
                details: 'Bot requires at least one human admin to function properly'
            });
        }
        
        return {
            isValid: issues.length === 0,
            issues
        };
    } catch (error) {
        logger.error('Error validating bot setup:', error);
        return {
            isValid: false,
            issues: [{
                type: 'error',
                message: 'Unable to validate bot setup',
                details: error.message
            }]
        };
    }
}

module.exports = {
    checkBotPermissions,
    isUserAdmin,
    hasAdminRights,
    isBotOwner,
    isBotAdmin,
    isExemptUser,
    canModerateUser,
    validateBotSetup
};
