/**
 * cacheService.test.ts — unit tests for the in-memory cache layer
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock ioredis before importing cacheService
vi.mock('ioredis', () => {
  const Redis = vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
    status: 'ready',
  }));
  return { default: Redis };
});

// Mock config to disable Redis (empty redisUrl forces in-memory)
vi.mock('../config', () => ({
  default: {
    redisUrl: '',
    isDev: true,
    nodeEnv: 'test',
    port: 3001,
    jwtSecret: 'test-secret',
    corsOrigins: ['http://localhost:3000'],
    databaseUrl: 'postgresql://localhost/test',
    apiKeys: { tmdb: '', football: '', cricket: '', rawg: '' },
    cache: { eventsList: 300, categories: 86400 },
    email: { host: '', port: 587, user: '', pass: '', from: '' },
    sentryDsn: '',
  },
}));

import cache from '../services/cacheService';

describe('cacheService (in-memory)', () => {
  beforeEach(() => {
    // Clear the internal map between tests via getOrFetch misses
  });

  it('returns a cache miss on first call and stores result', async () => {
    const fetcher = vi.fn().mockResolvedValue({ hello: 'world' });
    const { data, fromCache } = await cache.getOrFetch('test:key1', 60, fetcher);

    expect(fromCache).toBe(false);
    expect(data).toEqual({ hello: 'world' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('returns a cache hit on second call without re-fetching', async () => {
    const fetcher = vi.fn().mockResolvedValue({ hello: 'cached' });
    await cache.getOrFetch('test:key2', 60, fetcher);
    const { data, fromCache } = await cache.getOrFetch('test:key2', 60, fetcher);

    expect(fromCache).toBe(true);
    expect(data).toEqual({ hello: 'cached' });
    expect(fetcher).toHaveBeenCalledOnce(); // only called once across both invocations
  });

  it('respects TTL — calls fetcher again after expiry', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockResolvedValueOnce({ v: 2 });

    await cache.getOrFetch('test:key3', 1, fetcher); // 1 second TTL

    vi.advanceTimersByTime(1500); // 1.5 s later

    const { data, fromCache } = await cache.getOrFetch('test:key3', 1, fetcher);
    expect(fromCache).toBe(false);
    expect(data).toEqual({ v: 2 });
    vi.useRealTimers();
  });

  it('propagates fetcher errors', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('fetch failed'));
    await expect(cache.getOrFetch('test:key4', 60, fetcher)).rejects.toThrow('fetch failed');
  });
});
