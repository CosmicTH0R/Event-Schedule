'use client';

import { useState, useEffect, useCallback } from 'react';
import EventCard from '@/components/EventCard';
import SkeletonCard from '@/components/SkeletonCard';
import { api } from '@/lib/api';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useLiveEvents } from '@/hooks/useLiveEvents';

const SKELETONS = Array.from({ length: 8 });

export default function TodayPage() {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [fallbackDate, setFallbackDate] = useState(null);

  const { liveIds } = useLiveEvents(60_000);

  async function fetchPage(p, append = false) {
    try {
      const result = await api.getTodayEvents(p);
      setEvents((prev) => (append ? [...prev, ...result.data] : result.data));
      setPagination(result.pagination);
      if (result.fallbackDate) setFallbackDate(result.fallbackDate);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchPage(1).finally(() => setLoading(false));
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !pagination?.hasNext) return;
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    await fetchPage(next, true);
    setLoadingMore(false);
  }, [loadingMore, pagination, page]);

  const sentinelRef = useInfiniteScroll(loadMore, !!pagination?.hasNext && !loading);

  // Enrich events with live status
  const enriched = events.map((ev) =>
    liveIds.has(ev.id) ? { ...ev, tags: [...(ev.tags || []), 'live'].filter((v, i, a) => a.indexOf(v) === i) } : ev
  );

  return (
    <div className="view-wrapper">
      <div className="view-header">
        <h1>Today&apos;s Events</h1>
        {fallbackDate ? (
          <p className="view-subtitle">No events today — showing next available events on <strong>{new Date(fallbackDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}</strong></p>
        ) : (
          <p className="view-subtitle">Everything happening today — your personalized daily feed</p>
        )}
      </div>

      {error && (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-text">Could not load events</div>
          <div className="empty-state-sub">{error}</div>
        </div>
      )}

      <div className="events-grid">
        {loading
          ? SKELETONS.map((_, i) => <SkeletonCard key={i} />)
          : enriched.length === 0
          ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">No events scheduled for today</div>
              <div className="empty-state-sub">Check back later or browse upcoming events</div>
            </div>
          )
          : enriched.map((ev) => <EventCard key={ev.id} event={ev} />)
        }
        {loadingMore && SKELETONS.map((_, i) => <SkeletonCard key={`more-${i}`} />)}
      </div>

      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
    </div>
  );
}
