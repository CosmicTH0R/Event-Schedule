'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import useStore from '@/store/useStore';
import useAuthStore from '@/store/useAuthStore';
import type { Category, Subcategory } from '@/types';

export default function PreferencesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { selectedCategories, toggleCategory } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Redirect if not signed in
  useEffect(() => {
    if (!user) router.replace('/signin');
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    api.getCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  function handleSave() {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.push('/my-feed');
    }, 1200);
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="view-wrapper">
        <div className="view-header"><h1>Preferences</h1></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading categories…</p>
      </div>
    );
  }

  return (
    <div className="view-wrapper">
      <div className="view-header">
        <h1 style={{ fontSize: '2rem' }}>⚙️ Preferences</h1>
        <p className="view-subtitle">
          Select the categories you care about — your My Feed will show events from these.
        </p>
      </div>

      <div className="preferences-grid">
        {categories.map((cat) => {
          const selected = selectedCategories.includes(cat.id);
          return (
            <div
              key={cat.id}
              className={`pref-card ${selected ? 'selected' : ''}`}
              onClick={() => toggleCategory(cat.id)}
              role="checkbox"
              aria-checked={selected}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && toggleCategory(cat.id)}
            >
              <div className="pref-card-header">
                <div className="pref-card-icon">{cat.icon}</div>
                <div className="pref-card-name">{cat.name}</div>
                <div className="pref-check">{selected ? '✓' : ''}</div>
              </div>
              <div className="pref-subs">
                {cat.subcategories?.map((s: Subcategory) => (
                  <span key={s.id} className="pref-sub-chip">{s.name}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {selectedCategories.length === 0
            ? 'No categories selected — select some to personalise your feed'
            : `${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'} selected`}
        </p>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saved}
        >
          {saved ? '✓ Saved! Redirecting…' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
