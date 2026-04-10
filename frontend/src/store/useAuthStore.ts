'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Reminder } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  bookmarks: string[];
  reminders: Reminder[];
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setBookmarks: (bookmarks: Array<{ eventId: string }>) => void;
  addBookmark: (eventId: string) => void;
  removeBookmark: (eventId: string) => void;
  setReminders: (reminders: Reminder[]) => void;
  addReminder: (reminder: Reminder) => void;
  removeReminder: (id: string) => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      bookmarks: [],    // array of eventId strings
      reminders: [],    // array of { id, eventId, remindBefore, remindAt }

      setAuth: (user: User, token: string) => set({ user, token }),
      logout: () => set({ user: null, token: null, bookmarks: [], reminders: [] }),

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
    }),
    {
      name: 'eventpulse-auth-v1',
      partialize: (s) => ({ user: s.user, token: s.token }),
    }
  )
);

export default useAuthStore;
