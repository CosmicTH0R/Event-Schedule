/**
 * gamingService.ts — Game releases via RAWG API
 */
import { normalizeEvent } from '../utils/normalizer';
import logger from '../utils/logger';
import config from '../config';
import type { NormalizedEvent } from '../types';

const BASE = 'https://api.rawg.io/api';

interface RawgPlatform {
  platform?: { name?: string };
}

interface RawgGame {
  id: number;
  name?: string;
  released?: string;
  background_image?: string | null;
  platforms?: RawgPlatform[];
}

interface RawgResponse {
  results?: RawgGame[];
}

async function fetchJson(path: string, params: Record<string, string> = {}): Promise<RawgResponse> {
  const key = config.apiKeys.rawg;
  if (!key) throw new Error('RAWG_API_KEY not configured');

  const qs = new URLSearchParams({ key, page_size: '40', ...params });
  const res = await fetch(`${BASE}${path}?${qs}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`RAWG ${res.status}: ${path}`);
  return res.json() as Promise<RawgResponse>;
}

function gameToEvent(game: RawgGame): NormalizedEvent | null {
  const date = game.released ?? '';
  if (!date) return null;

  const platforms = (game.platforms ?? [])
    .map((p) => p.platform?.name)
    .filter((n): n is string => Boolean(n))
    .slice(0, 3);

  return normalizeEvent({
    externalId: `rawg-${game.id}`,
    source: 'rawg',
    categoryId: 'gaming',
    subcategoryId: 'game-releases',
    title: game.name,
    description: platforms.length ? `Available on: ${platforms.join(', ')}` : 'New game release',
    date,
    time: '00:00',
    endTime: '',
    venue: '',
    location: 'Digital / Stores',
    imageUrl: game.background_image ?? '',
    tags: [
      'game-release',
      ...platforms
        .map((p) => p.toLowerCase().replace(/\s+/g, '-'))
        .slice(0, 2),
    ],
    status: 'upcoming',
  });
}

export async function fetchUpcomingGames(): Promise<NormalizedEvent[]> {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 180 * 86400_000).toISOString().split('T')[0];

  const data = await fetchJson('/games', {
    dates: `${today},${future}`,
    ordering: 'released',
  });

  const events = (data?.results ?? [])
    .map(gameToEvent)
    .filter((e): e is NormalizedEvent => e !== null);

  logger.info({ count: events.length }, 'RAWG game releases fetched');
  return events;
}
