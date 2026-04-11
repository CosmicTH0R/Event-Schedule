/**
 * normalizer.test.ts — unit tests for normalizeEvent & serializeEvent
 */
import { describe, it, expect } from 'vitest';
import { normalizeEvent, serializeEvent } from '../utils/normalizer';
import type { CachedEvent } from '@prisma/client';

// ─── normalizeEvent ───────────────────────────────────────────────────────────

describe('normalizeEvent', () => {
  const base = {
    externalId: 'evt-1',
    source: 'f1',
    categoryId: 'sports',
    subcategoryId: 'f1',
    title: 'Monaco Grand Prix',
    description: 'Formula 1 street circuit race',
    date: '2026-05-25',
    time: '14:00',
    endTime: '16:30',
    venue: 'Circuit de Monaco',
    location: 'Monaco',
    imageUrl: 'https://example.com/monaco.jpg',
    tags: ['race', 'f1'] as string[],
    status: 'upcoming',
  };

  it('converts a full raw event correctly', () => {
    const result = normalizeEvent(base);
    expect(result.externalId).toBe('evt-1');
    expect(result.title).toBe('Monaco Grand Prix');
    expect(result.tags).toEqual(['race', 'f1']);
    expect(result.status).toBe('upcoming');
    expect(result.date).toBe('2026-05-25');
  });

  it('accepts a Date object for date', () => {
    const result = normalizeEvent({ ...base, date: new Date('2026-05-25T10:00:00Z') });
    expect(result.date).toBe('2026-05-25');
  });

  it('converts pipe-separated tag string to array (legacy seed compat)', () => {
    const result = normalizeEvent({ ...base, tags: 'race|live' as any });
    expect(result.tags).toEqual(['race', 'live']);
  });

  it('handles null/undefined tags', () => {
    const result = normalizeEvent({ ...base, tags: null });
    expect(result.tags).toEqual([]);
  });

  it('sets a default status of "upcoming"', () => {
    const result = normalizeEvent({ ...base, status: null });
    expect(result.status).toBe('upcoming');
  });

  it('truncates title to 255 chars', () => {
    const longTitle = 'A'.repeat(300);
    const result = normalizeEvent({ ...base, title: longTitle });
    expect(result.title.length).toBe(255);
  });

  it('truncates description to 1000 chars', () => {
    const long = 'B'.repeat(1200);
    const result = normalizeEvent({ ...base, description: long });
    expect(result.description.length).toBe(1000);
  });

  it('sets expiresAt 2 days after event date', () => {
    const result = normalizeEvent(base);
    const expected = new Date('2026-05-27');
    expect(result.expiresAt.toISOString().split('T')[0]).toBe('2026-05-27');
    expect(result.expiresAt >= expected).toBe(true);
  });

  it('coerces numeric externalId to string', () => {
    const result = normalizeEvent({ ...base, externalId: 42 as any });
    expect(result.externalId).toBe('42');
  });
});

// ─── serializeEvent ───────────────────────────────────────────────────────────

describe('serializeEvent', () => {
  const dbRow: CachedEvent = {
    id: 'cuid-1',
    externalId: 'evt-1',
    source: 'f1',
    categoryId: 'sports',
    subcategoryId: 'f1',
    title: 'Monaco GP',
    description: 'Race',
    date: '2026-05-25',
    time: '14:00',
    endTime: '16:30',
    venue: 'Monaco',
    location: 'Monaco',
    imageUrl: 'https://example.com/img.jpg',
    tags: ['race', 'live'],
    status: 'live',
    fetchedAt: new Date(),
    expiresAt: new Date('2026-05-27'),
  };

  it('maps externalId to id', () => {
    const s = serializeEvent(dbRow, 'Sports', '🏆', 'Formula 1', '🏎️');
    expect(s.id).toBe('evt-1');
  });

  it('includes category fields', () => {
    const s = serializeEvent(dbRow, 'Sports', '🏆', 'Formula 1', '🏎️');
    expect(s.categoryName).toBe('Sports');
    expect(s.categoryIcon).toBe('🏆');
    expect(s.subcategoryName).toBe('Formula 1');
    expect(s.subcategoryIcon).toBe('🏎️');
  });

  it('returns tags as array', () => {
    const s = serializeEvent(dbRow, 'Sports', '🏆', 'F1', '🏎️');
    expect(s.tags).toEqual(['race', 'live']);
  });

  it('handles empty tags array', () => {
    const s = serializeEvent({ ...dbRow, tags: [] }, 'Sports', '🏆', 'F1', '🏎️');
    expect(s.tags).toEqual([]);
  });

  it('uses fallback icons when category not found', () => {
    const s = serializeEvent(dbRow, '', '', '', '');
    expect(s.categoryIcon).toBe('📌');
    expect(s.subcategoryIcon).toBe('📌');
  });

  it('maps imageUrl to image', () => {
    const s = serializeEvent(dbRow, 'Sports', '🏆', 'F1', '🏎️');
    expect(s.image).toBe('https://example.com/img.jpg');
  });
});
