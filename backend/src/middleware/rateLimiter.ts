import rateLimit from 'express-rate-limit';

function make(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: true, code: 'RATE_LIMITED', message },
    skip: (req) => req.path === '/api/health',
  });
}

export const globalLimiter = make(60_000, 100, 'Too many requests — please slow down');
export const searchLimiter = make(60_000, 30, 'Too many search requests');
export const authLimiter = make(60_000, 10, 'Too many auth attempts');
