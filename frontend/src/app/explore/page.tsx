'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EventCard from '@/components/EventCard';
import SkeletonCard from '@/components/SkeletonCard';
import { api } from '@/lib/api';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Event, Pagination, Category, Subcategory } from '@/types';

const SKELETONS = Array.from({ length: 8 });

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeCat = searchParams.get('cat');
  const activeSub = searchParams.get('sub');

  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeCat && !activeSub) { setLoading(false); return; }
    setLoading(true);
    setPage(1);
    setEvents([]);
    fetchPage(1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCat, activeSub]);

  async function fetchPage(p: number, append = false) {
    try {
      const result = activeSub
        ? await api.getEventsBySubcategory(activeSub, p)
        : await api.getEventsByCategory(activeCat!, p);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, pagination, page, activeCat, activeSub]);

  const sentinelRef = useInfiniteScroll(loadMore, !!pagination?.hasNext && !loading);

  const selectedCategory = categories.find((c) => c.id === activeCat);

  // ── Category grid (no cat selected) ────────────────────────────────────────
  if (!activeCat) {
    return (
      <div className="view-wrapper">
        <div className="view-header">
          <h1>Explore</h1>
          <p className="view-subtitle">Browse all categories and discover events</p>
        </div>
        <div className="categories-grid">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="category-card"
              onClick={() => router.push(`/explore?cat=${cat.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/explore?cat=${cat.id}`)}
            >
              <div className="category-card-icon">{cat.icon}</div>
              <div className="category-card-name">{cat.name}</div>
              <div className="category-card-subs">
                {cat.subcategories?.map((s: Subcategory) => (
                  <span key={s.id} className="sub-chip">{s.icon} {s.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Category detail view ────────────────────────────────────────────────────
  return (
    <div className="view-wrapper">
      <div className="view-header">
        <button
          style={{ color: 'var(--accent-light)', fontSize: '0.9rem', marginBottom: '12px', display: 'block' }}
          onClick={() => router.push('/explore')}
        >
          ← Back to Categories
        </button>
        <h1>{selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : activeCat}</h1>
        <p className="view-subtitle">All upcoming events</p>
      </div>

      {/* Subcategory filter chips */}
      {selectedCategory?.subcategories && (
        <div className="feed-filters">
          <button
            className={`filter-chip ${!activeSub ? 'active' : ''}`}
            onClick={() => router.push(`/explore?cat=${activeCat}`)}
          >
            All
          </button>
          {selectedCategory.subcategories.map((sub: Subcategory) => (
            <button
              key={sub.id}
              className={`filter-chip ${activeSub === sub.id ? 'active' : ''}`}
              onClick={() => router.push(`/explore?cat=${activeCat}&sub=${sub.id}`)}
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
              <div className="empty-state-text">No events found</div>
            </div>
          )
          : events.map((ev) => <EventCard key={ev.id} event={ev} />)
        }
        {loadingMore && SKELETONS.map((_, i) => <SkeletonCard key={`more-${i}`} />)}
      </div>

      {/* Infinite scroll sentinel — replaces the manual Load More button */}
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="view-wrapper"><p style={{ color: 'var(--text-muted)' }}>Loading...</p></div>}>
      <ExploreContent />
    </Suspense>
  );
}
