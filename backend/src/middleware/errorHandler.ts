import logger from '../utils/logger';
import config from '../config';
import type { Request, Response, NextFunction } from 'express';

// Lazy-load Sentry to avoid a hard dependency when DSN is not configured
function captureException(err: Error): void {
  if (!config.sentryDsn) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/node') as typeof import('@sentry/node');
    Sentry.captureException(err);
  } catch {
    // Sentry not installed — ignore
  }
}

// ─── Custom error classes ────────────────────────────────────────────────────

export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;
  issues?: unknown[];

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

export class NotFoundError extends AppError {
  constructor(msg = 'Resource not found') {
    super(msg, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(msg = 'Validation failed', issues: unknown[] = []) {
    super(msg, 400, 'VALIDATION_ERROR');
    this.issues = issues;
  }
}

export class UnauthorizedError extends AppError {
  constructor(msg = 'Unauthorized') {
    super(msg, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(msg = 'Forbidden') {
    super(msg, 403, 'FORBIDDEN');
  }
}

// ─── Async handler wrapper ───────────────────────────────────────────────────

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ─── Global error middleware ─────────────────────────────────────────────────

export const errorHandler = (
  err: AppError & { stack?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;

  // Report unexpected (non-operational) errors to Sentry
  if (!err.isOperational) captureException(err);

  logger.error({
    code: err.code,
    status: statusCode,
    message: err.message,
    url: `${req.method} ${req.url}`,
    stack: config.isDev ? err.stack : undefined,
  });

  const body: Record<string, unknown> = {
    error: true,
    code: err.code ?? 'INTERNAL_ERROR',
    message:
      err.isOperational || config.isDev
        ? err.message
        : 'An unexpected error occurred',
  };

  if (err.issues) body.issues = err.issues;

  res.status(statusCode).json(body);
};
