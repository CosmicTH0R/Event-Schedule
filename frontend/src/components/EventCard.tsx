'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import useStore from '@/store/useStore';
import useAuthStore from '@/store/useAuthStore';
import { authApi } from '@/lib/authApi';
import { formatDate, formatTime, todayStr } from '@/lib/utils';
import type { Event } from '@/types';

interface Props {
  event: Event;
}

export default function EventCard({ event }: Props) {
  const { openModal } = useStore();
  const { user, token, bookmarks, addBookmark, removeBookmark } = useAuthStore();

  const isLive = event.tags?.includes('live');
  const isRelease = event.tags?.includes('release') || event.tags?.includes('premiere');
  const isToday = event.date === todayStr();
  const isBookmarked = bookmarks.includes(event.id);

  const toggleBookmark = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user || !token) return;
      try {
        if (isBookmarked) {
          await authApi.removeBookmark(token, event.id);
          removeBookmark(event.id);
        } else {
          await authApi.addBookmark(token, event.id);
          addBookmark(event.id);
        }
      } catch (_) {
        // silently ignore
      }
    },
    [user, token, isBookmarked, event.id, addBookmark, removeBookmark]
  );

  const fallbackSrc = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160"><rect fill="#1a1a2e" width="600" height="160"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6c5ce7" font-size="48">${event.categoryIcon || '📌'}</text></svg>`
  )}`;

  return (
    <article
      className="event-card"
      onClick={() => openModal(event)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && openModal(event)}
      aria-label={`View details for ${event.title}`}
    >
      <img
        className="event-card-image"
        src={event.image || fallbackSrc}
        alt={event.title}
        loading="lazy"
        onError={(e) => { e.currentTarget.src = fallbackSrc; }}
      />

      <div className="event-card-body">
        <div className="event-card-meta">
          <span className="event-badge badge-category">
            {event.categoryIcon} {event.subcategoryName}
          </span>
          {isLive && isToday && (
            <span className="event-badge badge-live">Live</span>
          )}
          {isRelease && isToday && (
            <span className="event-badge badge-release">Out Now</span>
          )}
        </div>

        <h3 className="event-card-title">{event.title}</h3>
        <p className="event-card-desc">{event.description}</p>

        <div className="event-card-footer">
          <span className="event-time">
            🕐 {formatDate(event.date)} · {formatTime(event.time)}
          </span>
          <span className="event-venue" title={event.location ?? undefined}>
            📍 {event.location}
          </span>
          {user && (
            <button
              className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
              onClick={toggleBookmark}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark event'}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              {isBookmarked ? '🔖' : '🏷️'}
            </button>
          )}
          <Link
            href={`/event/${event.id}`}
            className="event-share-link"
            title="Open event page"
            onClick={(e) => e.stopPropagation()}
            aria-label="Shareable event page"
          >
            🔗
          </Link>
        </div>
      </div>
    </article>
  );
}
