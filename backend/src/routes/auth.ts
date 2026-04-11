/**
 * auth.ts route — /api/auth/*
 */
import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import prisma from '../db';
import config from '../config';
import {
  asyncHandler,
  ValidationError,
  UnauthorizedError,
} from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import type { User } from '@prisma/client';

const router = Router();
const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const REFRESH_TOKEN_EXPIRY_MS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signAccessToken(user: Pick<User, 'id' | 'email'>): string {
  return jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/** Generate a cryptographically-random refresh token and store its hash in DB. */
async function createRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  return raw;
}

function safeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash: _pw, ...rest } = user;
  return rest;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i) => i.message).join('; ')
      );
    }

    const { email, password, name } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ValidationError('An account with that email already exists');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, name: name ?? null },
    });

    const [token, refreshToken] = await Promise.all([
      Promise.resolve(signAccessToken(user)),
      createRefreshToken(user.id),
    ]);

    res.status(201).json({ token, refreshToken, user: safeUser(user) });
  })
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid email or password format');
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.passwordHash) {
      await bcrypt.compare(password, '$2b$12$invalidhashpaddingtoconstanttime');
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid email or password');

    const [token, refreshToken] = await Promise.all([
      Promise.resolve(signAccessToken(user)),
      createRefreshToken(user.id),
    ]);

    res.json({ token, refreshToken, user: safeUser(user) });
  })
);

// ─── POST /api/auth/google ────────────────────────────────────────────────────

router.post(
  '/google',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken || typeof idToken !== 'string') {
      throw new ValidationError('idToken required');
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID) {
      throw new ValidationError('Google OAuth not configured on this server');
    }

    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    let payload: import('google-auth-library').TokenPayload | undefined;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedError('Invalid Google token');
    }

    if (!payload?.email) throw new ValidationError('Google account has no email');

    const { sub: googleId, email, name, picture: avatarUrl } = payload;

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email: email.toLowerCase() }] },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          avatarUrl: avatarUrl ?? user.avatarUrl,
          name: name ?? user.name,
        },
      });
    } else {
      user = await prisma.user.create({
        data: { email: email.toLowerCase(), googleId, name, avatarUrl },
      });
    }

    const [token, refreshToken] = await Promise.all([
      Promise.resolve(signAccessToken(user)),
      createRefreshToken(user.id),
    ]);

    res.json({ token, refreshToken, user: safeUser(user) });
  })
);

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

router.post(
  '/refresh',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { refreshToken: raw } = req.body as { refreshToken?: string };
    if (!raw || typeof raw !== 'string') {
      throw new ValidationError('refreshToken required');
    }

    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.expiresAt < new Date()) {
      // Delete expired record if present
      if (stored) await prisma.refreshToken.delete({ where: { tokenHash } }).catch(() => {});
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new UnauthorizedError('User not found');

    // Rotate — delete old token, issue new pair
    await prisma.refreshToken.delete({ where: { tokenHash } });
    const [newToken, newRefreshToken] = await Promise.all([
      Promise.resolve(signAccessToken(user)),
      createRefreshToken(user.id),
    ]);

    res.json({ token: newToken, refreshToken: newRefreshToken });
  })
);

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { refreshToken: raw } = req.body as { refreshToken?: string };
    if (raw && typeof raw === 'string') {
      const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
      await prisma.refreshToken.deleteMany({ where: { tokenHash } });
    }
    res.json({ ok: true });
  })
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new UnauthorizedError('User not found');
    res.json(safeUser(user));
  })
);

export default router;
