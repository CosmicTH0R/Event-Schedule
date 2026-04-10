/** Shared TypeScript interfaces for the EventPulse frontend */

export interface Subcategory {
  id: string;
  name: string;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  subcategories?: Subcategory[];
}

export interface Event {
  id: string;
  source?: string | null;
  title: string;
  description?: string | null;
  date: string;
  time?: string | null;
  endTime?: string | null;
  venue?: string | null;
  location?: string | null;
  image?: string | null;
  tags?: string[];
  categoryId?: string | null;
  categoryName?: string | null;
  categoryIcon?: string | null;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  subcategoryIcon?: string | null;
  status?: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T = Event> {
  data: T[];
  pagination: Pagination;
  fallbackDate?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface Reminder {
  id: string;
  eventId: string;
  remindBefore?: number;
  remindAt?: string;
}
