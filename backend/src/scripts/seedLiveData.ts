/**
 * seedLiveData.ts — Run once to populate CachedEvent table from all live APIs.
 * Usage: npx tsx src/scripts/seedLiveData.ts
 */
import 'dotenv/config';

import prisma from '../db';
import logger from '../utils/logger';
import { upsertEvents } from '../cron/scheduler';
import config from '../config';

async function run(): Promise<void> {
  logger.info('🌐 Starting live data seed...');
  const results: Record<string, { inserted: number; updated: number }> = {};

  // ── F1 ──────────────────────────────────────────────────────────────────────
  try {
    const { fetchSeason } = await import('../services/f1Service');
    const events = await fetchSeason();
    results.f1 = await upsertEvents(events);
    logger.info({ ...results.f1 }, '✅ F1 seeded');
  } catch (err) {
    logger.warn({ err: (err as Error).message }, '⚠️  F1 seed failed');
  }

  // ── TMDB ────────────────────────────────────────────────────────────────────
  if (config.apiKeys.tmdb) {
    try {
      const { fetchMovies, fetchTVShows } = await import('../services/tmdbService');
      const [movies, tv] = await Promise.all([fetchMovies(), fetchTVShows()]);
      results.tmdb = await upsertEvents([...movies, ...tv]);
      logger.info({ ...results.tmdb }, '✅ TMDB seeded');
    } catch (err) {
      logger.warn({ err: (err as Error).message }, '⚠️  TMDB seed failed');
    }
  } else {
    logger.warn('TMDB_API_KEY not set — skipping');
  }

  // ── Football ────────────────────────────────────────────────────────────────
  if (config.apiKeys.football) {
    try {
      const { fetchFixtures } = await import('../services/footballService');
      results.football = await upsertEvents(await fetchFixtures());
      logger.info({ ...results.football }, '✅ Football seeded');
    } catch (err) {
      logger.warn({ err: (err as Error).message }, '⚠️  Football seed failed');
    }
  } else {
    logger.warn('FOOTBALL_DATA_KEY not set — skipping');
  }

  // ── Cricket ─────────────────────────────────────────────────────────────────
  if (config.apiKeys.cricket) {
    try {
      const { fetchMatches } = await import('../services/cricketService');
      results.cricket = await upsertEvents(await fetchMatches());
      logger.info({ ...results.cricket }, '✅ Cricket seeded');
    } catch (err) {
      logger.warn({ err: (err as Error).message }, '⚠️  Cricket seed failed');
    }
  } else {
    logger.warn('CRICKET_API_KEY not set — skipping');
  }

  // ── Gaming ──────────────────────────────────────────────────────────────────
  if (config.apiKeys.rawg) {
    try {
      const { fetchUpcomingGames } = await import('../services/gamingService');
      results.gaming = await upsertEvents(await fetchUpcomingGames());
      logger.info({ ...results.gaming }, '✅ Gaming seeded');
    } catch (err) {
      logger.warn({ err: (err as Error).message }, '⚠️  Gaming seed failed');
    }
  } else {
    logger.warn('RAWG_API_KEY not set — skipping');
  }

  logger.info({ results }, '🎉 Live data seed complete');
  await prisma.$disconnect();
}

run().catch(async (err) => {
  logger.error({ err: (err as Error).message }, 'Fatal error in seedLiveData');
  await prisma.$disconnect();
  process.exit(1);
});
