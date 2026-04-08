/**
 * cricketService.js — Cricket fixtures via CricketData.org
 * Requires CRICKET_API_KEY in .env (free key at cricketdata.org)
 */
const { normalizeEvent } = require('../utils/normalizer');
const logger = require('../utils/logger');
const config = require('../config');

const BASE = 'https://api.cricapi.com/v1';

async function fetchJson(path, params = {}) {
  const key = config.apiKeys.cricket;
  if (!key) throw new Error('CRICKET_API_KEY not configured');

  const qs = new URLSearchParams({ apikey: key, offset: 0, ...params });
  const res = await fetch(`${BASE}${path}?${qs}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Cricket API ${res.status}: ${path}`);
  return res.json();
}

function matchToEvent(match) {
  const date = (match.dateTimeGMT || match.date || '').split('T')[0];
  const time = (match.dateTimeGMT || '').split('T')[1]?.replace('Z', '').slice(0, 5) || '00:00';
  if (!date) return null;

  const teams = Array.isArray(match.teams)
    ? match.teams.join(' vs ')
    : (match.team1 && match.team2 ? `${match.team1} vs ${match.team2}` : 'Match TBD');

  const series = match.series_id || match.seriesName || '';
  const tags = ['cricket'];
  if (/ipl/i.test(series)) tags.push('ipl');
  if (/world cup/i.test(series)) tags.push('world-cup');
  if (/t20/i.test(match.matchType)) tags.push('t20');
  if (/test/i.test(match.matchType)) tags.push('test');
  if (/odi/i.test(match.matchType)) tags.push('odi');

  return normalizeEvent({
    externalId: `cricket-${match.id}`,
    source: 'cricket',
    categoryId: 'sports',
    subcategoryId: 'cricket',
    title: teams,
    description: `${match.name || series || 'Cricket match'} — ${match.matchType || ''}`.trim(),
    date,
    time,
    endTime: '',
    venue: match.venue || '',
    location: match.venue || '',
    imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600',
    tags,
    status: match.matchStarted && !match.matchEnded ? 'live' : 'upcoming',
  });
}

async function fetchMatches() {
  const events = [];

  const endpoints = ['/matches', '/currentMatches'];

  for (const ep of endpoints) {
    try {
      const data = await fetchJson(ep);
      if (data?.status === 'success' && Array.isArray(data.data)) {
        events.push(...data.data.map(matchToEvent).filter(Boolean));
      }
    } catch (err) {
      logger.warn({ err: err.message, ep }, 'Cricket endpoint failed');
    }
  }

  const unique = [...new Map(events.map((e) => [e.externalId, e])).values()];
  logger.info({ count: unique.length }, 'Cricket matches fetched');
  return unique;
}

module.exports = { fetchMatches };
