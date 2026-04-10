import { Router } from 'express';
import prisma from '../db';
import cache from '../services/cacheService';

const router = Router();

router.get('/', async (_req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    // keep disconnected
  }

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

export default router;
