'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EventCard from '@/components/EventCard';
import SkeletonCard from '@/components/SkeletonCard';
import { api } from '@/lib/api';

const SKELETONS = Array.from({ length: 8 });

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';

  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [lastQ, setLastQ] = useState('');

  useEffect(() => {
    if (!q || q.length < 2) {
      setEvents([]);
      setPagination(null);
      return;
    }
    if (q === lastQ) return;
    setLastQ(q);
    setLoading(true);
    setPage(1);

    api.searchEvents(q, 1)
      .then((result) => {
        setEvents(result.data);
        setPagination(result.pagination);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [q]);

  async function loadMore() {
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    try {
      const result = await api.searchEvents(q, next);
      setEvents((prev) => [...prev, ...result.data]);
      setPagination(result.pagination);
    } catch {}
    finally { setLoadingMore(false); }
  }

  const isEmpty = !loading && q.length >= 2 && events.length === 0;

  return (
    <div className="view-wrapper">
      <div className="view-header">
        <h1>Search Results</h1>
        {q && (
          <p className="view-subtitle">
            {loading
              ? `Searching for "${q}"…`
              : events.length > 0
              ? `${pagination?.total ?? events.length} result${pagination?.total !== 1 ? 's' : ''} for "${q}"`
              : `No results for "${q}"`}
          </p>
        )}
        {!q && (
          <p className="view-subtitle">Use the search bar above to find events</p>
        )}
      </div>

      <div className="events-grid">
        {loading && SKELETONS.map((_, i) => <SkeletonCard key={i} />)}

        {isEmpty && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-text">No events match your search</div>
            <div className="empty-state-sub">Try different keywords — e.g. "F1", "IPL", "Marvel"</div>
          </div>
        )}

        {!loading && events.map((ev) => <EventCard key={ev.id} event={ev} />)}
        {loadingMore && SKELETONS.slice(0, 4).map((_, i) => <SkeletonCard key={`more-${i}`} />)}
      </div>

      {pagination?.hasNext && !loading && (
        <div className="load-more-wrap">
          <button className="btn btn-primary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="view-wrapper"><p style={{ color: 'var(--text-muted)' }}>Loading…</p></div>}>
      <SearchContent />
    </Suspense>
  );
}
