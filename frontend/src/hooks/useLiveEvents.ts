'use client';

import { useState, useEffect, useRef } from 'react';
import type { Event } from '@/types';

interface LivePayload {
  ids: string[];
  events: Event[];
  timestamp: number;
}

/**
 * Subscribes to the backend Server-Sent Events stream at /api/events/live/stream.
 *
 * - Receives `event: live` messages whenever live status changes in cricket,
 *   football, or F1 (pushed after every cron refresh and every 30 seconds).
 * - `: heartbeat` SSE comments keep the TCP connection alive through proxies.
 * - On connection error, waits with exponential back-off (2 s → 4 s → … → 60 s)
 *   before reconnecting.
 *
 * Returns:
 *   liveIds  — Set of event IDs that are currently live.
 *   liveEvents — Full serialized event objects for a "Now Playing" panel.
 */
export function useLiveEvents(): { liveIds: Set<string>; liveEvents: Event[] } {
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [liveEvents, setLiveEvents] = useState<Event[]>([]);

  const esRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !('EventSource' in window)) return;

    function connect(): void {
      // Close any stale connection before opening a new one
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      const es = new EventSource('/api/events/live/stream');
      esRef.current = es;

      es.addEventListener('live', (e: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(e.data) as LivePayload;
          setLiveIds(new Set(payload.ids));
          setLiveEvents(payload.events);
          retryCount.current = 0; // reset back-off on successful message
        } catch {
          // ignore malformed frames
        }
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;
        // Exponential back-off: 2 s, 4 s, 8 s, 16 s, 32 s, max 60 s
        const delay = Math.min(2_000 * 2 ** retryCount.current, 60_000);
        retryCount.current = Math.min(retryCount.current + 1, 5);
        retryTimerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  return { liveIds, liveEvents };
}
