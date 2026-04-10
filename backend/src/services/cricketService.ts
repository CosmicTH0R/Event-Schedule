/**
 * cricketService.ts — Cricket fixtures via CricketData.org
 */
import { normalizeEvent } from '../utils/normalizer';
import logger from '../utils/logger';
import config from '../config';
import type { NormalizedEvent } from '../types';

const BASE = 'https://api.cricapi.com/v1';

interface CricketMatch {
  id: string;
  name?: string;
  matchType?: string;
  status?: string;
  venue?: string;
  date?: string;
  dateTimeGMT?: string;
  teams?: string[];
  team1?: string;
  team2?: string;
  series_id?: string;
  seriesName?: string;
  matchStarted?: boolean;
  matchEnded?: boolean;
}

interface CricketResponse {
  status?: string;
  data?: CricketMatch[];
}

async function fetchJson(path: string, params: Record<string, string | number> = {}): Promise<CricketResponse> {
  const key = config.apiKeys.cricket;
  if (!key) throw new Error('CRICKET_API_KEY not configured');

  const qs = new URLSearchParams({ apikey: key, offset: '0', ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const res = await fetch(`${BASE}${path}?${qs}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Cricket API ${res.status}: ${path}`);
  return res.json() as Promise<CricketResponse>;
}

function extractTime(match: CricketMatch): string | null {
  const raw = (match.dateTimeGMT ?? '').split('T')[1]?.replace('Z', '').slice(0, 5);
  if (raw && raw !== '00:00') return raw;
  const statusMatch = (match.status ?? '').match(/(\d{1,2}:\d{2})\s*GMT/i);
  if (statusMatch) return statusMatch[1];
  return null;
}

function matchToEvent(match: CricketMatch): NormalizedEvent | null {
  const date = (match.dateTimeGMT ?? match.date ?? '').split('T')[0];
  const time = extractTime(match) ?? '00:00';
  if (!date) return null;

  const teams = Array.isArray(match.teams)
    ? match.teams.join(' vs ')
    : match.team1 && match.team2
    ? `${match.team1} vs ${match.team2}`
    : 'Match TBD';

  const series = match.series_id ?? match.seriesName ?? '';
  const tags = ['cricket'];
  if (/ipl/i.test(series)) tags.push('ipl');
  if (/world cup/i.test(series)) tags.push('world-cup');
  if (/t20/i.test(match.matchType ?? '')) tags.push('t20');
  if (/test/i.test(match.matchType ?? '')) tags.push('test');
  if (/odi/i.test(match.matchType ?? '')) tags.push('odi');

  return normalizeEvent({
    externalId: `cricket-${match.id}`,
    source: 'cricket',
    categoryId: 'sports',
    subcategoryId: 'cricket',
    title: teams,
    description: `${match.name ?? series ?? 'Cricket match'} — ${match.matchType ?? ''}`.trim(),
    date,
    time,
    endTime: '',
    venue: match.venue ?? '',
    location: match.venue ?? '',
    imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600',
    tags,
    status: match.matchStarted && !match.matchEnded ? 'live' : 'upcoming',
  });
}

export async function fetchMatches(): Promise<NormalizedEvent[]> {
  const events: NormalizedEvent[] = [];
  const endpoints = ['/matches', '/currentMatches'];

  for (const ep of endpoints) {
    try {
      const data = await fetchJson(ep);
      if (data?.status === 'success' && Array.isArray(data.data)) {
        events.push(
          ...data.data
            .map(matchToEvent)
            .filter((e): e is NormalizedEvent => e !== null)
        );
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message, ep }, 'Cricket endpoint failed');
    }
  }

  const unique = [...new Map(events.map((e) => [e.externalId, e])).values()];
  logger.info({ count: unique.length }, 'Cricket matches fetched');
  return unique;
}
