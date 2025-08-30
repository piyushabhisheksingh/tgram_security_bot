const config = {
    // Bot configuration
    BOT_TOKEN: process.env.BOT_TOKEN || "your_bot_token_here",
    BOT_OWNER_ID: process.env.BOT_OWNER_ID || "1632101837",
    BOT_ADMINS: (process.env.BOT_ADMINS || "").split(",").filter(Boolean),

    // Server configuration
    PORT: process.env.PORT || 5000,
    USE_WEBHOOKS: process.env.USE_WEBHOOKS === "true",
    WEBHOOK_URL: process.env.WEBHOOK_URL || "https://yourdomain.com",

    // Feature defaults
    DEFAULT_MODERATION_LEVEL: "weak",
    DEFAULT_CHARACTER_LIMIT: 200,
    DEFAULT_REACTIONS_ENABLED: true,

    // Rate limiting
    RATE_LIMIT_WINDOW: 2000, // 2 seconds
    RATE_LIMIT_MAX: 3, // 3 messages per window
    RATE_LIMIT_REDIS_KEY_PREFIX: "rate_limit:",

    // Advanced rate limiting tiers
    RATE_LIMIT_TIERS: {
        normal: { window: 2000, max: 3 },
        suspicious: { window: 5000, max: 2 },
        restricted: { window: 10000, max: 1 },
    },

    // Flood protection
    FLOOD_LIMIT: 5, // messages
    FLOOD_WINDOW: 10000, // 10 seconds

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || "info",

    // Database
    DB_BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours

    // Redis configuration
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    REDIS_PREFIX: "tg_bot:",
    REDIS_TTL: {
        groupSettings: 300, // 5 minutes
        userPermissions: 180, // 3 minutes
        rateLimits: 60, // 1 minute
        floodProtection: 600, // 10 minutes
    },

    // Security levels
    MODERATION_LEVELS: {
        no: 0,
        weak: 1,
        moderate: 2,
        strong: 3,
        strict: 4,
    },

    // Actions based on moderation level
    MODERATION_ACTIONS: {
        0: [], // no action
        1: ["warn", "react"], // weak
        2: ["warn", "delete", "react"], // moderate
        3: ["warn", "delete", "mute", "react"], // strong
        4: ["warn", "delete", "mute", "ban", "react"], // strict
    },

    // Emoji reactions for different violation types
    REACTION_EMOJIS: {
        abuse: ["😡", "🤬", "❌", "⚠️"],
        copyright: ["📏", "❌", "⚠️", "🚫"],
        promotion: ["🚫", "❌", "📢", "⚠️"],
        spam: ["🗑️", "❌", "⚠️"],
        general: ["❌", "⚠️", "🚫"],
    },
};

module.exports = config;
