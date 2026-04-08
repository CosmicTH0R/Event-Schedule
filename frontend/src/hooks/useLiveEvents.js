'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

/**
 * Polls live events every `intervalMs` (default 60s).
 * Returns `{ liveIds }` — a Set of event IDs currently live.
 */
export function useLiveEvents(intervalMs = 60_000) {
  const [liveIds, setLiveIds] = useState(new Set());
  const timerRef = useRef(null);

  async function refresh() {
    try {
      const result = await api.getLiveEvents();
      const ids = (result?.data ?? []).map((ev) => ev.id);
      setLiveIds(new Set(ids));
    } catch (_) {
      // silent
    }
  }

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [intervalMs]);

  return { liveIds };
}
