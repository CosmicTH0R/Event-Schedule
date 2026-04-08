/**
 * gamingService.js — Game releases via RAWG API
 * Requires RAWG_API_KEY in .env (free key at rawg.io)
 */
const { normalizeEvent } = require('../utils/normalizer');
const logger = require('../utils/logger');
const config = require('../config');

const BASE = 'https://api.rawg.io/api';

async function fetchJson(path, params = {}) {
  const key = config.apiKeys.rawg;
  if (!key) throw new Error('RAWG_API_KEY not configured');

  const qs = new URLSearchParams({ key, page_size: 40, ...params });
  const res = await fetch(`${BASE}${path}?${qs}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`RAWG ${res.status}: ${path}`);
  return res.json();
}

function gameToEvent(game) {
  const date = game.released || '';
  if (!date) return null;

  const platforms = (game.platforms || [])
    .map((p) => p.platform?.name)
    .filter(Boolean)
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
    imageUrl: game.background_image || '',
    tags: ['game-release', ...platforms.map((p) => p.toLowerCase().replace(/\s+/g, '-')).slice(0, 2)],
    status: 'upcoming',
  });
}

async function fetchUpcomingGames() {
  // Date window: today + 6 months
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 180 * 86400_000).toISOString().split('T')[0];

  const data = await fetchJson('/games', {
    dates: `${today},${future}`,
    ordering: 'released',
  });

  const events = (data?.results || []).map(gameToEvent).filter(Boolean);
  logger.info({ count: events.length }, 'RAWG game releases fetched');
  return events;
}

module.exports = { fetchUpcomingGames };
