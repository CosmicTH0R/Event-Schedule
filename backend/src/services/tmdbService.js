/**
 * tmdbService.js — Movies & TV Shows via TMDB API
 * Requires TMDB_API_KEY in .env
 */
const { normalizeEvent } = require('../utils/normalizer');
const logger = require('../utils/logger');
const config = require('../config');

const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w500';

async function fetchJson(path, params = {}) {
  const key = config.apiKeys.tmdb;
  if (!key) throw new Error('TMDB_API_KEY not configured');

  const qs = new URLSearchParams({ api_key: key, language: 'en-US', ...params });
  const url = `${BASE}${path}?${qs}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json();
}

function guessSubcategory(item) {
  const title = (item.title || item.name || '').toLowerCase();
  const genres = (item.genre_ids || []);
  // Simple heuristic — production companies not available in list endpoints
  if (genres.includes(16)) return 'anime-movies'; // Animation
  if (title.match(/\b(bollywood|hindi|shah rukh|salman|amitabh)\b/)) return 'bollywood';
  return 'hollywood';
}

function movieToEvent(movie) {
  const release = movie.release_date || '';
  if (!release) return null;
  return normalizeEvent({
    externalId: `tmdb-movie-${movie.id}`,
    source: 'tmdb',
    categoryId: 'movies',
    subcategoryId: guessSubcategory(movie),
    title: movie.title,
    description: movie.overview || '',
    date: release,
    time: '00:00',
    endTime: '',
    venue: 'In Theaters',
    location: 'Worldwide',
    imageUrl: movie.poster_path ? `${IMG}${movie.poster_path}` : '',
    tags: ['movie', movie.vote_average >= 7 ? 'top-rated' : 'upcoming'],
    status: 'upcoming',
  });
}

function tvToEvent(show, subcategoryId = 'netflix') {
  if (!show.first_air_date) return null;
  // For currently-airing/trending shows, use today as the date so they sort
  // at the top alongside other current events rather than by premiere year.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const firstAir = show.first_air_date;
  // Only use today if the show premiered in the past (already airing)
  const date = firstAir < today ? today : firstAir;
  return normalizeEvent({
    externalId: `tmdb-tv-${show.id}`,
    source: 'tmdb',
    categoryId: 'tv-shows',
    subcategoryId,
    title: show.name,
    description: show.overview || '',
    date,
    time: '00:00',
    endTime: '',
    venue: 'Streaming',
    location: 'Worldwide',
    imageUrl: show.poster_path ? `${IMG}${show.poster_path}` : '',
    tags: ['tv-show', 'streaming'],
    status: 'upcoming',
  });
}

async function fetchMovies() {
  const events = [];
  const pages = [
    fetchJson('/movie/upcoming', { page: 1 }),
    fetchJson('/movie/now_playing', { page: 1 }),
    fetchJson('/trending/movie/week'),
  ];
  const results = await Promise.allSettled(pages);

  for (const r of results) {
    if (r.status === 'fulfilled') {
      const items = r.value?.results || [];
      events.push(...items.map(movieToEvent).filter(Boolean));
    }
  }

  const unique = [...new Map(events.map((e) => [e.externalId, e])).values()];
  logger.info({ count: unique.length }, 'TMDB movies fetched');
  return unique;
}

async function fetchTVShows() {
  const events = [];
  const pages = [
    fetchJson('/tv/airing_today', { page: 1 }),
    fetchJson('/tv/on_the_air', { page: 1 }),
    fetchJson('/trending/tv/week'),
  ];
  const results = await Promise.allSettled(pages);

  for (const r of results) {
    if (r.status === 'fulfilled') {
      const items = r.value?.results || [];
      events.push(...items.map((s) => tvToEvent(s)).filter(Boolean));
    }
  }

  const unique = [...new Map(events.map((e) => [e.externalId, e])).values()];
  logger.info({ count: unique.length }, 'TMDB TV shows fetched');
  return unique;
}

module.exports = { fetchMovies, fetchTVShows };
