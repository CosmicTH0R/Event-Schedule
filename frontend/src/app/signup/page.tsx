'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/useAuthStore';
import { authApi } from '@/lib/authApi';

export default function SignUpPage() {
  const router = useRouter();
  const { setAuth, syncUserData } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    try {
      const data = await authApi.register(email, password, name);
      setAuth(data.user, data.token, data.refreshToken ?? ``);
      await syncUserData(data.token);
      router.push('/preferences');
    } catch (err) {
      setError((err as Error).message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-header">
          <span className="auth-card-logo">⚡</span>
          <h1 className="auth-card-title">Create account</h1>
          <p className="auth-card-sub">Join EventPulse and never miss an event</p>
        </div>

        <form className="auth-dropdown-form" onSubmit={submit} noValidate>
          <input
            className="auth-input"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
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
            autoComplete="new-password"
            required
            minLength={8}
          />
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-switch-text">
          Already have an account?{' '}
          <button className="auth-switch-link" onClick={() => router.push('/signin')}>
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

