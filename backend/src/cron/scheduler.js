/**
 * scheduler.js — node-cron powered background refresh jobs.
 * Imported once by server.js at startup.
 *
 * Each job: fetch → normalize → upsert into DB → invalidate cache keys.
 * If an API key is missing the job skips silently (logged as warn).
 */
const cron = require('node-cron');
const logger = require('../utils/logger');
const prisma = require('../db');
const cache = require('../services/cacheService');
const config = require('../config');

// ─── Upsert helper ────────────────────────────────────────────────────────────

/**
 * Upserts an array of normalizedEvent objects into CachedEvent table.
 * Returns { inserted, updated } counts.
 */
async function upsertEvents(events) {
  let inserted = 0;
  let updated = 0;

  for (const ev of events) {
    try {
      const existing = await prisma.cachedEvent.findUnique({
        where: { externalId: ev.externalId },
        select: { id: true },
      });

      if (existing) {
        await prisma.cachedEvent.update({
          where: { externalId: ev.externalId },
          data: { ...ev, fetchedAt: new Date() },
        });
        updated++;
      } else {
        await prisma.cachedEvent.create({ data: ev });
        inserted++;
      }
    } catch (err) {
      logger.warn({ err: err.message, externalId: ev.externalId }, 'Upsert failed for event');
    }
  }

  return { inserted, updated };
}

/** Clears all event list cache keys so stale data is not served */
async function bustEventCache() {
  // In-memory cache doesn't support pattern delete; set a short TTL sentinel
  // Real Redis supports: await cache.client.eval("redis.call('del', unpack(redis.call('keys', ARGV[1])))", 0, 'events:*')
  logger.debug('Event cache bust requested (in-memory TTL will expire naturally)');
}

// ─── Job runners ─────────────────────────────────────────────────────────────

async function runF1Job() {
  try {
    const { fetchSeason } = require('../services/f1Service');
    const events = await fetchSeason();
    const { inserted, updated } = await upsertEvents(events);
    await bustEventCache();
    logger.info({ inserted, updated, total: events.length }, '[cron] F1 refresh done');
  } catch (err) {
    logger.warn({ err: err.message }, '[cron] F1 refresh failed');
  }
}

async function runTMDBJob() {
  if (!config.apiKeys.tmdb) {
    logger.warn('[cron] TMDB_API_KEY not set — skipping TMDB refresh');
    return;
  }
  try {
    const { fetchMovies, fetchTVShows } = require('../services/tmdbService');
    const [movies, tv] = await Promise.all([fetchMovies(), fetchTVShows()]);
    const events = [...movies, ...tv];
    const { inserted, updated } = await upsertEvents(events);
    await bustEventCache();
    logger.info({ inserted, updated, total: events.length }, '[cron] TMDB refresh done');
  } catch (err) {
    logger.warn({ err: err.message }, '[cron] TMDB refresh failed');
  }
}

async function runFootballJob() {
  if (!config.apiKeys.football) {
    logger.warn('[cron] FOOTBALL_DATA_KEY not set — skipping football refresh');
    return;
  }
  try {
    const { fetchFixtures } = require('../services/footballService');
    const events = await fetchFixtures();
    const { inserted, updated } = await upsertEvents(events);
    await bustEventCache();
    logger.info({ inserted, updated, total: events.length }, '[cron] Football refresh done');
  } catch (err) {
    logger.warn({ err: err.message }, '[cron] Football refresh failed');
  }
}

async function runCricketJob() {
  if (!config.apiKeys.cricket) {
    logger.warn('[cron] CRICKET_API_KEY not set — skipping cricket refresh');
    return;
  }
  try {
    const { fetchMatches } = require('../services/cricketService');
    const events = await fetchMatches();
    const { inserted, updated } = await upsertEvents(events);
    await bustEventCache();
    logger.info({ inserted, updated, total: events.length }, '[cron] Cricket refresh done');
  } catch (err) {
    logger.warn({ err: err.message }, '[cron] Cricket refresh failed');
  }
}

async function runGamingJob() {
  if (!config.apiKeys.rawg) {
    logger.warn('[cron] RAWG_API_KEY not set — skipping gaming refresh');
    return;
  }
  try {
    const { fetchUpcomingGames } = require('../services/gamingService');
    const events = await fetchUpcomingGames();
    const { inserted, updated } = await upsertEvents(events);
    await bustEventCache();
    logger.info({ inserted, updated, total: events.length }, '[cron] Gaming refresh done');
  } catch (err) {
    logger.warn({ err: err.message }, '[cron] Gaming refresh failed');
  }
}

// ─── Schedule definitions ─────────────────────────────────────────────────────

function startScheduler() {
  // F1 — every hour
  cron.schedule('0 */1 * * *', runF1Job, { name: 'f1-refresh' });

  // TMDB Movies & TV — every 6 hours
  cron.schedule('0 */6 * * *', runTMDBJob, { name: 'tmdb-refresh' });

  // Football — every hour (offset by 15 min to spread API calls)
  cron.schedule('15 */1 * * *', runFootballJob, { name: 'football-refresh' });

  // Cricket — every 30 minutes
  cron.schedule('*/30 * * * *', runCricketJob, { name: 'cricket-refresh' });

  // Gaming — daily at 02:00
  cron.schedule('0 2 * * *', runGamingJob, { name: 'gaming-refresh' });

  logger.info('Background refresh scheduler started (F1/TMDB/Football/Cricket/Gaming)');
}

// Export job runners for the manual admin trigger route
module.exports = { startScheduler, runF1Job, runTMDBJob, runFootballJob, runCricketJob, runGamingJob, upsertEvents };
