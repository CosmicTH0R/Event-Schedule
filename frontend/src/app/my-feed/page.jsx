'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import EventCard from '@/components/EventCard';
import SkeletonCard from '@/components/SkeletonCard';
import { api } from '@/lib/api';
import useStore from '@/store/useStore';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const SKELETONS = Array.from({ length: 8 });

export default function MyFeedPage() {
  const { selectedCategories } = useStore();
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeSub, setActiveSub] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [page, setPage] = useState(1);

  // Load categories for filter chips
  useEffect(() => {
    api.getCategories().then(setAllCategories).catch(() => {});
  }, []);

  // Load events whenever selected categories or active subcategory changes
  useEffect(() => {
    if (selectedCategories.length === 0) { setLoading(false); return; }
    setLoading(true);
    setPage(1);
    fetchPage(1, false);
  }, [selectedCategories, activeSub]);

  async function fetchPage(p, append = false) {
    try {
      let result;
      if (activeSub) {
        result = await api.getEventsBySubcategory(activeSub, p);
      } else {
        result = await api.getUpcomingEvents(selectedCategories, p);
      }
      setEvents((prev) => (append ? [...prev, ...result.data] : result.data));
      setPagination(result.pagination);
    } catch {}
    finally { setLoading(false); }
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !pagination?.hasNext) return;
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    await fetchPage(next, true);
    setLoadingMore(false);
  }, [loadingMore, pagination, page, activeSub]);

  const sentinelRef = useInfiniteScroll(loadMore, !!pagination?.hasNext && !loading);

  // Build subcategory filter chips from subscribed categories
  const subscribedCats = allCategories.filter((c) => selectedCategories.includes(c.id));
  const allSubs = subscribedCats.flatMap((c) => c.subcategories || []);

  if (selectedCategories.length === 0) {
    return (
      <div className="view-wrapper">
        <div className="view-header">
          <h1>My Feed</h1>
          <p className="view-subtitle">Upcoming events from your favourite categories</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">⭐</div>
          <div className="empty-state-text">No categories selected yet</div>
          <div className="empty-state-sub">
            <Link href="/preferences" style={{ color: 'var(--accent-light)' }}>
              Go to Preferences →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-wrapper">
      <div className="view-header">
        <h1>My Feed</h1>
        <p className="view-subtitle">Upcoming events from your favourite categories</p>
      </div>

      {/* Subcategory filter chips */}
      {allSubs.length > 0 && (
        <div className="feed-filters">
          <button
            className={`filter-chip ${!activeSub ? 'active' : ''}`}
            onClick={() => { setActiveSub(null); }}
          >
            All
          </button>
          {allSubs.map((sub) => (
            <button
              key={sub.id}
              className={`filter-chip ${activeSub === sub.id ? 'active' : ''}`}
              onClick={() => setActiveSub(activeSub === sub.id ? null : sub.id)}
            >
              {sub.icon} {sub.name}
            </button>
          ))}
        </div>
      )}

      <div className="events-grid">
        {loading
          ? SKELETONS.map((_, i) => <SkeletonCard key={i} />)
          : events.length === 0
          ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">No upcoming events in selected categories</div>
            </div>
          )
          : events.map((ev) => <EventCard key={ev.id} event={ev} />)
        }
        {loadingMore && SKELETONS.map((_, i) => <SkeletonCard key={`more-${i}`} />)}
      </div>

      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
    </div>
  );
}
