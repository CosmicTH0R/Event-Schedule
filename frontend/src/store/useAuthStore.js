'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      bookmarks: [],    // array of eventId strings
      reminders: [],    // array of { id, eventId, remindBefore, remindAt }

      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null, bookmarks: [], reminders: [] }),

      setBookmarks: (bookmarks) =>
        set({ bookmarks: bookmarks.map((b) => b.eventId ?? b) }),

      addBookmark: (eventId) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(eventId)
            ? s.bookmarks
            : [...s.bookmarks, eventId],
        })),

      removeBookmark: (eventId) =>
        set((s) => ({ bookmarks: s.bookmarks.filter((id) => id !== eventId) })),

      setReminders: (reminders) => set({ reminders }),

      addReminder: (reminder) =>
        set((s) => ({ reminders: [...s.reminders, reminder] })),

      removeReminder: (id) =>
        set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),
    }),
    {
      name: 'eventpulse-auth-v1',
      partialize: (s) => ({ user: s.user, token: s.token }),
    }
  )
);

export default useAuthStore;
