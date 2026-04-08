/**
 * musicService.js — Music events (reads from static DB for now)
 * Phase 3+: integrate Ticketmaster or Songkick APIs here.
 */
const prisma = require('../db');
const logger = require('../utils/logger');

/**
 * Returns all music/concert events already in the DB (seeded from static JSON).
 * Placeholder until a live music API key is available.
 */
async function fetchMusicEvents() {
  const rows = await prisma.cachedEvent.findMany({
    where: { categoryId: 'music' },
  });
  logger.info({ count: rows.length }, 'Music events read from DB (static source)');
  return [];  // Return empty — already in DB from seed, no need to re-upsert
}

module.exports = { fetchMusicEvents };
