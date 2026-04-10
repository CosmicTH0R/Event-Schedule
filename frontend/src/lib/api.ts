/**
 * API client — calls /api/* which Next.js rewrites to the Express backend.
 * All functions return { data, pagination } or throw an Error.
 */

async function apiFetch(path: string): Promise<any> {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getCategories: () =>
    apiFetch('/api/categories'),

  getTodayEvents: (page = 1, limit = 20) =>
    apiFetch(`/api/events/today?page=${page}&limit=${limit}`),

  getUpcomingEvents: (catIds: string[] = [], page = 1, limit = 20): Promise<any> =>
    apiFetch(`/api/events/upcoming?cats=${catIds.join(',')}&page=${page}&limit=${limit}`),

  searchEvents: (query: string, page = 1, limit = 20): Promise<any> =>
    apiFetch(`/api/events?search=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),

  getEventsByCategory: (catId: string, page = 1, limit = 20): Promise<any> =>
    apiFetch(`/api/events?category=${catId}&page=${page}&limit=${limit}`),

  getEventsBySubcategory: (subId: string, page = 1, limit = 20): Promise<any> =>
    apiFetch(`/api/events?subcategory=${subId}&page=${page}&limit=${limit}`),

  getEventsByDate: (date: string, page = 1, limit = 20): Promise<any> =>
    apiFetch(`/api/events?date=${date}&page=${page}&limit=${limit}`),

  getEventById: (id: string): Promise<any> =>
    apiFetch(`/api/events/${id}`),

  getLiveEvents: () =>
    apiFetch('/api/events/live'),

  getHealth: () =>
    apiFetch('/api/health'),
};
