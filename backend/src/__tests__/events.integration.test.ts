/**
 * events.integration.test.ts — supertest integration tests for /api/events
 *
 * All DB and Redis calls are mocked so tests run without any infrastructure.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// ── Infrastructure mocks (must come before importing the app) ──────────────

// Mock Sentry (imported first by server.ts)
vi.mock('../instrument', () => ({}));

// Mock the Sentry module itself
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('../db', () => ({
  default: {
    category: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'sports', name: 'Sports', icon: '🏆', sortOrder: 0,
          subcategories: [{ id: 'f1', name: 'Formula 1', icon: '🏎️', categoryId: 'sports', sortOrder: 0 }],
        },
      ]),
    },
    cachedEvent: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'cuid-1', externalId: 'evt-1', source: 'f1',
          categoryId: 'sports', subcategoryId: 'f1',
          title: 'Monaco GP', description: 'Race day',
          date: '2026-05-25', time: '14:00', endTime: '16:30',
          venue: 'Monaco', location: 'Monaco',
          imageUrl: 'https://example.com/img.jpg',
          tags: ['race'], status: 'upcoming',
          fetchedAt: new Date(), expiresAt: new Date('2026-05-27'),
        },
      ]),
      findUnique: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(1),
    },
    $disconnect: vi.fn(),
  },
}));

vi.mock('../services/cacheService', () => ({
  default: {
    getOrFetch: vi.fn().mockImplementation(async (_key: string, _ttl: number, fetcher: () => Promise<unknown>) => ({
      data: await fetcher(),
      fromCache: false,
    })),
    isHealthy: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../services/liveService', () => ({
  addClient: vi.fn(),
  removeClient: vi.fn(),
}));

vi.mock('../config', () => ({
  default: {
    redisUrl: '',
    isDev: true,
    nodeEnv: 'test',
    port: 3001,
    jwtSecret: 'test-secret',
    corsOrigins: ['http://localhost:3000'],
    databaseUrl: '',
    apiKeys: { tmdb: '', football: '', cricket: '', rawg: '' },
    cache: { eventsList: 300, categories: 86400 },
    email: { host: '', port: 587, user: '', pass: '', from: '' },
    sentryDsn: '',
  },
}));

// ── Import app after mocks ─────────────────────────────────────────────────

import app from '../server';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/events', () => {
  it('returns 200 with paginated data', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns correct event shape', async () => {
    const res = await request(app).get('/api/events');
    const event = res.body.data[0];
    expect(event).toHaveProperty('id', 'evt-1');
    expect(event).toHaveProperty('title', 'Monaco GP');
    expect(event).toHaveProperty('categoryName', 'Sports');
    expect(Array.isArray(event.tags)).toBe(true);
  });

  it('rejects invalid page param with 400', async () => {
    const res = await request(app).get('/api/events?page=abc');
    expect(res.status).toBe(400);
  });

  it('rejects oversized limit with 400', async () => {
    const res = await request(app).get('/api/events?limit=999');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/events/:id', () => {
  it('returns 404 when event not found', async () => {
    const res = await request(app).get('/api/events/nonexistent-id');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});
