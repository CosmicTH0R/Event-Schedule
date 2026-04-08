'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useStore from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';

const NAV_ITEMS = [
  { href: '/today', icon: '📅', label: "Today's Feed" },
  { href: '/my-feed', icon: '⭐', label: 'My Feed' },
  { href: '/explore', icon: '🔍', label: 'Explore' },
  { href: '/calendar', icon: '🗓️', label: 'Calendar' },
];

export default function Sidebar({ categories = [] }) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, selectedCategories } = useStore();
  const { theme, toggleTheme } = useTheme();

  const close = () => setSidebarOpen(false);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={close}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">EventPulse</span>
          </div>
          <button className="sidebar-close" onClick={close}>✕</button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              onClick={close}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Categories</h3>
          <div className="sidebar-categories">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/explore?cat=${cat.id}`}
                className={`sidebar-cat-item ${selectedCategories.includes(cat.id) ? 'subscribed' : ''}`}
                onClick={close}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <Link
            href="/preferences"
            className={`nav-item ${pathname === '/preferences' ? 'active' : ''}`}
            onClick={close}
          >
            <span className="nav-icon">⚙️</span>
            <span>Preferences</span>
          </Link>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </aside>
    </>
  );
}
