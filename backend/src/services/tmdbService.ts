/**
 * tmdbService.ts — Movies & TV Shows via TMDB API
 */
import { normalizeEvent } from '../utils/normalizer';
import logger from '../utils/logger';
import config from '../config';
import type { NormalizedEvent } from '../types';

const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w500';

interface TmdbMovie {
  id: number;
  title?: string;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  genre_ids?: number[];
  vote_average?: number;
}

interface TmdbShow {
  id: number;
  name?: string;
  overview?: string;
  first_air_date?: string;
  poster_path?: string | null;
}

interface TmdbListResponse {
  results?: unknown[];
}

async function fetchJson(path: string, params: Record<string, string> = {}): Promise<TmdbListResponse> {
  const key = config.apiKeys.tmdb;
  if (!key) throw new Error('TMDB_API_KEY not configured');

  const qs = new URLSearchParams({ api_key: key, language: 'en-US', ...params });
  const url = `${BASE}${path}?${qs}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json() as Promise<TmdbListResponse>;
}

function guessSubcategory(item: TmdbMovie): string {
  const title = (item.title ?? '').toLowerCase();
  const genres = item.genre_ids ?? [];
  if (genres.includes(16)) return 'anime-movies';
  if (/\b(bollywood|hindi|shah rukh|salman|amitabh)\b/.test(title)) return 'bollywood';
  return 'hollywood';
}

function movieToEvent(movie: TmdbMovie): NormalizedEvent | null {
  const release = movie.release_date ?? '';
  if (!release) return null;
  return normalizeEvent({
    externalId: `tmdb-movie-${movie.id}`,
    source: 'tmdb',
    categoryId: 'movies',
    subcategoryId: guessSubcategory(movie),
    title: movie.title,
    description: movie.overview ?? '',
    date: release,
    time: '00:00',
    endTime: '',
    venue: 'In Theaters',
    location: 'Worldwide',
    imageUrl: movie.poster_path ? `${IMG}${movie.poster_path}` : '',
    tags: ['movie', (movie.vote_average ?? 0) >= 7 ? 'top-rated' : 'upcoming'],
    status: 'upcoming',
  });
}

function tvToEvent(show: TmdbShow, subcategoryId = 'netflix'): NormalizedEvent | null {
  if (!show.first_air_date) return null;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const firstAir = show.first_air_date;
  const date = firstAir < today ? today : firstAir;
  return normalizeEvent({
    externalId: `tmdb-tv-${show.id}`,
    source: 'tmdb',
    categoryId: 'tv-shows',
    subcategoryId,
    title: show.name,
    description: show.overview ?? '',
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

export async function fetchMovies(): Promise<NormalizedEvent[]> {
  const events: NormalizedEvent[] = [];
  const pages = [
    fetchJson('/movie/upcoming', { page: '1' }),
    fetchJson('/movie/now_playing', { page: '1' }),
    fetchJson('/trending/movie/week'),
  ];
  const results = await Promise.allSettled(pages);

  for (const r of results) {
    if (r.status === 'fulfilled') {
      const items = (r.value?.results ?? []) as TmdbMovie[];
      events.push(...items.map(movieToEvent).filter((e): e is NormalizedEvent => e !== null));
    }
  }

  const unique = [...new Map(events.map((e) => [e.externalId, e])).values()];
  logger.info({ count: unique.length }, 'TMDB movies fetched');
  return unique;
}

export async function fetchTVShows(): Promise<NormalizedEvent[]> {
  const events: NormalizedEvent[] = [];
  const pages = [
    fetchJson('/tv/airing_today', { page: '1' }),
    fetchJson('/tv/on_the_air', { page: '1' }),
    fetchJson('/trending/tv/week'),
  ];
  const results = await Promise.allSettled(pages);

  for (const r of results) {
    if (r.status === 'fulfilled') {
      const items = (r.value?.results ?? []) as TmdbShow[];
      events.push(...items.map((s) => tvToEvent(s)).filter((e): e is NormalizedEvent => e !== null));
    }
  }

  const unique = [...new Map(events.map((e) => [e.externalId, e])).values()];
  logger.info({ count: unique.length }, 'TMDB TV shows fetched');
  return unique;
}
