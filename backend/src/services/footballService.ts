/**
 * footballService.ts — Football fixtures via football-data.org
 */
import { normalizeEvent } from '../utils/normalizer';
import logger from '../utils/logger';
import config from '../config';
import type { NormalizedEvent } from '../types';

const BASE = 'https://api.football-data.org/v4';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface FootballTeam {
  name?: string;
}

interface FootballCompetition {
  name?: string;
  code?: string;
}

interface FootballMatch {
  id: number;
  utcDate?: string;
  status?: string;
  venue?: string;
  homeTeam?: FootballTeam;
  awayTeam?: FootballTeam;
  competition?: FootballCompetition;
}

interface FootballResponse {
  matches?: FootballMatch[];
}

async function fetchJson(path: string): Promise<FootballResponse> {
  const key = config.apiKeys.football;
  if (!key) throw new Error('FOOTBALL_DATA_KEY not configured');

  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': key },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Football API ${res.status}: ${path}`);
  return res.json() as Promise<FootballResponse>;
}

function matchToEvent(match: FootballMatch, competition: string): NormalizedEvent | null {
  const date = match.utcDate?.split('T')[0] ?? '';
  const time = match.utcDate?.split('T')[1]?.replace('Z', '').slice(0, 5) ?? '00:00';
  if (!date) return null;

  const home = match.homeTeam?.name ?? 'TBD';
  const away = match.awayTeam?.name ?? 'TBD';

  return normalizeEvent({
    externalId: `football-${match.id}`,
    source: 'football',
    categoryId: 'sports',
    subcategoryId: 'football',
    title: `${home} vs ${away}`,
    description: `${competition || (match.competition?.name ?? 'Football')} fixture`,
    date,
    time,
    endTime: '',
    venue: match.venue ?? '',
    location: '',
    imageUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600',
    tags: ['football', (match.competition?.code ?? '').toLowerCase()],
    status: match.status === 'IN_PLAY' ? 'live' : 'upcoming',
  });
}

export async function fetchFixtures(): Promise<NormalizedEvent[]> {
  const competitions = [
    { code: 'PL', name: 'Premier League' },
    { code: 'CL', name: 'Champions League' },
    { code: 'PD', name: 'La Liga' },
  ];

  const events: NormalizedEvent[] = [];

  for (const comp of competitions) {
    try {
      const data = await fetchJson(`/competitions/${comp.code}/matches?status=SCHEDULED&limit=20`);
      const matches = data?.matches ?? [];
      events.push(
        ...matches
          .map((m) => matchToEvent(m, comp.name))
          .filter((e): e is NormalizedEvent => e !== null)
      );
      await sleep(1200);
    } catch (err) {
      logger.warn({ err: (err as Error).message, comp: comp.code }, 'Football API fetch failed');
    }
  }

  logger.info({ count: events.length }, 'Football fixtures fetched');
  return events;
}
