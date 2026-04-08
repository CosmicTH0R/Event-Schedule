'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/useAuthStore';
import { authApi } from '@/lib/authApi';

export default function SignInPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setAuth(data.user, data.token);
      router.push('/today');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-header">
          <span className="auth-card-logo">⚡</span>
          <h1 className="auth-card-title">Welcome back</h1>
          <p className="auth-card-sub">Sign in to your EventPulse account</p>
        </div>

        <form className="auth-dropdown-form" onSubmit={submit} noValidate>
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
            autoComplete="current-password"
            required
            minLength={8}
          />
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch-text">
          Don&apos;t have an account?{' '}
          <button className="auth-switch-link" onClick={() => router.push('/signup')}>
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
