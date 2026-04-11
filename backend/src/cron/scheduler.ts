/**
 * scheduler.ts — node-cron powered background refresh jobs.
 */
import cron from 'node-cron';
import logger from '../utils/logger';
import prisma from '../db';
import cache from '../services/cacheService';
import config from '../config';
import { broadcastLive } from '../services/liveService';
import type { NormalizedEvent } from '../types';

let loggedBadDbUrl = false;
let loggedDbUnavailable = false;

function hasValidPostgresUrl(): boolean {
  const url = process.env.DATABASE_URL ?? '';
  const ok = /^postgres(?:ql)?:\/\//i.test(url.trim());

  if (!ok && !loggedBadDbUrl) {
    loggedBadDbUrl = true;
    logger.error(
      '[cron] DATABASE_URL is invalid for Prisma postgresql datasource. Use postgresql://...'
    );
  }

  return ok;
}

async function canUseDatabase(): Promise<boolean> {
  if (!hasValidPostgresUrl()) return false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    loggedDbUnavailable = false;
    return true;
  } catch (err) {
    if (!loggedDbUnavailable) {
      loggedDbUnavailable = true;
      logger.error(
        { err: (err as Error).message },
        '[cron] Database is unavailable; skipping scheduled refresh jobs'
      );
    }
    return false;
  }
}

// ─── Upsert helper ────────────────────────────────────────────────────────────

export async function upsertEvents(
  events: NormalizedEvent[]
): Promise<{ inserted: number; updated: number }> {
  if (!(await canUseDatabase())) {
    return { inserted: 0, updated: 0 };
  }

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
  if (!(await canUseDatabase())) return;
  try {
    const { fetchSeason } = await import('../services/f1Service');
    const events = await fetchSeason();
    const { inserted, updated } = await upsertEvents(events);
    await bustEventCache();
    logger.info({ inserted, updated, total: events.length }, '[cron] F1 refresh done');
    await broadcastLive();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, '[cron] F1 refresh failed');
  }
}

export async function runTMDBJob(): Promise<void> {
  if (!(await canUseDatabase())) return;
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
  if (!(await canUseDatabase())) return;
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
    await broadcastLive();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, '[cron] Football refresh failed');
  }
}

export async function runCricketJob(): Promise<void> {
  if (!(await canUseDatabase())) return;
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
    await broadcastLive();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, '[cron] Cricket refresh failed');
  }
}

export async function runGamingJob(): Promise<void> {
  if (!(await canUseDatabase())) return;
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

export async function runReminderJob(): Promise<void> {
  if (!(await canUseDatabase())) return;
  try {
    const { sendReminderEmail } = await import('../services/emailService');

    const now = new Date();
    // Find reminders due within the next minute & not yet sent
    const dueSoon = await prisma.reminder.findMany({
      where: {
        sent: false,
        remindAt: { lte: new Date(now.getTime() + 60_000) },
      },
      include: { user: { select: { email: true } } },
    });

    if (dueSoon.length === 0) return;

    for (const reminder of dueSoon) {
      const event = await prisma.cachedEvent.findUnique({
        where: { externalId: reminder.eventId },
      });
      if (!event) continue;

      await sendReminderEmail({
        to: reminder.user.email,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventVenue: event.venue || undefined,
        remindBefore: reminder.remindBefore,
      });

      // Mark as sent
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { sent: true },
      });
    }

    logger.info({ count: dueSoon.length }, '[cron] Reminders processed');
  } catch (err) {
    logger.warn({ err: (err as Error).message }, '[cron] Reminder job failed');
  }
}

export function startScheduler(): void {
  cron.schedule('0 */1 * * *', runF1Job, { name: 'f1-refresh' });
  cron.schedule('0 */6 * * *', runTMDBJob, { name: 'tmdb-refresh' });
  cron.schedule('15 */1 * * *', runFootballJob, { name: 'football-refresh' });
  cron.schedule('*/30 * * * *', runCricketJob, { name: 'cricket-refresh' });
  cron.schedule('0 2 * * *', runGamingJob, { name: 'gaming-refresh' });
  cron.schedule('* * * * *', runReminderJob, { name: 'reminders' }); // every minute

  logger.info('Background refresh scheduler started (F1/TMDB/Football/Cricket/Gaming/Reminders)');
}
