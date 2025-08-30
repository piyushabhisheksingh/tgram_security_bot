const config = require('../config/config');
const logger = require('../utils/logger');

async function adminMiddleware(ctx, next) {
    try {
        // Add admin check utilities to context
        ctx.isOwner = () => {
            return ctx.from?.id.toString() === config.BOT_OWNER_ID;
        };
        
        ctx.isBotAdmin = () => {
            return config.BOT_ADMINS.includes(ctx.from?.id.toString());
        };
        
        ctx.isGroupAdmin = async () => {
            if (ctx.chat?.type === 'private') return false;
            
            try {
                const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
                return member.status === 'administrator' || member.status === 'creator';
            } catch (error) {
                logger.warn(`Could not check admin status: ${error.message}`);
                return false;
            }
        };
        
        ctx.hasAdminRights = async (rights = []) => {
            if (ctx.chat?.type === 'private') return false;
            
            try {
                const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
                
                if (member.status === 'creator') return true;
                if (member.status !== 'administrator') return false;
                
                // Check specific rights
                for (const right of rights) {
                    if (!member[right]) return false;
                }
                
                return true;
            } catch (error) {
                logger.warn(`Could not check admin rights: ${error.message}`);
                return false;
            }
        };
        
        await next();
    } catch (error) {
        logger.error('Admin middleware error:', error);
        await next();
    }
}

module.exports = adminMiddleware;
