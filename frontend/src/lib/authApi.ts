/**
 * Auth & user API calls — all go through /api/* Next.js rewrite.
 */

async function authFetch(path: string, options: RequestInit = {}, token: string | null = null): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || `HTTP ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return data;
}

export const authApi = {
  register: (email: string, password: string, name: string): Promise<any> =>
    authFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string): Promise<any> =>
    authFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  googleLogin: (idToken: string): Promise<any> =>
    authFetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  refresh: (refreshToken: string): Promise<{ token: string; refreshToken: string }> =>
    authFetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logout: (refreshToken: string | null): Promise<any> =>
    authFetch('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  getMe: (token: string): Promise<any> =>
    authFetch('/api/auth/me', { method: 'GET' }, token),

  getPreferences: (token: string): Promise<any> =>
    authFetch('/api/user/preferences', { method: 'GET' }, token),

  savePreferences: (token: string, categoryIds: string[]): Promise<any> =>
    authFetch('/api/user/preferences', {
      method: 'PUT',
      body: JSON.stringify({ categoryIds }),
    }, token),

  getBookmarks: (token: string, page = 1): Promise<any> =>
    authFetch(`/api/user/bookmarks?page=${page}`, { method: 'GET' }, token),

  addBookmark: (token: string, eventId: string): Promise<any> =>
    authFetch('/api/user/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    }, token),

  removeBookmark: (token: string, eventId: string): Promise<any> =>
    authFetch(`/api/user/bookmarks/${eventId}`, { method: 'DELETE' }, token),

  getReminders: (token: string): Promise<any> =>
    authFetch('/api/user/reminders', { method: 'GET' }, token),

  addReminder: (token: string, eventId: string, remindBefore = 30): Promise<any> =>
    authFetch('/api/user/reminders', {
      method: 'POST',
      body: JSON.stringify({ eventId, remindBefore }),
    }, token),

  removeReminder: (token: string, id: string): Promise<any> =>
    authFetch(`/api/user/reminders/${id}`, { method: 'DELETE' }, token),
};
