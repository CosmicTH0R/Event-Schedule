const express = require('express');
const router = express.Router();
const prisma = require('../db');
const cache = require('../services/cacheService');
const { asyncHandler } = require('../middleware/errorHandler');
const config = require('../config');

// GET /api/categories
router.get(
  '/',
  asyncHandler(async (req, res) => {
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

module.exports = router;
