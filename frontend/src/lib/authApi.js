/**
 * Auth & user API calls — all go through /api/* Next.js rewrite.
 */

async function authFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data;
}

export const authApi = {
  register: (email, password, name) =>
    authFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email, password) =>
    authFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  googleLogin: (idToken) =>
    authFetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  getMe: (token) =>
    authFetch('/api/auth/me', { method: 'GET' }, token),

  getPreferences: (token) =>
    authFetch('/api/user/preferences', { method: 'GET' }, token),

  savePreferences: (token, categoryIds) =>
    authFetch('/api/user/preferences', {
      method: 'PUT',
      body: JSON.stringify({ categoryIds }),
    }, token),

  getBookmarks: (token, page = 1) =>
    authFetch(`/api/user/bookmarks?page=${page}`, { method: 'GET' }, token),

  addBookmark: (token, eventId) =>
    authFetch('/api/user/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    }, token),

  removeBookmark: (token, eventId) =>
    authFetch(`/api/user/bookmarks/${eventId}`, { method: 'DELETE' }, token),

  getReminders: (token) =>
    authFetch('/api/user/reminders', { method: 'GET' }, token),

  addReminder: (token, eventId, remindBefore = 30) =>
    authFetch('/api/user/reminders', {
      method: 'POST',
      body: JSON.stringify({ eventId, remindBefore }),
    }, token),

  removeReminder: (token, id) =>
    authFetch(`/api/user/reminders/${id}`, { method: 'DELETE' }, token),
};
