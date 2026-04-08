'use client';

import { useState, useEffect } from 'react';
import EventCard from '@/components/EventCard';
import SkeletonCard from '@/components/SkeletonCard';
import { api } from '@/lib/api';

const SKELETONS = Array.from({ length: 8 });

export default function TodayPage() {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  async function fetchPage(p, append = false) {
    try {
      const result = await api.getTodayEvents(p);
      setEvents((prev) => (append ? [...prev, ...result.data] : result.data));
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchPage(1).finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    await fetchPage(next, true);
    setLoadingMore(false);
  }

  return (
    <div className="view-wrapper">
      <div className="view-header">
        <h1>Today&apos;s Events</h1>
        <p className="view-subtitle">Everything happening today — your personalized daily feed</p>
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
          : events.length === 0
          ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">No events scheduled for today</div>
              <div className="empty-state-sub">Explore upcoming events or browse categories</div>
            </div>
          )
          : events.map((ev) => <EventCard key={ev.id} event={ev} />)
        }
        {loadingMore && SKELETONS.map((_, i) => <SkeletonCard key={`more-${i}`} />)}
      </div>

      {pagination?.hasNext && !loading && (
        <div className="load-more-wrap">
          <button className="btn btn-primary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
