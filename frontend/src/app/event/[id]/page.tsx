/**
 * /event/[id] — shareable event detail page with OpenGraph metadata.
 *
 * The page fetches the event server-side for SEO / link previews.
 * The modal-based flow still works everywhere else — this page gives
 * every event a direct URL.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Event } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getEvent(id: string): Promise<Event | null> {
  try {
    const res = await fetch(`${API_URL}/api/events/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── OpenGraph metadata ────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const event = await getEvent(params.id);
  if (!event) return { title: 'Event not found — EventPulse' };

  return {
    title: `${event.title} — EventPulse`,
    description: event.description ?? `${event.categoryName} event on ${event.date}`,
    openGraph: {
      title: event.title,
      description: event.description ?? undefined,
      images: event.image ? [{ url: event.image }] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: event.description ?? undefined,
      images: event.image ? [event.image] : [],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const event = await getEvent(params.id);
  if (!event) notFound();

  const isLive = event.tags?.includes('live');

  const fallbackSvg = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400"><rect fill="#1a1a2e" width="800" height="400"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6c5ce7" font-size="100">${event.categoryIcon ?? '📌'}</text></svg>`
  )}`;

  return (
    <div className="view-wrapper">
      <Link
        href={event.categoryId ? `/explore?cat=${event.categoryId}` : '/explore'}
        style={{ color: 'var(--accent-light)', fontSize: '0.9rem', display: 'inline-block', marginBottom: '16px' }}
      >
        ← Back
      </Link>

      <div className="event-detail-card">
        {/* Hero image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="event-detail-image"
          src={event.image || fallbackSvg}
          alt={event.title}
          onError={undefined}
        />

        <div className="event-detail-body">
          {/* Badges */}
          <div className="event-card-meta" style={{ marginBottom: '12px' }}>
            <span className="event-badge badge-category">
              {event.categoryIcon} {event.subcategoryName}
            </span>
            {isLive && <span className="event-badge badge-live">🔴 Live</span>}
          </div>

          <h1 className="event-detail-title">{event.title}</h1>

          {event.description && (
            <p className="event-detail-desc">{event.description}</p>
          )}

          {/* Meta grid */}
          <div className="event-detail-meta">
            <div className="event-detail-meta-item">
              <span className="event-detail-meta-icon">🗓️</span>
              <span>{new Date(event.date + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                timeZone: 'Asia/Kolkata',
              })}</span>
            </div>

            {event.time && event.time !== '00:00' && (
              <div className="event-detail-meta-item">
                <span className="event-detail-meta-icon">🕐</span>
                <span>{event.time}{event.endTime ? ` – ${event.endTime}` : ''} IST</span>
              </div>
            )}

            {event.venue && (
              <div className="event-detail-meta-item">
                <span className="event-detail-meta-icon">🏟️</span>
                <span>{event.venue}</span>
              </div>
            )}

            {event.location && (
              <div className="event-detail-meta-item">
                <span className="event-detail-meta-icon">📍</span>
                <span>{event.location}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="event-detail-tags">
              {event.tags.map((tag) => (
                <span key={tag} className="event-detail-tag">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
