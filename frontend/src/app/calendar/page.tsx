'use client';

import { useState, useEffect, useCallback } from 'react';
import EventCard from '@/components/EventCard';
import SkeletonCard from '@/components/SkeletonCard';
import { api } from '@/lib/api';
import { todayStr, formatDate } from '@/lib/utils';
import type { Event, Pagination } from '@/types';

const SKELETONS = Array.from({ length: 6 });

// Build a mini calendar grid for the given year/month
function buildCalendarDays(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function CalendarPage() {
  const today = todayStr();
  const [viewYear, setViewYear] = useState(() => parseInt(today.split('-')[0]));
  const [viewMonth, setViewMonth] = useState(() => parseInt(today.split('-')[1]) - 1);
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState<Event[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchDate = useCallback(async (d: string, p = 1, append = false) => {
    try {
      const result = await api.getEventsByDate(d, p);
      setEvents((prev) => (append ? [...prev, ...result.data] : result.data));
      setPagination(result.pagination);
    } catch {}
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Auto-fetch whenever selected date changes
  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchDate(selectedDate, 1, false);
  }, [selectedDate, fetchDate]);

  function selectDay(d: number) {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    setSelectedDate(`${viewYear}-${mm}-${dd}`);
    setEvents([]);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  async function loadMore() {
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    await fetchDate(selectedDate, next, true);
  }

  const days = buildCalendarDays(viewYear, viewMonth);
  const selectedDay = selectedDate.startsWith(`${viewYear}-${String(viewMonth+1).padStart(2,'0')}`)
    ? parseInt(selectedDate.split('-')[2])
    : null;
  const todayDay = today.startsWith(`${viewYear}-${String(viewMonth+1).padStart(2,'0')}`)
    ? parseInt(today.split('-')[2])
    : null;

  const displayDate = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : '';

  return (
    <div className="view-wrapper">
      <div className="view-header">
        <h1>Calendar</h1>
        <p className="view-subtitle">Pick a date to see events</p>
      </div>

      {/* Mini calendar */}
      <div className="cal-grid-wrap">
        <div className="cal-header">
          <button className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month">‹</button>
          <span className="cal-month-label">{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button className="cal-nav-btn" onClick={nextMonth} aria-label="Next month">›</button>
        </div>

        <div className="cal-day-names">
          {DAY_NAMES.map(n => <span key={n} className="cal-day-name">{n}</span>)}
        </div>

        <div className="cal-days">
          {days.map((d, i) => (
            <button
              key={i}
              className={[
                'cal-day-cell',
                d === null ? 'cal-day-empty' : '',
                d === todayDay ? 'cal-day-today' : '',
                d === selectedDay ? 'cal-day-selected' : '',
              ].join(' ').trim()}
              onClick={() => d && selectDay(d)}
              disabled={!d}
              aria-label={d ? `${d} ${MONTH_NAMES[viewMonth]}` : undefined}
            >
              {d || ''}
            </button>
          ))}
        </div>
      </div>

      {/* Events for selected date */}
      <div className="cal-events-section">
        <h2 className="cal-events-heading">{displayDate}</h2>

        <div className="events-grid">
          {loading
            ? SKELETONS.map((_, i) => <SkeletonCard key={i} />)
            : events.length === 0
            ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-text">No events on this date</div>
                <div className="empty-state-sub">Try another day</div>
              </div>
            )
            : events.map((ev) => <EventCard key={ev.id} event={ev} />)
          }
          {loadingMore && SKELETONS.map((_, i) => <SkeletonCard key={`more-${i}`} />)}
        </div>
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
