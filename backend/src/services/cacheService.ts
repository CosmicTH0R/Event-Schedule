import config from '../config';
import logger from '../utils/logger';

interface MemEntry {
  val: unknown;
  exp: number;
}

class CacheService {
  private client: import('ioredis').Redis | null = null;
  private memCache = new Map<string, MemEntry>();

  constructor() {
    this._connect();
  }

  private async _connect(): Promise<void> {
    if (!config.redisUrl) {
      logger.info('Redis URL not set — using in-memory cache (single-instance only)');
      return;
    }
    try {
      const { default: Redis } = await import('ioredis');
      this.client = new Redis(config.redisUrl, {
        lazyConnect: true,
        connectTimeout: 5000,
        maxRetriesPerRequest: 2,
      });
      await this.client.connect();
      logger.info('Redis connected');
    } catch (err) {
      logger.warn(
        { err: (err as Error).message },
        'Redis unavailable — falling back to in-memory cache'
      );
      this.client = null;
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      if (this.client) {
        const val = await this.client.get(key);
        return val ? (JSON.parse(val) as T) : null;
      }
      const entry = this.memCache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.exp) {
        this.memCache.delete(key);
        return null;
      }
      return entry.val as T;
    } catch (err) {
      logger.warn({ err: (err as Error).message, key }, 'Cache get failed');
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      const payload = JSON.stringify(value);
      if (this.client) {
        await this.client.setex(key, ttlSeconds, payload);
      } else {
        this.memCache.set(key, { val: value, exp: Date.now() + ttlSeconds * 1000 });
        if (this.memCache.size > 500) {
          const firstKey = this.memCache.keys().next().value!;
          this.memCache.delete(firstKey);
        }
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message, key }, 'Cache set failed');
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.client) {
        await this.client.del(key);
      } else {
        this.memCache.delete(key);
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message, key }, 'Cache del failed');
    }
  }

  async getOrFetch<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
  ): Promise<{ data: T; fromCache: boolean }> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }
    const data = await fetchFn();
    await this.set(key, data, ttlSeconds);
    return { data, fromCache: false };
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (this.client) await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}

export default new CacheService();
