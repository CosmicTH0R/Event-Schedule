'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { authApi } from '@/lib/authApi';
import useStore from '@/store/useStore';
import useAuthStore from '@/store/useAuthStore';
import type { Category, Subcategory } from '@/types';

export default function PreferencesPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { selectedCategories, toggleCategory, setSelectedCategories } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Redirect if not signed in
  useEffect(() => {
    if (!user) router.replace('/signin');
  }, [user, router]);

  useEffect(() => {
    if (!user || !token) return;

    let cancelled = false;

    Promise.all([api.getCategories(), authApi.getPreferences(token)])
      .then(([categoryRows, preferenceRows]) => {
        if (cancelled) return;
        setCategories(categoryRows);
        setSelectedCategories(
          Array.isArray(preferenceRows)
            ? preferenceRows
                .map((preference) => preference.categoryId)
                .filter((categoryId): categoryId is string => typeof categoryId === 'string' && categoryId.length > 0)
            : []
        );
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load saved preferences');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, token, setSelectedCategories]);

  async function handleSave() {
    if (!token) return;

    setError('');
    setSaved(true);

    try {
      await authApi.savePreferences(token, selectedCategories);
      setTimeout(() => {
        setSaved(false);
        router.push('/my-feed');
      }, 1200);
    } catch (err) {
      setSaved(false);
      setError((err as Error).message || 'Failed to save preferences');
    }
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

      {error && (
        <p style={{ color: 'var(--danger, #ff6b6b)', marginBottom: '16px' }}>{error}</p>
      )}

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
