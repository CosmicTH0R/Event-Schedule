/**
 * seedLiveData.js — Run once to populate CachedEvent table from all live APIs.
 * Usage: node src/scripts/seedLiveData.js
 *
 * Requires API keys in .env. Missing keys are skipped with a warning.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const prisma = require('../db');
const logger = require('../utils/logger');
const { upsertEvents } = require('../cron/scheduler');

async function run() {
  logger.info('🌐 Starting live data seed...');
  const results = {};

  // ── F1 (no key required) ────────────────────────────────────────────────────
  try {
    const { fetchSeason } = require('../services/f1Service');
    const events = await fetchSeason();
    const counts = await upsertEvents(events);
    results.f1 = counts;
    logger.info({ ...counts }, '✅ F1 seeded');
  } catch (err) {
    logger.warn({ err: err.message }, '⚠️  F1 seed failed');
  }

  // ── TMDB ────────────────────────────────────────────────────────────────────
  const { default: config } = await import('../../src/config.js').catch(() => ({ default: require('../config') }));
  const cfg = require('../config');

  if (cfg.apiKeys.tmdb) {
    try {
      const { fetchMovies, fetchTVShows } = require('../services/tmdbService');
      const [movies, tv] = await Promise.all([fetchMovies(), fetchTVShows()]);
      const counts = await upsertEvents([...movies, ...tv]);
      results.tmdb = counts;
      logger.info({ ...counts }, '✅ TMDB seeded');
    } catch (err) {
      logger.warn({ err: err.message }, '⚠️  TMDB seed failed');
    }
  } else {
    logger.warn('TMDB_API_KEY not set — skipping');
  }

  // ── Football ────────────────────────────────────────────────────────────────
  if (cfg.apiKeys.football) {
    try {
      const { fetchFixtures } = require('../services/footballService');
      const events = await fetchFixtures();
      const counts = await upsertEvents(events);
      results.football = counts;
      logger.info({ ...counts }, '✅ Football seeded');
    } catch (err) {
      logger.warn({ err: err.message }, '⚠️  Football seed failed');
    }
  } else {
    logger.warn('FOOTBALL_DATA_KEY not set — skipping');
  }

  // ── Cricket ─────────────────────────────────────────────────────────────────
  if (cfg.apiKeys.cricket) {
    try {
      const { fetchMatches } = require('../services/cricketService');
      const events = await fetchMatches();
      const counts = await upsertEvents(events);
      results.cricket = counts;
      logger.info({ ...counts }, '✅ Cricket seeded');
    } catch (err) {
      logger.warn({ err: err.message }, '⚠️  Cricket seed failed');
    }
  } else {
    logger.warn('CRICKET_API_KEY not set — skipping');
  }

  // ── Gaming (RAWG) ────────────────────────────────────────────────────────────
  if (cfg.apiKeys.rawg) {
    try {
      const { fetchUpcomingGames } = require('../services/gamingService');
      const events = await fetchUpcomingGames();
      const counts = await upsertEvents(events);
      results.gaming = counts;
      logger.info({ ...counts }, '✅ Gaming seeded');
    } catch (err) {
      logger.warn({ err: err.message }, '⚠️  Gaming seed failed');
    }
  } else {
    logger.warn('RAWG_API_KEY not set — skipping');
  }

  logger.info({ results }, '🎉 Live data seed complete');
  await prisma.$disconnect();
}

run().catch(async (err) => {
  logger.error({ err: err.message }, 'Fatal error in seedLiveData');
  await prisma.$disconnect();
  process.exit(1);
});
