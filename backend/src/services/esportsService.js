/**
 * esportsService.js — Esports events (reads from static DB for now)
 * Phase 3+: integrate PandaScore API (free tier) here.
 */
const prisma = require('../db');
const logger = require('../utils/logger');

async function fetchEsportsEvents() {
  const rows = await prisma.cachedEvent.findMany({
    where: { subcategoryId: 'esports' },
  });
  logger.info({ count: rows.length }, 'Esports events read from DB (static source)');
  return [];  // Already in DB from seed
}

module.exports = { fetchEsportsEvents };
