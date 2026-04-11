import 'dotenv/config';

const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: process.env.NODE_ENV !== 'production',

  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL ?? '',

  jwtSecret: process.env.JWT_SECRET ?? 'dev_secret_change_in_prod',

  email: {
    host: process.env.EMAIL_HOST ?? '',
    port: parseInt(process.env.EMAIL_PORT ?? '587', 10),
    user: process.env.EMAIL_USER ?? '',
    pass: process.env.EMAIL_PASS ?? '',
    from: process.env.EMAIL_FROM ?? 'EventPulse <noreply@eventpulse.app>',
  },

  sentryDsn: process.env.SENTRY_DSN ?? '',

  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim()),

  apiKeys: {
    tmdb: process.env.TMDB_API_KEY ?? '',
    football: process.env.FOOTBALL_DATA_KEY ?? '',
    cricket: process.env.CRICKET_API_KEY ?? '',
    rawg: process.env.RAWG_API_KEY ?? '',
  },

  cache: {
    categories: 86400,
    f1: 3600,
    cricket: 1800,
    football: 3600,
    movies: 21600,
    tv: 21600,
    gaming: 86400,
    eventsList: 300,
  },
} as const;

export type Config = typeof config;
export default config;
