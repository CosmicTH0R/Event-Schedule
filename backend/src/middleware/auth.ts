/**
 * auth.ts middleware — JWT verification
 */
import jwt from 'jsonwebtoken';
import config from '../config';
import { UnauthorizedError } from './errorHandler';
import type { Request, Response, NextFunction } from 'express';

interface JwtPayload {
  userId: string;
  email: string;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    next(new UnauthorizedError('No token provided'));
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
      req.user = { id: payload.userId, email: payload.email };
    } catch {
      // ignore invalid token in optional mode
    }
  }
  next();
}
