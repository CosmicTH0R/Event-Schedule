/**
 * emailService.ts — Sends reminder emails via Nodemailer (SMTP).
 *
 * Required env vars:
 *   EMAIL_HOST  — SMTP hostname (e.g. smtp.resend.com or smtp.mailgun.org)
 *   EMAIL_PORT  — SMTP port (587 for STARTTLS, 465 for TLS)
 *   EMAIL_USER  — SMTP username / API key
 *   EMAIL_PASS  — SMTP password / secret
 *   EMAIL_FROM  — Sender address (e.g. "EventPulse <noreply@eventpulse.app>")
 *
 * If EMAIL_HOST is not set, the service logs a warning and skips sending.
 */
import nodemailer from 'nodemailer';
import config from '../config';
import logger from '../utils/logger';

let _transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (_transporter) return _transporter;

  if (!config.email.host) return null;

  _transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: { user: config.email.user, pass: config.email.pass },
  });

  return _transporter;
}

export interface ReminderEmailPayload {
  to: string;        // recipient address
  eventTitle: string;
  eventDate: string; // YYYY-MM-DD
  eventTime: string; // HH:MM
  eventVenue?: string;
  remindBefore: number; // minutes before event
}

export async function sendReminderEmail(payload: ReminderEmailPayload): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn('[email] EMAIL_HOST not configured — skipping reminder email');
    return;
  }

  const { to, eventTitle, eventDate, eventTime, eventVenue, remindBefore } = payload;
  const readableDate = new Date(`${eventDate}T${eventTime}:00Z`).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const subject = `⏰ Reminder: ${eventTitle} starts in ${remindBefore} min`;
  const venueHtml = eventVenue ? `<p style="color:#b2bec3">📍 ${eventVenue}</p>` : '';

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#1a1a2e;color:#f0f0f0;border-radius:12px;padding:32px">
      <h2 style="color:#a29bfe;margin-top:0">🔔 EventPulse Reminder</h2>
      <h3 style="margin-bottom:4px">${eventTitle}</h3>
      <p style="color:#b2bec3;margin-top:0">🗓️ ${readableDate}</p>
      ${venueHtml}
      <p style="margin-top:24px;font-size:0.85rem;color:#636e72">
        You set a reminder for <strong>${remindBefore} minutes</strong> before this event.
        <br>Open <a href="https://eventpulse.app" style="color:#a29bfe">EventPulse</a> to see more details.
      </p>
    </div>`;

  try {
    await transporter.sendMail({ from: config.email.from, to, subject, html });
    logger.info({ to, eventTitle }, '[email] Reminder sent');
  } catch (err) {
    logger.error({ err: (err as Error).message, to, eventTitle }, '[email] Reminder send failed');
  }
}
