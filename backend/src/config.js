require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || '',

  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_in_prod',

  // Comma-separated allowed origins for CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map((s) => s.trim()),

  // External API keys (Phase 2)
  apiKeys: {
    tmdb: process.env.TMDB_API_KEY || '',
    football: process.env.FOOTBALL_DATA_KEY || '',
    cricket: process.env.CRICKET_API_KEY || '',
    rawg: process.env.RAWG_API_KEY || '',
  },

  // Cache TTLs in seconds
  cache: {
    categories: 86400,  // 24 hours
    f1: 3600,           // 1 hour
    cricket: 1800,      // 30 min
    football: 3600,     // 1 hour
    movies: 21600,      // 6 hours
    tv: 21600,          // 6 hours
    gaming: 86400,      // 24 hours
    eventsList: 300,    // 5 min — short TTL so new events surface quickly
  },
};

module.exports = config;
