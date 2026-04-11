'use client';

import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import useAuthStore from '@/store/useAuthStore';

export default function ClientInit() {
  const { theme } = useTheme();
  const { token, syncUserData, silentRefresh } = useAuthStore();

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {/* ignore registration errors in dev */});
    }
  }, []);

  // Proactively refresh the access token when the app loads if we have a
  // stored session — covers the case where the 15-min access token has expired.
  useEffect(() => {
    async function bootstrapSession() {
      if (!token) return;

      let activeToken = token;

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresIn = (payload.exp as number) * 1000 - Date.now();
        if (expiresIn < 2 * 60 * 1000) {
          activeToken = (await silentRefresh()) ?? activeToken;
        }
      } catch {
        activeToken = (await silentRefresh()) ?? activeToken;
      }

      await syncUserData(activeToken);
    }

    bootstrapSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
