/**
 * instrumentation.ts — Next.js instrumentation hook for Sentry.
 *
 * Next.js automatically imports this file on server startup.
 * Requires NEXT_PUBLIC_SENTRY_DSN env var (or SENTRY_DSN for server-only).
 */
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { init } = await import('@sentry/nextjs');
    init({
      dsn,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      environment: process.env.NODE_ENV ?? 'development',
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const { init } = await import('@sentry/nextjs');
    init({ dsn });
  }
}
