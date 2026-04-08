'use client';

import { useEffect, useState, useCallback } from 'react';
import useStore from '@/store/useStore';
import useAuthStore from '@/store/useAuthStore';
import { authApi } from '@/lib/authApi';
import { formatDate, formatTime } from '@/lib/utils';

/** Build a Google Calendar URL for an event */
function googleCalendarUrl(ev) {
  const date = ev.date?.replace(/-/g, '') ?? '';
  const time = ev.time ? ev.time.replace(':', '') + '00' : '000000';
  const start = `${date}T${time}Z`;
  const end = ev.endTime ? `${date}T${ev.endTime.replace(':', '')}00Z` : start;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${start}/${end}`,
    details: ev.description || '',
    location: ev.venue || ev.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Generate and download a .ics file */
function downloadIcs(ev) {
  const date = ev.date?.replace(/-/g, '') ?? '00000000';
  const time = ev.time ? ev.time.replace(':', '') + '00' : '000000';
  const dtStart = `${date}T${time}Z`;
  const dtEnd = ev.endTime
    ? `${date}T${ev.endTime.replace(':', '')}00Z`
    : dtStart;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventPulse//EN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@eventpulse`,
    `SUMMARY:${ev.title}`,
    `DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${ev.venue || ev.location || ''}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ev.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EventModal() {
  const { modalEvent: ev, closeModal } = useStore();
  const { user, token, bookmarks, addBookmark, removeBookmark, addReminder, removeReminder, reminders } = useAuthStore();
  const [reminderLoading, setReminderLoading] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [calOpen, setCalOpen] = useState(false);

  const isBookmarked = ev ? bookmarks.includes(ev.id) : false;
  const existingReminder = ev ? reminders.find((r) => r.eventId === ev.id) : null;

  const toggleBookmark = useCallback(async () => {
    if (!user || !ev) return;
    try {
      if (isBookmarked) {
        await authApi.removeBookmark(token, ev.id);
        removeBookmark(ev.id);
      } else {
        await authApi.addBookmark(token, ev.id);
        addBookmark(ev.id);
      }
    } catch (_) {}
  }, [user, token, ev, isBookmarked, addBookmark, removeBookmark]);

  const toggleReminder = useCallback(async () => {
    if (!user || !ev) return;
    setReminderLoading(true);
    try {
      if (existingReminder) {
        await authApi.removeReminder(token, existingReminder.id);
        removeReminder(existingReminder.id);
      } else {
        const data = await authApi.addReminder(token, ev.id, 30);
        addReminder(data.reminder ?? { id: data.id, eventId: ev.id, remindBefore: 30 });
      }
    } catch (_) {}
    setReminderLoading(false);
  }, [user, token, ev, existingReminder, addReminder, removeReminder]);

  const handleShare = useCallback(async () => {
    if (!ev) return;
    const shareData = { title: ev.title, text: ev.description || ev.title, url: window.location.href };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch (_) {}
    }
    await navigator.clipboard.writeText(window.location.href).catch(() => {});
    setShareMsg('Link copied!');
    setTimeout(() => setShareMsg(''), 2000);
  }, [ev]);

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

          {/* Share + Calendar actions (always visible) */}
          <div className="modal-actions">
            <button className="modal-action-btn" onClick={handleShare}>
              {shareMsg || '🔗 Share'}
            </button>
            <div className="cal-dropdown-wrap">
              <button
                className={`modal-action-btn ${calOpen ? 'active' : ''}`}
                onClick={() => setCalOpen((o) => !o)}
              >
                📅 Add to Calendar
              </button>
              {calOpen && (
                <div className="cal-dropdown">
                  <a
                    href={googleCalendarUrl(ev)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cal-option"
                    onClick={() => setCalOpen(false)}
                  >
                    Google Calendar
                  </a>
                  <button
                    className="cal-option"
                    onClick={() => { downloadIcs(ev); setCalOpen(false); }}
                  >
                    Download .ics
                  </button>
                </div>
              )}
            </div>
          </div>

          {user && (
            <div className="modal-actions">
              <button
                className={`modal-action-btn ${isBookmarked ? 'active' : ''}`}
                onClick={toggleBookmark}
              >
                {isBookmarked ? '🔖 Bookmarked' : '🏷️ Bookmark'}
              </button>
              <button
                className={`modal-action-btn ${existingReminder ? 'active' : ''}`}
                onClick={toggleReminder}
                disabled={reminderLoading}
              >
                {reminderLoading ? '…' : existingReminder ? '⏰ Reminder Set' : '⏰ Remind Me'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
