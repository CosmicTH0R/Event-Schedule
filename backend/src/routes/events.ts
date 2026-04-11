import { Router } from 'express';
import prisma from '../db';
import cache from '../services/cacheService';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import {
  validate,
  eventsQuerySchema,
  upcomingQuerySchema,
  paginationSchema,
} from '../middleware/validate';
import { searchLimiter } from '../middleware/rateLimiter';
import { serializeEvent } from '../utils/normalizer';
import { addClient, removeClient } from '../services/liveService';
import config from '../config';
import type { CachedEvent } from '@prisma/client';
import type { CategoryMap, PaginatedResponse, SerializedEvent } from '../types';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _catCache: { catMap: CategoryMap; subMap: CategoryMap } | null = null;
let _catCacheTs = 0;

async function getCategoryMaps(): Promise<{ catMap: CategoryMap; subMap: CategoryMap }> {
  if (_catCache && Date.now() - _catCacheTs < 60_000) return _catCache;

  const cats = await prisma.category.findMany({ include: { subcategories: true } });
  const catMap: CategoryMap = {};
  const subMap: CategoryMap = {};

  for (const c of cats) {
    catMap[c.id] = { name: c.name, icon: c.icon };
    for (const s of c.subcategories) {
      subMap[s.id] = { name: s.name, icon: s.icon };
    }
  }

  _catCache = { catMap, subMap };
  _catCacheTs = Date.now();
  return _catCache;
}

async function serializeRows(rows: CachedEvent[]): Promise<SerializedEvent[]> {
  const { catMap, subMap } = await getCategoryMaps();
  return rows.map((row) => {
    const cat = catMap[row.categoryId] ?? { name: row.categoryId, icon: '📌' };
    const sub = subMap[row.subcategoryId] ?? { name: row.subcategoryId, icon: '📌' };
    return serializeEvent(row, cat.name, cat.icon, sub.name, sub.icon);
  });
}

function paginate(
  data: SerializedEvent[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<SerializedEvent> {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

function buildWhere(filters: {
  category?: string;
  subcategory?: string;
  date?: string;
  search?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters.category) where.categoryId = filters.category;
  if (filters.subcategory) where.subcategoryId = filters.subcategory;
  if (filters.date) where.date = filters.date;
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { description: { contains: filters.search } },
      { venue: { contains: filters.search } },
      { location: { contains: filters.search } },
      { tags: { has: filters.search } },
    ];
  }
  return where;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/events
router.get(
  '/',
  searchLimiter,
  validate(eventsQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit, category, subcategory, date, search } = req.query as unknown as {
      page: number;
      limit: number;
      category?: string;
      subcategory?: string;
      date?: string;
      search?: string;
    };
    const skip = (page - 1) * limit;
    const where = buildWhere({ category, subcategory, date, search });

    const cacheKey = `events:list:${JSON.stringify({ where, page, limit })}`;
    const { data: result, fromCache } = await cache.getOrFetch(
      cacheKey,
      config.cache.eventsList,
      async () => {
        if (date) {
          const [rows, total] = await Promise.all([
            prisma.cachedEvent.findMany({ where, skip, take: limit, orderBy: [{ time: 'asc' }] }),
            prisma.cachedEvent.count({ where }),
          ]);
          return paginate(await serializeRows(rows), total, page, limit);
        }

        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const [upcoming, past, total] = await Promise.all([
          prisma.cachedEvent.findMany({
            where: { ...where, date: { gte: today } },
            orderBy: [{ date: 'asc' }, { time: 'asc' }],
          }),
          prisma.cachedEvent.findMany({
            where: { ...where, date: { lt: today } },
            orderBy: [{ date: 'desc' }, { time: 'asc' }],
          }),
          prisma.cachedEvent.count({ where }),
        ]);
        const rows = [...upcoming, ...past].slice(skip, skip + limit);
        return paginate(await serializeRows(rows), total, page, limit);
      }
    );

    res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
    res.json(result);
  })
);

// GET /api/events/live/stream  — Server-Sent Events real-time feed
// Streams live cricket / football / F1 events to all connected clients.
// The client receives `event: live` messages whenever the live state changes.
router.get('/live/stream', (req, res) => {
  addClient(res);
  req.on('close', () => removeClient(res));
});

// GET /api/events/live  — REST fallback (kept for backward-compat / health checks)
router.get(
  '/live',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const istTime = now.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
    });
    const [hh, mm] = istTime.split(':');
    const currentTime = `${hh}:${mm}`;

    const rows = await prisma.cachedEvent.findMany({
      where: { date: today, time: { lte: currentTime }, tags: { has: 'live' } },
      orderBy: { time: 'asc' },
    });
    const data = await serializeRows(rows);
    res.json({ data });
  })
);

// GET /api/events/today
router.get(
  '/today',
  validate(paginationSchema),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const skip = (page - 1) * limit;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const cacheKey = `events:today:${today}:${page}:${limit}`;
    const { data: result, fromCache } = await cache.getOrFetch(
      cacheKey,
      config.cache.eventsList,
      async () => {
        const where = { date: today };
        let rows = await prisma.cachedEvent.findMany({
          where,
          skip,
          take: limit,
          orderBy: { time: 'asc' },
        });
        const total = await prisma.cachedEvent.count({ where });

        if (rows.length === 0 && page === 1) {
          const next = await prisma.cachedEvent.findFirst({
            where: { date: { gt: today } },
            orderBy: { date: 'asc' },
            select: { date: true },
          });
          if (next) {
            rows = await prisma.cachedEvent.findMany({
              where: { date: next.date },
              skip,
              take: limit,
              orderBy: { time: 'asc' },
            });
            const fallbackTotal = await prisma.cachedEvent.count({
              where: { date: next.date },
            });
            const data = await serializeRows(rows);
            return {
              ...paginate(data, fallbackTotal, page, limit),
              fallbackDate: next.date,
            };
          }
        }

        const data = await serializeRows(rows);
        return paginate(data, total, page, limit);
      }
    );

    res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
    res.json(result);
  })
);

// GET /api/events/upcoming
router.get(
  '/upcoming',
  validate(upcomingQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit, cats } = req.query as unknown as {
      page: number;
      limit: number;
      cats?: string;
    };
    const skip = (page - 1) * limit;

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const futureStr = future.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const where: Record<string, unknown> = { date: { gte: today, lte: futureStr } };

    if (cats) {
      const catList = cats.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 20);
      if (catList.length > 0) where.categoryId = { in: catList };
    }

    const cacheKey = `events:upcoming:${JSON.stringify({ where, page, limit })}`;
    const { data: result, fromCache } = await cache.getOrFetch(
      cacheKey,
      config.cache.eventsList,
      async () => {
        const [rows, total] = await Promise.all([
          prisma.cachedEvent.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ date: 'asc' }, { time: 'asc' }],
          }),
          prisma.cachedEvent.count({ where }),
        ]);
        const data = await serializeRows(rows);
        return paginate(data, total, page, limit);
      }
    );

    res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
    res.json(result);
  })
);

// GET /api/events/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await prisma.cachedEvent.findUnique({
      where: { externalId: String(req.params.id) },
    });

    if (!row) throw new NotFoundError(`Event "${req.params.id}" not found`);

    const [serialized] = await serializeRows([row]);
    res.json(serialized);
  })
);

export default router;
