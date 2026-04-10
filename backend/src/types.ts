/**
 * Global type declarations — Express Request augmentation and shared interfaces.
 */

import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; email: string };
  }
}

// ─── Shared data shapes ──────────────────────────────────────────────────────

export interface NormalizedEvent {
  externalId: string;
  source: string;
  categoryId: string;
  subcategoryId: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endTime: string;
  venue: string;
  location: string;
  imageUrl: string;
  tags: string;
  status: string;
  expiresAt: Date;
}

export interface SerializedEvent {
  id: string;
  source: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  subcategoryId: string;
  subcategoryName: string;
  subcategoryIcon: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endTime: string;
  venue: string;
  location: string;
  image: string;
  tags: string[];
  status: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  fallbackDate?: string;
}

export interface CategoryMap {
  [id: string]: { name: string; icon: string };
}
