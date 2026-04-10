/**
 * admin.ts — Manual data refresh triggers
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import config from '../config';

const router = Router();

function devOnly(_req: Request, res: Response, next: NextFunction): void {
  if (config.nodeEnv === 'production') {
    res
      .status(403)
      .json({ error: true, message: 'Admin routes disabled in production' });
    return;
  }
  next();
}

router.post(
  '/refresh/:source',
  devOnly,
  asyncHandler(async (req, res) => {
    const { source } = req.params;
    const {
      runF1Job,
      runTMDBJob,
      runFootballJob,
      runCricketJob,
      runGamingJob,
    } = await import('../cron/scheduler');

    const jobMap: Record<string, () => Promise<void>> = {
      f1: runF1Job,
      tmdb: runTMDBJob,
      football: runFootballJob,
      cricket: runCricketJob,
      gaming: runGamingJob,
    };

    const srcKey = String(source);

    if (srcKey === 'all') {
      res.json({ ok: true, message: 'All refresh jobs dispatched' });
      for (const fn of Object.values(jobMap)) fn().catch(() => {});
      return;
    }

    if (!jobMap[srcKey]) {
      res.status(400).json({
        error: true,
        message: `Unknown source: ${srcKey}. Valid: ${Object.keys(jobMap).join(', ')}`,
      });
      return;
    }

    res.json({ ok: true, message: `${srcKey} refresh dispatched` });
    jobMap[srcKey]().catch((err: Error) =>
      logger.warn({ err: err.message }, `Manual ${srcKey} refresh failed`)
    );
  })
);

export default router;
