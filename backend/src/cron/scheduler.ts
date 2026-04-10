/**
 * scheduler.ts — node-cron powered background refresh jobs.
 */
import cron from 'node-cron';
import logger from '../utils/logger';
import prisma from '../db';
import cache from '../services/cacheService';
import config from '../config';
import type { NormalizedEvent } from '../types';

// ─── Upsert helper ────────────────────────────────────────────────────────────

export async function upsertEvents(
  events: NormalizedEvent[]
): Promise<{ inserted: number; updated: number }> {
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
      logger.warn(
        { err: (err as Error).message, externalId: ev.externalId },
        'Upsert failed for event'
      );
    }
  }

  return { inserted, updated };
}

async function bustEventCache(): Promise<void> {
  logger.debug('Event cache bust requested (in-memory TTL will expire naturally)');
}

// ─── Job runners ─────────────────────────────────────────────────────────────

export async function runF1Job(): Promise<void> {
  try {
    const { fetchSeason } = await import('../services/f1Service');
    const events = await fetchSeason();
    const { inserted, updated } = await upsertEvents(events);
    await bustEventCache();
    logger.info({ inserted, updated, total: events.length }, '[cron] F1 refresh done');
  } catch (err) {
    logger.warn({ err: (err as Error).message }, '[cron] F1 refresh failed');
  }
}

export async function runTMDBJob(): Promise<void> {
  if (!config.apiKeys.tmdb) {
    logger.warn('[cron] TMDB_API_KEY not set — skipping TMDB refresh');
    return;
  }
  try {
    const { fetchMovies, fetchTVShows } = await import('../services/tmdbService');
    const [movies, tv] = await Promise.all([fetchMovies(), fetchTVShows()]);
    const events = [...movies, ...tv];
    const { inserted, updated } = await upsertEvents(events);
    await bustEventCache();
    logger.info({ inserted, updated, total: events.length }, '[cron] TMDB refresh done');
  } catch (err) {
    logger.warn({ err: (err as Error).message }, '[cron] TMDB refresh failed');
  }
}

export async function runFootballJob(): Promise<void> {
  if (!config.apiKeys.football) {
    logger.warn('[cron] FOOTBALL_DATA_KEY not set — skipping football refresh');
    return;
  }
  try {
    const { fetchFixtures } = await import('../services/footballService');
    const events = await fetchFixtures();
    const { inserted, updated } = await upsertEvents(events);
    await bustEventCache();
    logger.info({ inserted, updated, total: events.length }, '[cron] Football refresh done');
  } catch (err) {
    logger.warn({ err: (err as Error).message }, '[cron] Football refresh failed');
  }
}

export async function runCricketJob(): Promise<void> {
  if (!config.apiKeys.cricket) {
    logger.warn('[cron] CRICKET_API_KEY not set — skipping cricket refresh');
    return;
  }
  try {
    const { fetchMatches } = await import('../services/cricketService');
    const events = await fetchMatches();
    const { inserted, updated } = await upsertEvents(events);
    await bustEventCache();
    logger.info({ inserted, updated, total: events.length }, '[cron] Cricket refresh done');
  } catch (err) {
    logger.warn({ err: (err as Error).message }, '[cron] Cricket refresh failed');
  }
}

export async function runGamingJob(): Promise<void> {
  if (!config.apiKeys.rawg) {
    logger.warn('[cron] RAWG_API_KEY not set — skipping gaming refresh');
    return;
  }
  try {
    const { fetchUpcomingGames } = await import('../services/gamingService');
    const events = await fetchUpcomingGames();
    const { inserted, updated } = await upsertEvents(events);
    await bustEventCache();
    logger.info({ inserted, updated, total: events.length }, '[cron] Gaming refresh done');
  } catch (err) {
    logger.warn({ err: (err as Error).message }, '[cron] Gaming refresh failed');
  }
}

// ─── Schedule definitions ─────────────────────────────────────────────────────

export function startScheduler(): void {
  cron.schedule('0 */1 * * *', runF1Job, { name: 'f1-refresh' });
  cron.schedule('0 */6 * * *', runTMDBJob, { name: 'tmdb-refresh' });
  cron.schedule('15 */1 * * *', runFootballJob, { name: 'football-refresh' });
  cron.schedule('*/30 * * * *', runCricketJob, { name: 'cricket-refresh' });
  cron.schedule('0 2 * * *', runGamingJob, { name: 'gaming-refresh' });

  logger.info('Background refresh scheduler started (F1/TMDB/Football/Cricket/Gaming)');
}
