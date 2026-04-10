/**
 * pushService.ts — Push notifications using web-push (VAPID).
 */
import webPush from 'web-push';
import logger from '../utils/logger';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? 'admin@eventpulse.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY) {
    logger.warn('VAPID keys not configured — skipping push notification');
    return;
  }
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 410 || e.statusCode === 404) {
      throw new Error('SUBSCRIPTION_EXPIRED');
    }
    logger.error({ err }, 'Failed to send push notification');
  }
}
