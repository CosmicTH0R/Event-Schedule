'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '@/store/useStore';
import useAuthStore from '@/store/useAuthStore';
import AuthDropdown from '@/components/AuthDropdown';

export default function Topbar() {
  const { toggleSidebar } = useStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const authRef = useRef(null);
  const userRef = useRef(null);

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

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (authRef.current && !authRef.current.contains(e.target)) {
        setShowAuth(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

        {user ? (
          <div className="user-menu" ref={userRef}>
            <button
              className="user-avatar-btn"
              onClick={() => setShowUserMenu((v) => !v)}
              title={user.email}
              aria-label="User menu"
            >
              {(user.name || user.email)[0].toUpperCase()}
            </button>
            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-dropdown-info">
                  <span className="user-dropdown-name">{user.name || 'User'}</span>
                  <span className="user-dropdown-email">{user.email}</span>
                </div>
                <div className="user-dropdown-divider" />
                <button
                  className="user-dropdown-item danger"
                  onClick={() => { logout(); setShowUserMenu(false); }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-dropdown-wrap" ref={authRef}>
            <button
              className="auth-btn"
              onClick={() => setShowAuth((v) => !v)}
              aria-expanded={showAuth}
            >
              Sign In
            </button>
            {showAuth && <AuthDropdown onClose={() => setShowAuth(false)} />}
          </div>
        )}
      </div>
    </header>
  );
}
