'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
      /** Array of category IDs the user has subscribed to */
      selectedCategories: [],

      /** Currently open event modal — null means closed */
      modalEvent: null,

      /** Sidebar open state (mobile) */
      sidebarOpen: false,

      toggleCategory: (catId) => {
        const current = get().selectedCategories;
        set({
          selectedCategories: current.includes(catId)
            ? current.filter((id) => id !== catId)
            : [...current, catId],
        });
      },

      openModal: (event) => set({ modalEvent: event }),
      closeModal: () => set({ modalEvent: null }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
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
