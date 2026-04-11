'use client';

import { useState } from 'react';
import useAuthStore from '@/store/useAuthStore';
import { authApi } from '@/lib/authApi';

interface Props {
  defaultTab?: string;
  onTabChange?: (tab: string) => void;
  onClose: () => void;
}

export default function AuthDropdown({ defaultTab = 'login', onTabChange, onClose }: Props) {
  const [tab, setTab] = useState(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuthStore();

  const switchTab = (t: string) => {
    setTab(t);
    setError('');
    onTabChange?.(t);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let data;
      if (tab === 'login') {
        data = await authApi.login(email, password);
      } else {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
        data = await authApi.register(email, password, name);
      }
      setAuth(data.user, data.token, data.refreshToken ?? ``);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-dropdown" role="dialog" aria-label="Sign in or register">
      {/* Tabs */}
      <div className="auth-dropdown-tabs">
        <button
          type="button"
          className={`auth-dropdown-tab ${tab === 'login' ? 'active' : ''}`}
          onClick={() => switchTab('login')}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`auth-dropdown-tab ${tab === 'register' ? 'active' : ''}`}
          onClick={() => switchTab('register')}
        >
          Sign Up
        </button>
      </div>

      {/* Form */}
      <form className="auth-dropdown-form" onSubmit={submit} noValidate>
        {tab === 'register' && (
          <input
            className="auth-input"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        )}

        <input
          className="auth-input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <input
          className="auth-input"
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
          minLength={8}
          required
        />

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading
            ? 'Please wait…'
            : tab === 'login'
            ? 'Sign In'
            : 'Create Account'}
        </button>
      </form>

      {/* Toggle hint */}
      <p className="auth-dropdown-hint">
        {tab === 'login' ? (
          <>No account?{' '}
            <button type="button" className="auth-link" onClick={() => switchTab('register')}>
              Sign up
            </button>
          </>
        ) : (
          <>Already have an account?{' '}
            <button type="button" className="auth-link" onClick={() => switchTab('login')}>
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}

