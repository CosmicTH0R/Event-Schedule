const rateLimit = require('express-rate-limit');

const make = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: true, code: 'RATE_LIMITED', message },
    skip: (req) => req.path === '/api/health', // health checks never count
  });

// 100 req/min per IP for regular API calls
const globalLimiter = make(60_000, 100, 'Too many requests — please slow down');

// 30 req/min for search (DB-intensive)
const searchLimiter = make(60_000, 30, 'Too many search requests');

// 10 req/min for auth endpoints (Phase 3)
const authLimiter = make(60_000, 10, 'Too many auth attempts');

module.exports = { globalLimiter, searchLimiter, authLimiter };
