/**
 * normalizer.ts
 * Converts raw data from any external API into the unified CachedEvent DB shape.
 */

import type { NormalizedEvent, SerializedEvent } from '../types';
import type { CachedEvent } from '@prisma/client';

interface RawEvent {
  externalId: string | number;
  source?: string;
  categoryId: string;
  subcategoryId: string;
  title?: string | null;
  description?: string | null;
  date: string | Date;
  time?: string | null;
  endTime?: string | null;
  venue?: string | null;
  location?: string | null;
  imageUrl?: string | null;
  tags?: string[] | string | null;
  status?: string | null;
}

export function normalizeEvent(raw: RawEvent): NormalizedEvent {
  const dateStr =
    raw.date instanceof Date
      ? raw.date.toISOString().split('T')[0]
      : String(raw.date);

  const expiresAt = new Date(dateStr);
  expiresAt.setDate(expiresAt.getDate() + 2);

  return {
    externalId: String(raw.externalId),
    source: raw.source ?? 'unknown',
    categoryId: raw.categoryId,
    subcategoryId: raw.subcategoryId,
    title: String(raw.title ?? '').slice(0, 255),
    description: String(raw.description ?? '').slice(0, 1000),
    date: dateStr,
    time: raw.time ?? '00:00',
    endTime: raw.endTime ?? '',
    venue: raw.venue ?? '',
    location: raw.location ?? '',
    imageUrl: raw.imageUrl ?? '',
    tags: Array.isArray(raw.tags)
      ? raw.tags
      : typeof raw.tags === 'string' && raw.tags.length > 0
        ? raw.tags.split('|').filter(Boolean)
        : [],
    status: raw.status ?? 'upcoming',
    expiresAt,
  };
}

export function serializeEvent(
  row: CachedEvent,
  categoryName: string,
  categoryIcon: string,
  subcategoryName: string,
  subcategoryIcon: string
): SerializedEvent {
  return {
    id: row.externalId,
    source: row.source,
    categoryId: row.categoryId,
    categoryName: categoryName || row.categoryId,
    categoryIcon: categoryIcon || '📌',
    subcategoryId: row.subcategoryId,
    subcategoryName: subcategoryName || row.subcategoryId,
    subcategoryIcon: subcategoryIcon || '📌',
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    endTime: row.endTime,
    venue: row.venue,
    location: row.location,
    image: row.imageUrl,
    tags: row.tags ?? [],
    status: row.status,
  };
}
