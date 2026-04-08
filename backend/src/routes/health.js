const express = require('express');
const router = express.Router();
const prisma = require('../db');
const cache = require('../services/cacheService');

router.get('/', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {}

  const cacheOk = await cache.isHealthy();

  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
    cache: cacheOk ? 'connected' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

module.exports = router;
