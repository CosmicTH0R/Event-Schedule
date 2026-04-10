/**
 * f1Service.ts — Formula 1 via Jolpica F1 API (no key required)
 */
import { normalizeEvent } from '../utils/normalizer';
import logger from '../utils/logger';
import type { NormalizedEvent } from '../types';

const BASE = 'https://api.jolpi.ca/ergast/f1';

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`F1 API ${res.status}: ${url}`);
  return res.json();
}

interface F1Session {
  key: string | null;
  label: string;
  tag: string;
}

interface F1Circuit {
  circuitName?: string;
  Location?: { locality?: string; country?: string };
}

interface F1SessionData {
  date?: string;
  time?: string;
}

interface F1Race extends Record<string, unknown> {
  season: string;
  round: string;
  raceName: string;
  date?: string;
  time?: string;
  Circuit?: F1Circuit;
  FirstPractice?: F1SessionData;
  SecondPractice?: F1SessionData;
  ThirdPractice?: F1SessionData;
  Sprint?: F1SessionData;
  SprintShootout?: F1SessionData;
  Qualifying?: F1SessionData;
}

function raceToEvents(race: F1Race): NormalizedEvent[] {
  const events: NormalizedEvent[] = [];
  const circuit = race.Circuit;
  const location = `${circuit?.Location?.locality ?? ''}, ${circuit?.Location?.country ?? ''}`
    .trim()
    .replace(/^,\s*/, '');

  const sessions: F1Session[] = [
    { key: 'FirstPractice',  label: 'Practice 1',       tag: 'practice'   },
    { key: 'SecondPractice', label: 'Practice 2',       tag: 'practice'   },
    { key: 'ThirdPractice',  label: 'Practice 3',       tag: 'practice'   },
    { key: 'Sprint',         label: 'Sprint',           tag: 'sprint'     },
    { key: 'SprintShootout', label: 'Sprint Shootout',  tag: 'sprint'     },
    { key: 'Qualifying',     label: 'Qualifying',       tag: 'qualifying' },
    { key: null,             label: 'Race',             tag: 'race'       },
  ];

  for (const session of sessions) {
    const src = session.key ? (race[session.key] as F1SessionData | undefined) : (race as F1SessionData);
    if (!src?.date) continue;

    const time = (src.time ?? '00:00').replace('Z', '');

    events.push(
      normalizeEvent({
        externalId: `f1-${race.season}-${race.round}-${session.tag}`,
        source: 'f1',
        categoryId: 'sports',
        subcategoryId: 'f1',
        title: `F1: ${race.raceName} — ${session.label}`,
        description: `Round ${race.round} of the ${race.season} Formula 1 World Championship at ${circuit?.circuitName ?? 'TBC'}.`,
        date: src.date,
        time,
        endTime: '',
        venue: circuit?.circuitName ?? '',
        location,
        imageUrl: 'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=600',
        tags: [session.tag, 'f1'],
        status: 'upcoming',
      })
    );
  }
  return events;
}

export async function fetchSeason(year = new Date().getFullYear()): Promise<NormalizedEvent[]> {
  const data = (await fetchJson(`${BASE}/${year}.json?limit=25`)) as {
    MRData?: { RaceTable?: { Races?: F1Race[] } };
  };
  const races = data?.MRData?.RaceTable?.Races ?? [];
  const events = races.flatMap(raceToEvents);
  logger.info({ count: events.length, year }, 'F1 season fetched');
  return events;
}

export async function fetchNextRace(): Promise<NormalizedEvent[]> {
  const data = (await fetchJson(`${BASE}/current/next.json`)) as {
    MRData?: { RaceTable?: { Races?: F1Race[] } };
  };
  const races = data?.MRData?.RaceTable?.Races ?? [];
  if (!races.length) return [];
  return raceToEvents(races[0]);
}
