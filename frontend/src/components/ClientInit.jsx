'use client';

import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

export default function ClientInit() {
  const { theme } = useTheme();

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {/* ignore registration errors in dev */});
    }
  }, []);

  // theme applied by useTheme hook via data-theme attribute
  return null;
}
