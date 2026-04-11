/**
 * instrument.ts — Sentry initialization for the backend (Node.js).
 *
 * MUST be the very first import in server.ts so Sentry can instrument
 * Node.js built-ins, Express middleware, and Prisma automatically.
 *
 * Required env: SENTRY_DSN
 * Optional env: SENTRY_ENVIRONMENT (defaults to NODE_ENV)
 */
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Do not capture events in test runs
  enabled: process.env.NODE_ENV !== 'test' && !!process.env.SENTRY_DSN,
});
