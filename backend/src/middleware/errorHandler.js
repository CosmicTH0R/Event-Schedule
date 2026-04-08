const logger = require('../utils/logger');
const config = require('../config');

// ─── Custom error classes ────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // known, expected error
  }
}

class NotFoundError extends AppError {
  constructor(msg = 'Resource not found') {
    super(msg, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(msg = 'Validation failed', issues = []) {
    super(msg, 400, 'VALIDATION_ERROR');
    this.issues = issues;
  }
}

class UnauthorizedError extends AppError {
  constructor(msg = 'Unauthorized') {
    super(msg, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(msg = 'Forbidden') {
    super(msg, 403, 'FORBIDDEN');
  }
}

// ─── Async handler wrapper ───────────────────────────────────────────────────

/** Wraps an async route handler so Express catches rejected promises */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─── Global error middleware (must have 4 params for Express to recognize) ───

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;

  logger.error({
    code: err.code,
    status: statusCode,
    message: err.message,
    url: `${req.method} ${req.url}`,
    stack: config.isDev ? err.stack : undefined,
  });

  const body = {
    error: true,
    code: err.code || 'INTERNAL_ERROR',
    // Never expose implementation details in production
    message: err.isOperational || config.isDev ? err.message : 'An unexpected error occurred',
  };

  if (err.issues) body.issues = err.issues;

  res.status(statusCode).json(body);
};

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  asyncHandler,
  errorHandler,
};
