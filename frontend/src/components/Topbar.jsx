'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '@/store/useStore';

export default function Topbar() {
  const { toggleSidebar } = useStore();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleSearch = useCallback(
    (e) => {
      const q = e.target.value;
      setQuery(q);
      if (q.trim().length >= 2) {
        router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }
    },
    [router]
  );

  return (
    <header className="topbar">
      <button className="menu-btn" onClick={toggleSidebar} aria-label="Toggle menu">
        ☰
      </button>

      <div className="search-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="search"
          className="search-input"
          placeholder="Search events — F1, IPL, movies, GTA..."
          value={query}
          onChange={handleSearch}
          aria-label="Search events"
        />
      </div>

      <div className="topbar-actions">
        <span className="today-date">{today}</span>
      </div>
    </header>
  );
}
