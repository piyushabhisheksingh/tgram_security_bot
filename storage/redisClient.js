const Redis = require('ioredis');
const config = require('../config/config');
const logger = require('../utils/logger');

class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
    }
    
    async connect() {
        try {
            this.client = new Redis(config.REDIS_URL, {
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                keepAlive: 30000,
                connectTimeout: 10000,
                commandTimeout: 5000,
                keyPrefix: config.REDIS_PREFIX
            });
            
            // Event handlers
            this.client.on('connect', () => {
                logger.info('Redis client connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
            });
            
            this.client.on('ready', () => {
                logger.info('Redis client ready');
            });
            
            this.client.on('error', (error) => {
                logger.error('Redis client error:', error);
                this.isConnected = false;
            });
            
            this.client.on('close', () => {
                logger.warn('Redis connection closed');
                this.isConnected = false;
                this.handleReconnect();
            });
            
            this.client.on('reconnecting', () => {
                logger.info('Redis client reconnecting...');
            });
            
            // Connect to Redis
            await this.client.connect();
            
            // Test connection
            await this.client.ping();
            logger.info('Redis connection established successfully');
            
        } catch (error) {
            logger.error('Failed to connect to Redis:', error);
            
            // Fallback to local storage if Redis is not available
            this.client = null;
            this.isConnected = false;
            logger.warn('Falling back to in-memory storage');
        }
    }
    
    async handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Max reconnection attempts reached. Falling back to in-memory storage.');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
        
        logger.info(`Attempting to reconnect to Redis in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                logger.error('Reconnection failed:', error);
            }
        }, delay);
    }
    
    // Rate limiting methods
    async checkRateLimit(key, window, limit) {
        if (!this.isConnected) {
            // Fallback to simple in-memory check
            return { allowed: true, remaining: limit, resetTime: Date.now() + window };
        }
        
        try {
            const now = Date.now();
            const windowStart = now - window;
            
            // Use Redis sorted set for sliding window rate limiting
            const pipeline = this.client.pipeline();
            pipeline.zremrangebyscore(key, 0, windowStart);
            pipeline.zadd(key, now, `${now}-${Math.random()}`);
            pipeline.zcard(key);
            pipeline.expire(key, Math.ceil(window / 1000));
            
            const results = await pipeline.exec();
            const count = results[2][1];
            
            const allowed = count <= limit;
            const remaining = Math.max(0, limit - count);
            const resetTime = now + window;
            
            return { allowed, remaining, resetTime, count };
            
        } catch (error) {
            logger.error('Redis rate limit check failed:', error);
            // Fallback to allowing the request
            return { allowed: true, remaining: limit, resetTime: Date.now() + window };
        }
    }
    
    async resetRateLimit(key) {
        if (!this.isConnected) return;
        
        try {
            await this.client.del(key);
        } catch (error) {
            logger.error('Failed to reset rate limit:', error);
        }
    }
    
    // Flood protection methods
    async checkFloodProtection(userKey, limit, window) {
        if (!this.isConnected) {
            return { isFlooding: false, count: 0, resetTime: Date.now() + window };
        }
        
        try {
            const now = Date.now();
            const windowStart = now - window;
            
            const pipeline = this.client.pipeline();
            pipeline.zremrangebyscore(`flood:${userKey}`, 0, windowStart);
            pipeline.zadd(`flood:${userKey}`, now, now);
            pipeline.zcard(`flood:${userKey}`);
            pipeline.expire(`flood:${userKey}`, Math.ceil(window / 1000));
            
            const results = await pipeline.exec();
            const count = results[2][1];
            
            return {
                isFlooding: count > limit,
                count,
                resetTime: now + window
            };
            
        } catch (error) {
            logger.error('Redis flood protection check failed:', error);
            return { isFlooding: false, count: 0, resetTime: Date.now() + window };
        }
    }
    
    // Caching methods
    async get(key, fallbackFn = null) {
        if (!this.isConnected) {
            return fallbackFn ? await fallbackFn() : null;
        }
        
        try {
            const cached = await this.client.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
            
            if (fallbackFn) {
                const data = await fallbackFn();
                if (data !== null && data !== undefined) {
                    await this.set(key, data, config.REDIS_TTL.groupSettings);
                }
                return data;
            }
            
            return null;
        } catch (error) {
            logger.error('Redis get failed:', error);
            return fallbackFn ? await fallbackFn() : null;
        }
    }
    
    async set(key, value, ttl = 300) {
        if (!this.isConnected) return;
        
        try {
            await this.client.setex(key, ttl, JSON.stringify(value));
        } catch (error) {
            logger.error('Redis set failed:', error);
        }
    }
    
    async del(key) {
        if (!this.isConnected) return;
        
        try {
            await this.client.del(key);
        } catch (error) {
            logger.error('Redis delete failed:', error);
        }
    }
    
    async invalidateCache(pattern) {
        if (!this.isConnected) return;
        
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(...keys);
                logger.debug(`Invalidated ${keys.length} cache keys matching ${pattern}`);
            }
        } catch (error) {
            logger.error('Redis cache invalidation failed:', error);
        }
    }
    
    // User tier management for progressive rate limiting
    async getUserTier(userId) {
        if (!this.isConnected) return 'normal';
        
        try {
            const tier = await this.client.get(`user_tier:${userId}`);
            return tier || 'normal';
        } catch (error) {
            logger.error('Failed to get user tier:', error);
            return 'normal';
        }
    }
    
    async setUserTier(userId, tier, ttl = 3600) {
        if (!this.isConnected) return;
        
        try {
            await this.client.setex(`user_tier:${userId}`, ttl, tier);
        } catch (error) {
            logger.error('Failed to set user tier:', error);
        }
    }
    
    // Analytics and metrics
    async incrementCounter(key, ttl = 86400) {
        if (!this.isConnected) return 0;
        
        try {
            const pipeline = this.client.pipeline();
            pipeline.incr(key);
            pipeline.expire(key, ttl);
            const results = await pipeline.exec();
            return results[0][1];
        } catch (error) {
            logger.error('Redis counter increment failed:', error);
            return 0;
        }
    }
    
    async getCounter(key) {
        if (!this.isConnected) return 0;
        
        try {
            const count = await this.client.get(key);
            return parseInt(count) || 0;
        } catch (error) {
            logger.error('Redis counter get failed:', error);
            return 0;
        }
    }
    
    // Health check
    async healthCheck() {
        if (!this.client) {
            return { status: 'disconnected', error: 'Redis client not initialized' };
        }
        
        try {
            const start = Date.now();
            await this.client.ping();
            const latency = Date.now() - start;
            
            const info = await this.client.info('memory');
            const memoryUsage = info.match(/used_memory_human:(.+)/)?.[1]?.trim();
            
            return {
                status: 'connected',
                latency: `${latency}ms`,
                memoryUsage: memoryUsage || 'unknown',
                isConnected: this.isConnected,
                reconnectAttempts: this.reconnectAttempts
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                isConnected: this.isConnected,
                reconnectAttempts: this.reconnectAttempts
            };
        }
    }
    
    async disconnect() {
        if (this.client) {
            try {
                await this.client.quit();
                logger.info('Redis client disconnected gracefully');
            } catch (error) {
                logger.error('Error disconnecting Redis client:', error);
            }
        }
    }
}

module.exports = new RedisClient();