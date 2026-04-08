const express = require('express');
const router = express.Router();
const prisma = require('../db');
const cache = require('../services/cacheService');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { validate, eventsQuerySchema, upcomingQuerySchema, paginationSchema } = require('../middleware/validate');
const { searchLimiter } = require('../middleware/rateLimiter');
const { serializeEvent } = require('../utils/normalizer');
const config = require('../config');

// ─── Helpers ────────────────────────────────────────────────────────────────

let _catCache = null;
let _catCacheTs = 0;

/** Returns { catMap, subMap } — cached in-process for 60s */
async function getCategoryMaps() {
  if (_catCache && Date.now() - _catCacheTs < 60_000) return _catCache;

  const cats = await prisma.category.findMany({ include: { subcategories: true } });
  const catMap = {};
  const subMap = {};

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

async function serializeRows(rows) {
  const { catMap, subMap } = await getCategoryMaps();
  return rows.map((row) => {
    const cat = catMap[row.categoryId] || { name: row.categoryId, icon: '📌' };
    const sub = subMap[row.subcategoryId] || { name: row.subcategoryId, icon: '📌' };
    return serializeEvent(row, cat.name, cat.icon, sub.name, sub.icon);
  });
}

function paginate(data, total, page, limit) {
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

// Build Prisma where clause from validated query params
function buildWhere({ category, subcategory, date, search }) {
  const where = {};
  if (category) where.categoryId = category;
  if (subcategory) where.subcategoryId = subcategory;
  if (date) where.date = date;
  if (search) {
    // SQLite: contains is case-insensitive. PostgreSQL: add mode:'insensitive'
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { venue: { contains: search } },
      { location: { contains: search } },
      { tags: { contains: search } },
    ];
  }
  return where;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/events — filterable, searchable, paginated
router.get(
  '/',
  searchLimiter,
  validate(eventsQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit, ...filters } = req.query;
    const skip = (page - 1) * limit;
    const where = buildWhere(filters);

    const cacheKey = `events:list:${JSON.stringify({ where, page, limit })}`;
    const { data: result, fromCache } = await cache.getOrFetch(
      cacheKey,
      config.cache.eventsList,
      async () => {
        // If a specific date is requested, use exact match — skip the upcoming/past split
        // (the split overwrites where.date with { gte } / { lt }, losing the date filter)
        if (filters.date) {
          const [rows, total] = await Promise.all([
            prisma.cachedEvent.findMany({
              where,
              skip,
              take: limit,
              orderBy: [{ time: 'asc' }],
            }),
            prisma.cachedEvent.count({ where }),
          ]);
          const data = await serializeRows(rows);
          return paginate(data, total, page, limit);
        }

        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        // Upcoming events first (asc), then past events (desc), both sorted by time within date
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
        const data = await serializeRows(rows);
        return paginate(data, total, page, limit);
      }
    );

    res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
    res.json(result);
  })
);

// GET /api/events/live — events happening right now
router.get(
  '/live',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const istTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    const [hh, mm] = istTime.split(':');
    const currentTime = `${hh}:${mm}`;
    const rows = await prisma.cachedEvent.findMany({
      where: {
        date: today,
        time: { lte: currentTime },
        tags: { contains: 'live' },
      },
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
    const { page, limit } = req.query;
    const skip = (page - 1) * limit;
    // Use IST (Asia/Kolkata) date so Indian users see correct "today"
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

        // Fallback: no events today → return next available date's events
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
            const fallbackTotal = await prisma.cachedEvent.count({ where: { date: next.date } });
            const data = await serializeRows(rows);
            return { ...paginate(data, fallbackTotal, page, limit), fallbackDate: next.date };
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

// GET /api/events/upcoming — next 30 days, optionally filtered by category IDs
router.get(
  '/upcoming',
  validate(upcomingQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, limit, cats } = req.query;
    const skip = (page - 1) * limit;

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const futureStr = future.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const where = { date: { gte: today, lte: futureStr } };

    if (cats) {
      const catList = cats
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 20); // cap to prevent abuse
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

// GET /api/events/:id — single event by externalId
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await prisma.cachedEvent.findUnique({
      where: { externalId: req.params.id },
    });

    if (!row) throw new NotFoundError(`Event "${req.params.id}" not found`);

    const [serialized] = await serializeRows([row]);
    res.json(serialized);
  })
);

module.exports = router;
