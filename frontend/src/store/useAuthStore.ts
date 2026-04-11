'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/authApi';
import type { User, Reminder } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  bookmarks: string[];
  reminders: Reminder[];
  setAuth: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  setBookmarks: (bookmarks: Array<{ eventId: string }>) => void;
  addBookmark: (eventId: string) => void;
  removeBookmark: (eventId: string) => void;
  setReminders: (reminders: Reminder[]) => void;
  addReminder: (reminder: Reminder) => void;
  removeReminder: (id: string) => void;
  /** Silently rotate the access token using the stored refresh token.
   *  Returns the new access token, or null if refresh fails (user is logged out). */
  silentRefresh: () => Promise<string | null>;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      bookmarks: [],
      reminders: [],

      setAuth: (user: User, token: string, refreshToken: string) =>
        set({ user, token, refreshToken }),

      logout: () => {
        const { refreshToken } = get();
        authApi.logout(refreshToken).catch(() => {});
        set({ user: null, token: null, refreshToken: null, bookmarks: [], reminders: [] });
      },

      setBookmarks: (bookmarks: Array<{ eventId: string }>) =>
        set({ bookmarks: bookmarks.map((b) => b.eventId) }),

      addBookmark: (eventId: string) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(eventId)
            ? s.bookmarks
            : [...s.bookmarks, eventId],
        })),

      removeBookmark: (eventId: string) =>
        set((s) => ({ bookmarks: s.bookmarks.filter((id) => id !== eventId) })),

      setReminders: (reminders: Reminder[]) => set({ reminders }),

      addReminder: (reminder: Reminder) =>
        set((s) => ({ reminders: [...s.reminders, reminder] })),

      removeReminder: (id: string) =>
        set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),

      silentRefresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return null;
        try {
          const data = await authApi.refresh(refreshToken);
          set({ token: data.token, refreshToken: data.refreshToken });
          return data.token;
        } catch {
          set({ user: null, token: null, refreshToken: null, bookmarks: [], reminders: [] });
          return null;
        }
      },
    }),
    {
      name: 'eventpulse-auth-v2',
      partialize: (s) => ({ user: s.user, token: s.token, refreshToken: s.refreshToken }),
    }
  )
);

export default useAuthStore;
