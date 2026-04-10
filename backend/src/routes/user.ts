/**
 * user.ts route — /api/user/*
 */
import { Router } from 'express';
import { z } from 'zod';

import prisma from '../db';
import { requireAuth } from '../middleware/auth';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
} from '../middleware/errorHandler';
import { serializeEvent } from '../utils/normalizer';
import type { CategoryMap } from '../types';

const router = Router();

router.use(requireAuth);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCategoryMaps(): Promise<{ catMap: CategoryMap; subMap: CategoryMap }> {
  const cats = await prisma.category.findMany({ include: { subcategories: true } });
  const catMap: CategoryMap = {};
  const subMap: CategoryMap = {};
  for (const c of cats) {
    catMap[c.id] = { name: c.name, icon: c.icon };
    for (const s of c.subcategories) subMap[s.id] = { name: s.name, icon: s.icon };
  }
  return { catMap, subMap };
}

// ─── PREFERENCES ─────────────────────────────────────────────────────────────

router.get(
  '/preferences',
  asyncHandler(async (req, res) => {
    const prefs = await prisma.userPreference.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(prefs);
  })
);

const prefsSchema = z.object({
  categories: z
    .array(
      z.object({
        categoryId: z.string(),
        subcategoryId: z.string().optional().nullable(),
      })
    )
    .max(50),
});

router.put(
  '/preferences',
  asyncHandler(async (req, res) => {
    const parsed = prefsSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid preferences format');

    const { categories } = parsed.data;
    const userId = req.user!.id;

    await prisma.$transaction([
      prisma.userPreference.deleteMany({ where: { userId } }),
      ...categories.map((cat) =>
        prisma.userPreference.create({
          data: {
            userId,
            categoryId: cat.categoryId,
            subcategoryId: cat.subcategoryId ?? null,
          },
        })
      ),
    ]);

    const prefs = await prisma.userPreference.findMany({ where: { userId } });
    res.json(prefs);
  })
);

// ─── BOOKMARKS ────────────────────────────────────────────────────────────────

router.get(
  '/bookmarks',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(50, parseInt(String(req.query.limit ?? '20'), 10));
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bookmark.count({ where: { userId: req.user!.id } }),
    ]);

    const eventIds = bookmarks.map((b) => b.eventId);
    const events = await prisma.cachedEvent.findMany({
      where: { externalId: { in: eventIds } },
    });

    const { catMap, subMap } = await getCategoryMaps();
    const eventMap = Object.fromEntries(events.map((e) => [e.externalId, e]));

    const data = bookmarks
      .map((b) => {
        const ev = eventMap[b.eventId];
        if (!ev) return null;
        const cat = catMap[ev.categoryId] ?? { name: ev.categoryId, icon: '📌' };
        const sub = subMap[ev.subcategoryId] ?? { name: ev.subcategoryId, icon: '📌' };
        return {
          bookmarkId: b.id,
          bookmarkedAt: b.createdAt,
          ...serializeEvent(ev, cat.name, cat.icon, sub.name, sub.icon),
        };
      })
      .filter(Boolean);

    const totalPages = Math.ceil(total / limit) || 1;
    res.json({
      data,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  })
);

router.post(
  '/bookmarks',
  asyncHandler(async (req, res) => {
    const { eventId } = req.body as { eventId?: string };
    if (!eventId || typeof eventId !== 'string') {
      throw new ValidationError('eventId required');
    }

    const event = await prisma.cachedEvent.findUnique({ where: { externalId: eventId } });
    if (!event) throw new NotFoundError(`Event ${eventId} not found`);

    const bookmark = await prisma.bookmark.upsert({
      where: { userId_eventId: { userId: req.user!.id, eventId: String(eventId) } },
      update: {},
      create: { userId: req.user!.id, eventId: String(eventId) },
    });

    res.status(201).json(bookmark);
  })
);

router.delete(
  '/bookmarks/:eventId',
  asyncHandler(async (req, res) => {
    const eventId = String(req.params.eventId);
    const deleted = await prisma.bookmark.deleteMany({
      where: { userId: req.user!.id, eventId },
    });
    if (!deleted.count) throw new NotFoundError('Bookmark not found');
    res.json({ ok: true });
  })
);

// ─── REMINDERS ────────────────────────────────────────────────────────────────

const reminderSchema = z.object({
  eventId: z.string(),
  remindBefore: z.coerce.number().int().min(1).max(1440).default(30),
});

router.get(
  '/reminders',
  asyncHandler(async (req, res) => {
    const reminders = await prisma.reminder.findMany({
      where: { userId: req.user!.id },
      orderBy: { remindAt: 'asc' },
    });
    res.json(reminders);
  })
);

router.post(
  '/reminders',
  asyncHandler(async (req, res) => {
    const parsed = reminderSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid reminder data');
    const { eventId, remindBefore } = parsed.data;

    const event = await prisma.cachedEvent.findUnique({ where: { externalId: eventId } });
    if (!event) throw new NotFoundError(`Event ${eventId} not found`);

    const eventDateTime = new Date(`${event.date}T${event.time ?? '00:00'}:00Z`);
    const remindAt = new Date(eventDateTime.getTime() - remindBefore * 60 * 1000);

    const reminder = await prisma.reminder.upsert({
      where: { userId_eventId: { userId: req.user!.id, eventId } },
      update: { remindBefore, remindAt },
      create: { userId: req.user!.id, eventId, remindBefore, remindAt },
    });

    res.status(201).json(reminder);
  })
);

router.delete(
  '/reminders/:id',
  asyncHandler(async (req, res) => {
    const deleted = await prisma.reminder.deleteMany({
      where: { id: String(req.params.id), userId: req.user!.id },
    });
    if (!deleted.count) throw new NotFoundError('Reminder not found');
    res.json({ ok: true });
  })
);

export default router;
