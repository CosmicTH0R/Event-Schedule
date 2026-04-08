const config = require('../config');
const logger = require('../utils/logger');

/**
 * Thin cache wrapper over Redis, with transparent in-memory fallback.
 * Usage: cache.getOrFetch(key, ttlSeconds, fetchFn)
 */
class CacheService {
  constructor() {
    this.client = null;
    this.memCache = new Map(); // fallback when Redis is unavailable
    this._connect();
  }

  async _connect() {
    if (!config.redisUrl) {
      logger.info('Redis URL not set — using in-memory cache (single-instance only)');
      return;
    }
    try {
      const Redis = require('ioredis');
      this.client = new Redis(config.redisUrl, {
        lazyConnect: true,
        connectTimeout: 5000,
        maxRetriesPerRequest: 2,
      });
      await this.client.connect();
      logger.info('Redis connected');
    } catch (err) {
      logger.warn({ err: err.message }, 'Redis unavailable — falling back to in-memory cache');
      this.client = null;
    }
  }

  async get(key) {
    try {
      if (this.client) {
        const val = await this.client.get(key);
        return val ? JSON.parse(val) : null;
      }
      const entry = this.memCache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.exp) { this.memCache.delete(key); return null; }
      return entry.val;
    } catch (err) {
      logger.warn({ err: err.message, key }, 'Cache get failed');
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    try {
      const payload = JSON.stringify(value);
      if (this.client) {
        await this.client.setex(key, ttlSeconds, payload);
      } else {
        this.memCache.set(key, { val: value, exp: Date.now() + ttlSeconds * 1000 });
        // Prevent unbounded memory growth — evict oldest entries over 500
        if (this.memCache.size > 500) {
          const firstKey = this.memCache.keys().next().value;
          this.memCache.delete(firstKey);
        }
      }
    } catch (err) {
      logger.warn({ err: err.message, key }, 'Cache set failed');
    }
  }

  async del(key) {
    try {
      if (this.client) { await this.client.del(key); }
      else { this.memCache.delete(key); }
    } catch (err) {
      logger.warn({ err: err.message, key }, 'Cache del failed');
    }
  }

  /**
   * Cache-aside: return cached value or call fetchFn, cache and return result.
   * Returns { data, fromCache }
   */
  async getOrFetch(key, ttlSeconds, fetchFn) {
    const cached = await this.get(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }
    const data = await fetchFn();
    await this.set(key, data, ttlSeconds);
    return { data, fromCache: false };
  }

  async isHealthy() {
    try {
      if (this.client) { await this.client.ping(); }
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new CacheService();
