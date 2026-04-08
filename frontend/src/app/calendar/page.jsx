'use client';

import { useState } from 'react';
import EventCard from '@/components/EventCard';
import SkeletonCard from '@/components/SkeletonCard';
import { api } from '@/lib/api';
import { todayStr } from '@/lib/utils';

const SKELETONS = Array.from({ length: 6 });

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchDate(d, p = 1, append = false) {
    try {
      const result = await api.getEventsByDate(d, p);
      setEvents((prev) => (append ? [...prev, ...result.data] : result.data));
      setPagination(result.pagination);
    } catch {}
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedDate) return;
    setLoading(true);
    setSearched(true);
    setPage(1);
    fetchDate(selectedDate, 1, false);
  }

  async function loadMore() {
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    await fetchDate(selectedDate, next, true);
  }

  return (
    <div className="view-wrapper">
      <div className="view-header">
        <h1>Calendar</h1>
        <p className="view-subtitle">Browse events by date</p>
      </div>

      <form className="calendar-controls" onSubmit={handleSubmit}>
        <input
          type="date"
          className="date-picker"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setSearched(false);
            setEvents([]);
          }}
          min="2020-01-01"
          max="2030-12-31"
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Loading...' : 'Show Events'}
        </button>
      </form>

      {searched && (
        <div className="events-grid" style={{ marginTop: '32px' }}>
          {loading
            ? SKELETONS.map((_, i) => <SkeletonCard key={i} />)
            : events.length === 0
            ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-text">No events on this date</div>
                <div className="empty-state-sub">Try a different date</div>
              </div>
            )
            : events.map((ev) => <EventCard key={ev.id} event={ev} />)
          }
          {loadingMore && SKELETONS.map((_, i) => <SkeletonCard key={`more-${i}`} />)}
        </div>
      )}

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
