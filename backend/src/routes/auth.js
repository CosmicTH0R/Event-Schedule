/**
 * auth.js route — /api/auth/*
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/google
 * GET  /api/auth/me
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const prisma = require('../db');
const config = require('../config');
const { asyncHandler, ValidationError, UnauthorizedError } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────

router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join('; '));
    }

    const { email, password, name } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ValidationError('An account with that email already exists');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, name: name || null },
    });

    const token = signToken(user);
    res.status(201).json({ token, user: safeUser(user) });
  })
);

// ─── POST /api/auth/login ────────────────────────────────────────────────────

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
      // Constant-time comparison to avoid user enumeration via timing
      await bcrypt.compare(password, '$2b$12$invalidhashpaddingtoconstanttime');
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  })
);

// ─── POST /api/auth/google ───────────────────────────────────────────────────

router.post(
  '/google',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      throw new ValidationError('idToken required');
    }

    const { OAuth2Client } = require('google-auth-library');
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID) {
      throw new ValidationError('Google OAuth not configured on this server');
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedError('Invalid Google token');
    }

    const { sub: googleId, email, name, picture: avatarUrl } = payload;
    if (!email) throw new ValidationError('Google account has no email');

    // Find by googleId first, then by email (links existing accounts)
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email: email.toLowerCase() }] },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatarUrl: avatarUrl || user.avatarUrl, name: name || user.name },
      });
    } else {
      user = await prisma.user.create({
        data: { email: email.toLowerCase(), googleId, name, avatarUrl },
      });
    }

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  })
);

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new UnauthorizedError('User not found');
    res.json(safeUser(user));
  })
);

module.exports = router;
