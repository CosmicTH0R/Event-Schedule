'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/authApi';
import useStore from '@/store/useStore';
import type { User, Reminder } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  bookmarks: string[];
  reminders: Reminder[];
  setAuth: (user: User, token: string, refreshToken: string) => void;
  syncUserData: (token?: string | null) => Promise<void>;
  logout: () => void;
  setBookmarks: (bookmarks: Array<{ eventId?: string; id?: string }>) => void;
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

      syncUserData: async (tokenOverride?: string | null) => {
        const activeToken = tokenOverride ?? get().token;
        if (!activeToken) return;

        try {
          const [bookmarksResult, remindersResult, preferencesResult] = await Promise.all([
            authApi.getBookmarks(activeToken),
            authApi.getReminders(activeToken),
            authApi.getPreferences(activeToken),
          ]);

          const bookmarkRows = Array.isArray(bookmarksResult?.data)
            ? bookmarksResult.data
            : [];
          const reminderRows = Array.isArray(remindersResult)
            ? remindersResult
            : [];
          const preferenceRows = Array.isArray(preferencesResult)
            ? preferencesResult
            : [];

          set({
            bookmarks: bookmarkRows
              .map((bookmark: { eventId?: string; id?: string }) => bookmark.eventId ?? bookmark.id)
              .filter((eventId: string | undefined): eventId is string => typeof eventId === 'string' && eventId.length > 0),
            reminders: reminderRows,
          });

          useStore
            .getState()
            .setSelectedCategories(
              preferenceRows
                .map((preference: { categoryId?: string }) => preference.categoryId)
                .filter((categoryId: string | undefined): categoryId is string => typeof categoryId === 'string' && categoryId.length > 0)
            );
        } catch {
          // Keep the current session even if one of the sync requests fails.
        }
      },

      logout: () => {
        const { refreshToken } = get();
        authApi.logout(refreshToken).catch(() => {});
        set({ user: null, token: null, refreshToken: null, bookmarks: [], reminders: [] });
        useStore.getState().setSelectedCategories([]);
      },

      setBookmarks: (bookmarks: Array<{ eventId?: string; id?: string }>) =>
        set({
          bookmarks: bookmarks
            .map((bookmark) => bookmark.eventId ?? bookmark.id)
            .filter((eventId: string | undefined): eventId is string => typeof eventId === 'string' && eventId.length > 0),
        }),

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
          await get().syncUserData(data.token);
          return data.token;
        } catch {
          useStore.getState().setSelectedCategories([]);
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
