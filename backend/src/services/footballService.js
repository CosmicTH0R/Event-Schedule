/**
 * footballService.js — Football fixtures via football-data.org
 * Requires FOOTBALL_DATA_KEY in .env (free key at football-data.org)
 */
const { normalizeEvent } = require('../utils/normalizer');
const logger = require('../utils/logger');
const config = require('../config');

const BASE = 'https://api.football-data.org/v4';

// Free tier: rate limit 10 req/min — we stay well under with a small delay
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(path) {
  const key = config.apiKeys.football;
  if (!key) throw new Error('FOOTBALL_DATA_KEY not configured');

  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': key },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Football API ${res.status}: ${path}`);
  return res.json();
}

function matchToEvent(match, competition) {
  const date = match.utcDate?.split('T')[0] || '';
  const time = match.utcDate?.split('T')[1]?.replace('Z', '').slice(0, 5) || '00:00';
  if (!date) return null;

  const home = match.homeTeam?.name || 'TBD';
  const away = match.awayTeam?.name || 'TBD';

  return normalizeEvent({
    externalId: `football-${match.id}`,
    source: 'football',
    categoryId: 'sports',
    subcategoryId: 'football',
    title: `${home} vs ${away}`,
    description: `${competition || match.competition?.name || 'Football'} fixture`,
    date,
    time,
    endTime: '',
    venue: match.venue || '',
    location: '',
    imageUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600',
    tags: ['football', (match.competition?.code || '').toLowerCase()],
    status: match.status === 'IN_PLAY' ? 'live' : 'upcoming',
  });
}

async function fetchFixtures() {
  const competitions = [
    { code: 'PL',  name: 'Premier League' },
    { code: 'CL',  name: 'Champions League' },
    { code: 'PD',  name: 'La Liga' },
  ];

  const events = [];

  for (const comp of competitions) {
    try {
      const data = await fetchJson(`/competitions/${comp.code}/matches?status=SCHEDULED&limit=20`);
      const matches = data?.matches || [];
      events.push(...matches.map((m) => matchToEvent(m, comp.name)).filter(Boolean));
      await sleep(1200); // respect 10 req/min free tier
    } catch (err) {
      logger.warn({ err: err.message, comp: comp.code }, 'Football API fetch failed for competition');
    }
  }

  logger.info({ count: events.length }, 'Football fixtures fetched');
  return events;
}

module.exports = { fetchFixtures };
