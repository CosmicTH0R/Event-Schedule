/**
 * push.ts route — /api/push/*
 */
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

router.get('/vapid-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY ?? null;
  res.json({ vapidPublicKey: key });
});

router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid subscription object' });
      return;
    }
    const { endpoint, keys } = parsed.data;
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth },
      create: {
        userId: req.user!.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });
    res.json({ ok: true, id: sub.id });
  } catch (err) {
    next(err);
  }
});

router.delete('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint } = req.body as { endpoint?: string };
    if (!endpoint) {
      res.status(400).json({ error: 'endpoint required' });
      return;
    }
    await prisma.pushSubscription.deleteMany({
      where: { userId: req.user!.id, endpoint },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
