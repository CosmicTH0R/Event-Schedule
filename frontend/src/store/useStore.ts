'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Event } from '@/types';

interface StoreState {
  selectedCategories: string[];
  modalEvent: Event | null;
  sidebarOpen: boolean;
  toggleCategory: (catId: string) => void;
  openModal: (event: Event) => void;
  closeModal: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      /** Array of category IDs the user has subscribed to */
      selectedCategories: [],

      /** Currently open event modal — null means closed */
      modalEvent: null,

      /** Sidebar open state (mobile) */
      sidebarOpen: false,

      toggleCategory: (catId: string) => {
        const current = get().selectedCategories;
        set({
          selectedCategories: current.includes(catId)
            ? current.filter((id) => id !== catId)
            : [...current, catId],
        });
      },

      openModal: (event: Event) => set({ modalEvent: event }),
      closeModal: () => set({ modalEvent: null }),

      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: 'eventpulse-v1',
      // Only persist user preferences — not UI state
      partialize: (state) => ({ selectedCategories: state.selectedCategories }),
    }
  )
);

export default useStore;
