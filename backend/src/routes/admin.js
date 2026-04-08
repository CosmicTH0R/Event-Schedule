/**
 * admin.js — Manual data refresh triggers (admin-only, IP-restricted in prod)
 * POST /api/admin/refresh/:source
 * POST /api/admin/refresh/all
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const SOURCES = ['f1', 'tmdb', 'football', 'cricket', 'gaming'];

// Simple dev-only guard — replace with real auth middleware in production
function devOnly(req, res, next) {
  const { nodeEnv } = require('../config');
  if (nodeEnv === 'production') {
    return res.status(403).json({ error: true, message: 'Admin routes disabled in production' });
  }
  next();
}

router.post(
  '/refresh/:source',
  devOnly,
  asyncHandler(async (req, res) => {
    const { source } = req.params;
    const { runF1Job, runTMDBJob, runFootballJob, runCricketJob, runGamingJob } = require('../cron/scheduler');
    const jobMap = { f1: runF1Job, tmdb: runTMDBJob, football: runFootballJob, cricket: runCricketJob, gaming: runGamingJob };

    if (source === 'all') {
      res.json({ ok: true, message: 'All refresh jobs dispatched' });
      for (const fn of Object.values(jobMap)) fn().catch(() => {});
      return;
    }

    if (!jobMap[source]) {
      return res.status(400).json({ error: true, message: `Unknown source: ${source}. Valid: ${SOURCES.join(', ')}` });
    }

    res.json({ ok: true, message: `${source} refresh dispatched` });
    jobMap[source]().catch((err) => logger.warn({ err: err.message }, `Manual ${source} refresh failed`));
  })
);

module.exports = router;
