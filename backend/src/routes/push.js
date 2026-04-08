/**
 * POST /api/push/subscribe   — save a push subscription for the current user
 * DELETE /api/push/subscribe — remove a push subscription
 * GET  /api/push/vapid-key   — return the VAPID public key so the frontend can subscribe
 */
const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = Router();

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

// Public — frontend needs this to call PushManager.subscribe()
router.get('/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY || null;
  res.json({ vapidPublicKey: key });
});

// Save subscription
router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }
    const { endpoint, keys } = parsed.data;
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth },
      create: {
        userId: req.user.id,
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

// Remove subscription
router.delete('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    await prisma.pushSubscription.deleteMany({
      where: { userId: req.user.id, endpoint },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
