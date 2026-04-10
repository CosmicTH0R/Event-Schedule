import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import config from './config';
import logger from './utils/logger';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler, NotFoundError } from './middleware/errorHandler';

import healthRouter from './routes/health';
import categoriesRouter from './routes/categories';
import eventsRouter from './routes/events';
import adminRouter from './routes/admin';
import authRouter from './routes/auth';
import userRouter from './routes/user';
import pushRouter from './routes/push';
import { startScheduler } from './cron/scheduler';
import { startSSE, stopSSE } from './services/liveService';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

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

app.use('/api', globalLimiter);

app.use('/api/health', healthRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/push', pushRouter);

app.use((req, _res, next) => {
  next(new NotFoundError(`${req.method} ${req.url} not found`));
});

app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────

const server = app.listen(config.port, () => {
  logger.info(
    `⚡ EventPulse API  →  http://localhost:${config.port}  [${config.nodeEnv}]`
  );
  startScheduler();
  startSSE();

  import('./cron/scheduler').then(
    ({ runF1Job, runTMDBJob, runFootballJob, runCricketJob, runGamingJob }) => {
      logger.info('Running initial data fetch from all sources...');
      Promise.allSettled([
        runF1Job(),
        runTMDBJob(),
        runCricketJob(),
        runGamingJob(),
        runFootballJob(),
      ]).then((results) => {
        const failed = results.filter((r) => r.status === 'rejected').length;
        logger.info({ failed }, 'Initial data fetch complete');
      });
    }
  );
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

function shutdown(signal: string): void {
  logger.info(`${signal} → shutting down gracefully`);
  stopSSE();
  server.close(async () => {
    try {
      const prisma = (await import('./db')).default;
      await prisma.$disconnect();
    } catch {
      // ignore
    }
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
