'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

/**
 * Polls live events every `intervalMs` (default 60s).
 * Returns `{ liveIds }` — a Set of event IDs currently live.
 */
export function useLiveEvents(intervalMs = 60_000): { liveIds: Set<string> } {
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    try {
      const result = await api.getLiveEvents();
      const ids = (result?.data ?? []).map((ev: { id: string }) => ev.id);
      setLiveIds(new Set(ids));
    } catch (_) {
      // silent
    }
  }

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, intervalMs);
    return () => { if (timerRef.current !== null) clearInterval(timerRef.current); };
  }, [intervalMs]);

  return { liveIds };
}
