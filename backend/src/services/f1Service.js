/**
 * f1Service.js — Formula 1 via Jolpica F1 API (no key required)
 */
const { normalizeEvent } = require('../utils/normalizer');
const logger = require('../utils/logger');

const BASE = 'https://api.jolpi.ca/ergast/f1';

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`F1 API ${res.status}: ${url}`);
  return res.json();
}

/**
 * Generates Practice 1/2/3, Qualifying, Sprint (if present), and Race events
 * from a single race object returned by the Jolpica API.
 */
function raceToEvents(race) {
  const events = [];
  const circuit = race.Circuit;
  const location = `${circuit?.Location?.locality || ''}, ${circuit?.Location?.country || ''}`.trim().replace(/^,\s*/, '');

  const sessions = [
    { key: 'FirstPractice',  label: 'Practice 1',  tag: 'practice' },
    { key: 'SecondPractice', label: 'Practice 2',  tag: 'practice' },
    { key: 'ThirdPractice',  label: 'Practice 3',  tag: 'practice' },
    { key: 'Sprint',         label: 'Sprint',      tag: 'sprint'   },
    { key: 'SprintShootout', label: 'Sprint Shootout', tag: 'sprint' },
    { key: 'Qualifying',     label: 'Qualifying',  tag: 'qualifying' },
    { key: null,             label: 'Race',        tag: 'race'     },
  ];

  for (const session of sessions) {
    const src = session.key ? race[session.key] : race;
    if (!src?.date) continue;

    const time = (src.time || '00:00').replace('Z', '');

    events.push(
      normalizeEvent({
        externalId: `f1-${race.season}-${race.round}-${session.tag}`,
        source: 'f1',
        categoryId: 'sports',
        subcategoryId: 'f1',
        title: `F1: ${race.raceName} — ${session.label}`,
        description: `Round ${race.round} of the ${race.season} Formula 1 World Championship at ${circuit?.circuitName || 'TBC'}.`,
        date: src.date,
        time,
        endTime: '',
        venue: circuit?.circuitName || '',
        location,
        imageUrl: 'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=600',
        tags: [session.tag, 'f1'],
        status: 'upcoming',
      })
    );
  }
  return events;
}

async function fetchSeason(year = new Date().getFullYear()) {
  const data = await fetchJson(`${BASE}/${year}.json?limit=25`);
  const races = data?.MRData?.RaceTable?.Races || [];
  const events = races.flatMap(raceToEvents);
  logger.info({ count: events.length, year }, 'F1 season fetched');
  return events;
}

async function fetchNextRace() {
  const data = await fetchJson(`${BASE}/current/next.json`);
  const races = data?.MRData?.RaceTable?.Races || [];
  if (!races.length) return [];
  return raceToEvents(races[0]);
}

module.exports = { fetchSeason, fetchNextRace };
