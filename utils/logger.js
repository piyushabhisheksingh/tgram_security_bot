const fs = require('fs');
const path = require('path');
const config = require('../config/config');

class Logger {
    constructor() {
        this.logLevels = {
            'error': 0,
            'warn': 1,
            'info': 2,
            'debug': 3
        };
        
        this.currentLevel = this.logLevels[config.LOG_LEVEL] || this.logLevels['info'];
        this.logDir = path.join(__dirname, '../logs');
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        
        this.logFile = path.join(this.logDir, `bot_${new Date().toISOString().split('T')[0]}.log`);
    }
    
    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        if (data) {
            if (data instanceof Error) {
                logMessage += `\nError: ${data.message}\nStack: ${data.stack}`;
            } else if (typeof data === 'object') {
                logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
            } else {
                logMessage += `\nData: ${data}`;
            }
        }
        
        return logMessage;
    }
    
    writeToFile(message) {
        try {
            fs.appendFileSync(this.logFile, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    
    log(level, message, data = null) {
        if (this.logLevels[level] <= this.currentLevel) {
            const formattedMessage = this.formatMessage(level, message, data);
            
            // Console output with colors
            switch (level) {
                case 'error':
                    console.error('\x1b[31m%s\x1b[0m', formattedMessage);
                    break;
                case 'warn':
                    console.warn('\x1b[33m%s\x1b[0m', formattedMessage);
                    break;
                case 'info':
                    console.info('\x1b[36m%s\x1b[0m', formattedMessage);
                    break;
                case 'debug':
                    console.debug('\x1b[37m%s\x1b[0m', formattedMessage);
                    break;
                default:
                    console.log(formattedMessage);
            }
            
            // Write to file
            this.writeToFile(formattedMessage);
        }
    }
    
    error(message, data = null) {
        this.log('error', message, data);
    }
    
    warn(message, data = null) {
        this.log('warn', message, data);
    }
    
    info(message, data = null) {
        this.log('info', message, data);
    }
    
    debug(message, data = null) {
        this.log('debug', message, data);
    }
    
    // Cleanup old log files (keep last 7 days)
    cleanup() {
        try {
            const files = fs.readdirSync(this.logDir);
            const now = Date.now();
            const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
            
            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime.getTime() < weekAgo) {
                    fs.unlinkSync(filePath);
                    this.info(`Deleted old log file: ${file}`);
                }
            });
        } catch (error) {
            this.error('Failed to cleanup log files:', error);
        }
    }
}

// Cleanup logs weekly
const logger = new Logger();
setInterval(() => {
    logger.cleanup();
}, 7 * 24 * 60 * 60 * 1000); // Weekly cleanup

module.exports = logger;
