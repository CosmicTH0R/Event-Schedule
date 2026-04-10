/**
 * esportsService.ts — Esports events (reads from static DB for now)
 */
import prisma from '../db';
import logger from '../utils/logger';
import type { NormalizedEvent } from '../types';

export async function fetchEsportsEvents(): Promise<NormalizedEvent[]> {
  const rows = await prisma.cachedEvent.findMany({
    where: { subcategoryId: 'esports' },
  });
  logger.info({ count: rows.length }, 'Esports events read from DB (static source)');
  return [];
}
