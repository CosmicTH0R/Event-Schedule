/**
 * Push notification service using web-push (VAPID).
 * VAPID keys are read from environment variables.
 * Generate keys with: npx web-push generate-vapid-keys
 */
const webPush = require('web-push');
const logger = require('../utils/logger');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@eventpulse.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send a push notification to a single subscription.
 * @param {object} subscription  - PushSubscription object from frontend
 * @param {object} payload       - { title, body, url }
 */
async function sendPushNotification(subscription, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) {
    logger.warn('VAPID keys not configured — skipping push notification');
    return;
  }
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired or invalid — caller should delete it from DB
      throw new Error('SUBSCRIPTION_EXPIRED');
    }
    logger.error({ err }, 'Failed to send push notification');
  }
}

module.exports = { sendPushNotification };
