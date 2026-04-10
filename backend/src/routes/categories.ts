import { Router } from 'express';
import prisma from '../db';
import cache from '../services/cacheService';
import { asyncHandler } from '../middleware/errorHandler';
import config from '../config';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { data } = await cache.getOrFetch(
      'categories:all',
      config.cache.categories,
      async () => {
        const cats = await prisma.category.findMany({
          include: { subcategories: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        });

        return cats.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          subcategories: c.subcategories.map((s) => ({
            id: s.id,
            name: s.name,
            icon: s.icon,
          })),
        }));
      }
    );

    res.json(data);
  })
);

export default router;
