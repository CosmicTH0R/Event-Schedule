'use client';

import { useLiveEvents } from '@/hooks/useLiveEvents';
import useStore from '@/store/useStore';
import type { Event } from '@/types';

/**
 * LiveBanner — a sticky top banner that shows currently-live events.
 * Uses the SSE stream (useLiveEvents) so it updates in real time without
 * any manual polling.
 *
 * Renders nothing when there are no live events.
 */
export default function LiveBanner() {
  const { liveEvents } = useLiveEvents();
  const { openModal } = useStore();

  if (liveEvents.length === 0) return null;

  return (
    <div className="live-banner" role="region" aria-label="Live events">
      <span className="live-banner-dot" aria-hidden="true" />
      <span className="live-banner-label">LIVE NOW</span>
      <div className="live-banner-events">
        {liveEvents.map((ev: Event) => (
          <button
            key={ev.id}
            className="live-banner-item"
            onClick={() => openModal(ev)}
            aria-label={`${ev.title} — view details`}
          >
            <span className="live-banner-icon">{ev.categoryIcon ?? '🏆'}</span>
            <span className="live-banner-title">{ev.title}</span>
            {ev.venue && (
              <span className="live-banner-venue">· {ev.venue}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
