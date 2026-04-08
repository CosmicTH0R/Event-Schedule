require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const config = require('./config');
const logger = require('./utils/logger');
const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, NotFoundError } = require('./middleware/errorHandler');

const healthRouter = require('./routes/health');
const categoriesRouter = require('./routes/categories');
const eventsRouter = require('./routes/events');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const pushRouter = require('./routes/push');
const { startScheduler } = require('./cron/scheduler');

const app = express();

// ─── Trust proxy (required for rate limiting behind Railway/Vercel) ──────────
app.set('trust proxy', 1);

// ─── Security headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Frontend handles its own CSP
  })
);

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ─── Request logging ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      ms: Date.now() - start,
      ip: req.ip,
    });
  });
  next();
});

// ─── Rate limiting ───────────────────────────────────────────────────────────
app.use('/api', globalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/push', pushRouter);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  next(new NotFoundError(`${req.method} ${req.url} not found`));
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  logger.info(
    `⚡ EventPulse API  →  http://localhost:${config.port}  [${config.nodeEnv}]`
  );
  // Start background cron refresh jobs
  startScheduler();
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal) {
  logger.info(`${signal} → shutting down gracefully`);
  server.close(async () => {
    try {
      const prisma = require('./db');
      await prisma.$disconnect();
    } catch {}
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000); // force exit after 10s
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
