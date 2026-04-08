/**
 * auth.js middleware — JWT verification
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError } = require('./errorHandler');

/**
 * Strict auth — rejects request if token is missing or invalid.
 * Attaches req.user = { id, email }
 */
function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new UnauthorizedError('No token provided'));
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

/**
 * Optional auth — sets req.user if token present and valid, otherwise continues.
 */
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      req.user = { id: payload.userId, email: payload.email };
    } catch {
      // ignore invalid token in optional mode
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
