/**
 * musicService.ts — Music events (reads from static DB for now)
 */
import prisma from '../db';
import logger from '../utils/logger';
import type { NormalizedEvent } from '../types';

export async function fetchMusicEvents(): Promise<NormalizedEvent[]> {
  const rows = await prisma.cachedEvent.findMany({
    where: { categoryId: 'music' },
  });
  logger.info({ count: rows.length }, 'Music events read from DB (static source)');
  return [];
}
