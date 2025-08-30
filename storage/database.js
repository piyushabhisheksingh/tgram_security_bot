const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config/config');

class Database {
    constructor() {
        this.bot = null; // Will be set during initialization
        this.data = {
            groups: new Map(),
            users: new Map(),
            globalBans: new Map(),
            globalMutes: new Map(),
            botAdmins: new Set(config.BOT_ADMINS),
            stats: {
                messagesProcessed: 0,
                actionsTaken: 0,
                totalViolations: 0
            }
        };
        
        this.filePath = path.join(__dirname, '../data/database.json');
        this.lastBackup = Date.now();
    }
    
    async initialize(botInstance = null) {
        try {
            // Store bot instance for sending backup files
            if (botInstance) {
                this.bot = botInstance;
            }
            
            // Create data directory if it doesn't exist
            await fs.mkdir(path.dirname(this.filePath), { recursive: true });
            
            // Load existing data if available
            await this.loadFromFile();
            
            // Setup periodic backup
            this.startPeriodicBackup();
            
            logger.info('Database initialized successfully');
        } catch (error) {
            logger.error('Database initialization failed:', error);
            throw error;
        }
    }
    
    async loadFromFile() {
        try {
            const data = await fs.readFile(this.filePath, 'utf8');
            const parsedData = JSON.parse(data);
            
            // Convert arrays back to Maps and Sets
            this.data.groups = new Map(parsedData.groups || []);
            this.data.users = new Map(parsedData.users || []);
            this.data.globalBans = new Map(parsedData.globalBans || []);
            this.data.globalMutes = new Map(parsedData.globalMutes || []);
            this.data.botAdmins = new Set(parsedData.botAdmins || config.BOT_ADMINS);
            this.data.stats = parsedData.stats || {
                messagesProcessed: 0,
                actionsTaken: 0,
                totalViolations: 0
            };
            
            logger.info('Database loaded from file');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.warn('Failed to load database from file:', error.message);
            }
            // File doesn't exist or is corrupted, start with fresh data
        }
    }
    
    async saveToFile() {
        try {
            const dataToSave = {
                groups: Array.from(this.data.groups.entries()),
                users: Array.from(this.data.users.entries()),
                globalBans: Array.from(this.data.globalBans.entries()),
                globalMutes: Array.from(this.data.globalMutes.entries()),
                botAdmins: Array.from(this.data.botAdmins),
                stats: this.data.stats,
                lastBackup: Date.now()
            };
            
            await fs.writeFile(this.filePath, JSON.stringify(dataToSave, null, 2));
            logger.debug('Database saved to file');
        } catch (error) {
            logger.error('Failed to save database to file:', error);
        }
    }
    
    startPeriodicBackup() {
        setInterval(async () => {
            await this.saveToFile();
            await this.sendAutomaticBackup();
        }, config.DB_BACKUP_INTERVAL);
    }

    async sendAutomaticBackup() {
        try {
            // Only send backup if bot instance is available and owner ID is configured
            if (!this.bot || !config.BOT_OWNER_ID) {
                logger.debug('Skipping automatic backup file send - bot instance or owner ID not available');
                return;
            }

            const backupData = this.createBackup();
            const backupFile = Buffer.from(JSON.stringify(backupData, null, 2));
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `security_bot_auto_backup_${timestamp}.json`;

            // Send backup file to bot owner's DM
            await this.bot.api.sendDocument(config.BOT_OWNER_ID, {
                source: backupFile,
                filename: filename
            }, {
                caption: `🔄 **Automatic Database Backup**\n\n` +
                        `📅 **Time:** ${new Date().toLocaleString()}\n` +
                        `📊 **Groups:** ${this.data.groups.size}\n` +
                        `👥 **Users:** ${this.data.users.size}\n` +
                        `🚫 **Global Bans:** ${this.data.globalBans.size}\n` +
                        `🔇 **Global Mutes:** ${this.data.globalMutes.size}\n` +
                        `📈 **Total Violations:** ${this.data.stats.totalViolations}\n\n` +
                        `💾 This backup was created automatically every 24 hours.`,
                parse_mode: 'Markdown'
            });

            logger.info(`Automatic backup file sent to bot owner ${config.BOT_OWNER_ID}`);
        } catch (error) {
            logger.error('Failed to send automatic backup to owner:', error);
        }
    }
    
    // Group management
    initializeGroup(chatId) {
        if (!this.data.groups.has(chatId)) {
            this.data.groups.set(chatId, {
                id: chatId,
                settings: {
                    antiAbuse: {
                        enabled: true,
                        level: config.DEFAULT_MODERATION_LEVEL,
                        languages: ['hindi', 'english', 'hinglish']
                    },
                    antiCopyright: {
                        enabled: true,
                        characterLimit: config.DEFAULT_CHARACTER_LIMIT,
                        preventEdits: true
                    },
                    antiPromotion: {
                        enabled: false,
                        blockWebLinks: true,
                        blockTelegramLinks: true
                    },
                    reactions: {
                        enabled: config.DEFAULT_REACTIONS_ENABLED,
                        useCustomEmojis: false
                    },
                    whitelist: []
                },
                stats: {
                    messagesProcessed: 0,
                    violations: 0,
                    actionsTaken: 0,
                    messagesLast24h: 0,
                    violationsLast24h: 0,
                    actionsLast24h: 0
                },
                violations: [],
                joinedAt: Date.now()
            });
        }
    }
    
    getGroupSettings(chatId) {
        this.initializeGroup(chatId);
        return this.data.groups.get(chatId).settings;
    }
    
    getGroupStats(chatId) {
        this.initializeGroup(chatId);
        return this.data.groups.get(chatId).stats;
    }
    
    // Settings management
    toggleAntiAbuse(chatId, enabled = null) {
        this.initializeGroup(chatId);
        const group = this.data.groups.get(chatId);
        if (enabled !== null) {
            group.settings.antiAbuse.enabled = enabled;
        } else {
            group.settings.antiAbuse.enabled = !group.settings.antiAbuse.enabled;
        }
        this.saveToFile();
        return group.settings.antiAbuse.enabled;
    }
    
    toggleAntiCopyright(chatId, enabled = null) {
        this.initializeGroup(chatId);
        const group = this.data.groups.get(chatId);
        if (enabled !== null) {
            group.settings.antiCopyright.enabled = enabled;
        } else {
            group.settings.antiCopyright.enabled = !group.settings.antiCopyright.enabled;
        }
        this.saveToFile();
        return group.settings.antiCopyright.enabled;
    }
    
    toggleAntiPromotion(chatId, enabled = null) {
        this.initializeGroup(chatId);
        const group = this.data.groups.get(chatId);
        if (enabled !== null) {
            group.settings.antiPromotion.enabled = enabled;
        } else {
            group.settings.antiPromotion.enabled = !group.settings.antiPromotion.enabled;
        }
        this.saveToFile();
        return group.settings.antiPromotion.enabled;
    }
    
    setModerationLevel(chatId, level) {
        this.initializeGroup(chatId);
        const group = this.data.groups.get(chatId);
        group.settings.antiAbuse.level = level;
        this.saveToFile();
    }
    
    setCharacterLimit(chatId, limit) {
        this.initializeGroup(chatId);
        const group = this.data.groups.get(chatId);
        group.settings.antiCopyright.characterLimit = limit;
        this.saveToFile();
    }
    
    resetGroupSettings(chatId) {
        this.data.groups.delete(chatId);
        this.initializeGroup(chatId);
        this.saveToFile();
    }
    
    // Whitelist management
    addToWhitelist(chatId, userId) {
        this.initializeGroup(chatId);
        const group = this.data.groups.get(chatId);
        if (!group.settings.whitelist.includes(userId)) {
            group.settings.whitelist.push(userId);
            this.saveToFile();
        }
    }
    
    removeFromWhitelist(chatId, userId) {
        this.initializeGroup(chatId);
        const group = this.data.groups.get(chatId);
        const index = group.settings.whitelist.indexOf(userId);
        if (index > -1) {
            group.settings.whitelist.splice(index, 1);
            this.saveToFile();
        }
    }
    
    // Violation tracking
    recordViolation(chatId, userId, type, severity) {
        this.initializeGroup(chatId);
        const group = this.data.groups.get(chatId);
        
        const violation = {
            userId,
            type,
            severity,
            timestamp: Date.now()
        };
        
        group.violations.push(violation);
        group.stats.violations++;
        group.stats.violationsLast24h++;
        
        // Initialize user stats
        if (!this.data.users.has(userId)) {
            this.data.users.set(userId, {
                id: userId,
                stats: {
                    messagesSent: 0,
                    violations: 0,
                    abuseViolations: 0,
                    copyrightViolations: 0,
                    promotionViolations: 0,
                    groupsActiveIn: 0,
                    lastSeen: Date.now()
                }
            });
        }
        
        const user = this.data.users.get(userId);
        user.stats.violations++;
        user.stats.lastSeen = Date.now();
        
        // Increment specific violation type
        switch (type) {
            case 'abuse':
                user.stats.abuseViolations++;
                break;
            case 'character_limit':
            case 'edit_attempt':
                user.stats.copyrightViolations++;
                break;
            case 'promotion':
            case 'telegram_promotion':
                user.stats.promotionViolations++;
                break;
        }
        
        this.data.stats.totalViolations++;
        this.saveToFile();
    }
    
    getUserViolations(chatId, userId) {
        this.initializeGroup(chatId);
        const group = this.data.groups.get(chatId);
        return group.violations.filter(v => v.userId === userId);
    }
    
    getTopViolators(chatId, limit = 10) {
        this.initializeGroup(chatId);
        const group = this.data.groups.get(chatId);
        
        const violationCounts = {};
        group.violations.forEach(v => {
            violationCounts[v.userId] = (violationCounts[v.userId] || 0) + 1;
        });
        
        return Object.entries(violationCounts)
            .map(([userId, count]) => ({ userId: parseInt(userId), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
    
    // Global moderation
    addGlobalBan(userId, adminId, reason) {
        this.data.globalBans.set(userId, {
            userId,
            adminId,
            reason,
            timestamp: Date.now()
        });
        this.saveToFile();
    }
    
    removeGlobalBan(userId) {
        const existed = this.data.globalBans.has(userId);
        this.data.globalBans.delete(userId);
        if (existed) this.saveToFile();
        return existed;
    }
    
    isGloballyBanned(userId) {
        return this.data.globalBans.has(userId);
    }
    
    getGlobalBans() {
        return Array.from(this.data.globalBans.values());
    }
    
    addGlobalMute(userId, adminId, reason) {
        this.data.globalMutes.set(userId, {
            userId,
            adminId,
            reason,
            timestamp: Date.now()
        });
        this.saveToFile();
    }
    
    removeGlobalMute(userId) {
        const existed = this.data.globalMutes.has(userId);
        this.data.globalMutes.delete(userId);
        if (existed) this.saveToFile();
        return existed;
    }
    
    isGloballyMuted(userId) {
        return this.data.globalMutes.has(userId);
    }
    
    getGlobalMutes() {
        return Array.from(this.data.globalMutes.values());
    }
    
    // Bot admin management
    addBotAdmin(userId) {
        this.data.botAdmins.add(userId.toString());
        this.saveToFile();
    }
    
    removeBotAdmin(userId) {
        const existed = this.data.botAdmins.has(userId.toString());
        this.data.botAdmins.delete(userId.toString());
        if (existed) this.saveToFile();
        return existed;
    }
    
    getBotAdmins() {
        return Array.from(this.data.botAdmins).map(userId => ({
            userId,
            addedAt: Date.now() // This could be enhanced to track actual add dates
        }));
    }
    
    // Statistics
    incrementMessagesProcessed() {
        this.data.stats.messagesProcessed++;
        // Could add per-group tracking here
    }
    
    incrementActionsTaken() {
        this.data.stats.actionsTaken++;
        // Could add per-group tracking here
    }
    
    getBotStats() {
        return {
            totalGroups: this.data.groups.size,
            totalUsers: this.data.users.size,
            messagesProcessed: this.data.stats.messagesProcessed,
            actionsTaken: this.data.stats.actionsTaken,
            totalViolations: this.data.stats.totalViolations,
            globalBans: this.data.globalBans.size,
            globalMutes: this.data.globalMutes.size,
            botAdmins: this.data.botAdmins.size,
            // These could be enhanced with real tracking
            newGroupsLast24h: 0,
            messagesLast24h: 0,
            actionsLast24h: 0
        };
    }
    
    getUserStats(userId) {
        if (!this.data.users.has(userId)) {
            return {
                messagesSent: 0,
                violations: 0,
                abuseViolations: 0,
                copyrightViolations: 0,
                promotionViolations: 0,
                groupsActiveIn: 0,
                lastSeen: null
            };
        }
        
        return this.data.users.get(userId).stats;
    }
    
    // Backup functionality
    createBackup() {
        return {
            timestamp: Date.now(),
            version: '1.0.0',
            data: {
                groups: Array.from(this.data.groups.entries()),
                users: Array.from(this.data.users.entries()),
                globalBans: Array.from(this.data.globalBans.entries()),
                globalMutes: Array.from(this.data.globalMutes.entries()),
                botAdmins: Array.from(this.data.botAdmins),
                stats: this.data.stats
            }
        };
    }
}

module.exports = new Database();
