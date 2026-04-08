'use client';

import { useEffect } from 'react';
import useStore from '@/store/useStore';
import { formatDate, formatTime } from '@/lib/utils';

export default function EventModal() {
  const { modalEvent: ev, closeModal } = useStore();

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    if (ev) {
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [ev, closeModal]);

  if (!ev) return null;

  const timeDisplay =
    ev.time === '00:00' || !ev.time
      ? 'All Day'
      : `${formatTime(ev.time)}${ev.endTime ? ` — ${formatTime(ev.endTime)}` : ''}`;

  const fallbackSrc = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 220"><rect fill="#1a1a2e" width="580" height="220"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6c5ce7" font-size="64">${ev.categoryIcon || '📌'}</text></svg>`
  )}`;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && closeModal()}
      role="dialog"
      aria-modal="true"
      aria-label={ev.title}
    >
      <div className="modal">
        <button className="modal-close" onClick={closeModal} aria-label="Close">
          ✕
        </button>

        <img
          className="modal-image"
          src={ev.image || fallbackSrc}
          alt={ev.title}
          onError={(e) => { e.currentTarget.src = fallbackSrc; }}
        />

        <div className="modal-content">
          <div className="modal-tags">
            <span className="event-badge badge-category">
              {ev.categoryIcon} {ev.categoryName}
            </span>
            <span className="event-badge badge-category">
              {ev.subcategoryIcon} {ev.subcategoryName}
            </span>
            {ev.tags?.map((t) => (
              <span key={t} className="event-badge badge-release">
                {t}
              </span>
            ))}
          </div>

          <h2>{ev.title}</h2>

          <div className="modal-info">
            {[
              { icon: '📅', label: 'Date', value: formatDate(ev.date) },
              { icon: '🕐', label: 'Time', value: timeDisplay },
              { icon: '📍', label: 'Venue', value: ev.venue || 'TBD' },
              { icon: '🌍', label: 'Location', value: ev.location },
            ].map(({ icon, label, value }) => (
              <div key={label} className="modal-info-row">
                <span className="modal-info-icon">{icon}</span>
                <span className="modal-info-label">{label}</span>
                <span className="modal-info-value">{value}</span>
              </div>
            ))}
          </div>

          <p className="modal-desc">{ev.description}</p>
        </div>
      </div>
    </div>
  );
}
