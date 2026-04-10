/**
 * liveService.ts — Server-Sent Events manager for real-time live event updates.
 *
 * Tracks cricket, football, and F1 events that are currently live by querying
 * the database and broadcasting to all active SSE client connections.
 *
 * Broadcast is triggered on three occasions:
 *   1. Immediately when a new client connects (sends current state).
 *   2. Every 30 seconds via a scheduled timer (covers time-based transitions).
 *   3. Explicitly after each football / cricket / F1 cron job completes.
 */

import type { Response } from 'express';
import prisma from '../db';
import logger from '../utils/logger';
import { serializeEvent } from '../utils/normalizer';
import type { CategoryMap, SerializedEvent } from '../types';

// ─── Client registry ──────────────────────────────────────────────────────────

const clients = new Set<Response>();

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let broadcastTimer: ReturnType<typeof setInterval> | null = null;

// ─── Category map cache (TTL: 60 s) ──────────────────────────────────────────

let _catCache: { catMap: CategoryMap; subMap: CategoryMap } | null = null;
let _catCacheTs = 0;

async function getCategoryMaps(): Promise<{ catMap: CategoryMap; subMap: CategoryMap }> {
  if (_catCache && Date.now() - _catCacheTs < 60_000) return _catCache;

  const cats = await prisma.category.findMany({ include: { subcategories: true } });
  const catMap: CategoryMap = {};
  const subMap: CategoryMap = {};

  for (const c of cats) {
    catMap[c.id] = { name: c.name, icon: c.icon };
    for (const s of c.subcategories) {
      subMap[s.id] = { name: s.name, icon: s.icon };
    }
  }

  _catCache = { catMap, subMap };
  _catCacheTs = Date.now();
  return _catCache;
}

// ─── Low-level write helper ───────────────────────────────────────────────────

function writeToClient(res: Response, chunk: string): boolean {
  try {
    res.write(chunk);
    // Flush compressed / buffered streams when the method is available
    const anyRes = res as unknown as { flush?: () => void };
    if (typeof anyRes.flush === 'function') anyRes.flush();
    return true;
  } catch {
    return false;
  }
}

// ─── Core broadcast ───────────────────────────────────────────────────────────

export async function broadcastLive(): Promise<void> {
  if (clients.size === 0) return;

  const now = new Date();
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Query live cricket / football / F1 events for today
  const rows = await prisma.cachedEvent.findMany({
    where: {
      date: today,
      subcategoryId: { in: ['cricket', 'football', 'f1'] },
      OR: [
        { status: 'live' },
        { tags: { contains: 'live' } },
      ],
    },
    orderBy: { time: 'asc' },
    take: 50,
  });

  const { catMap, subMap } = await getCategoryMaps();

  const events: SerializedEvent[] = rows.map((row) => {
    const cat = catMap[row.categoryId] ?? { name: row.categoryId, icon: '📌' };
    const sub = subMap[row.subcategoryId] ?? { name: row.subcategoryId, icon: '📌' };
    return serializeEvent(row, cat.name, cat.icon, sub.name, sub.icon);
  });

  const payload = JSON.stringify({
    ids: events.map((e) => e.id),
    events,
    timestamp: Date.now(),
  });

  const frame = `event: live\ndata: ${payload}\n\n`;

  const dead: Response[] = [];
  for (const client of clients) {
    if (!writeToClient(client, frame)) dead.push(client);
  }
  dead.forEach((c) => clients.delete(c));

  logger.debug(
    { clients: clients.size, live: events.length },
    '[sse] broadcast live'
  );
}

// ─── Heartbeat — keeps connections alive through proxies / load balancers ─────

function sendHeartbeat(): void {
  const dead: Response[] = [];
  for (const client of clients) {
    // SSE comment line — ignored by the browser but resets the TCP idle timer
    if (!writeToClient(client, ': heartbeat\n\n')) dead.push(client);
  }
  dead.forEach((c) => clients.delete(c));
}

// ─── Public connection API ────────────────────────────────────────────────────

/**
 * Register a new SSE client. Sets the required headers, flushes them, and
 * immediately sends the current live-event state.
 */
export function addClient(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx response buffering
  });
  res.flushHeaders();

  clients.add(res);
  logger.debug({ total: clients.size }, '[sse] client connected');

  // Push current state right away so the UI reflects live events on connect
  broadcastLive().catch((err) =>
    logger.warn({ err: (err as Error).message }, '[sse] initial broadcast failed')
  );
}

/** Remove a disconnected client from the registry. */
export function removeClient(res: Response): void {
  clients.delete(res);
  logger.debug({ total: clients.size }, '[sse] client disconnected');
}

// ─── Service lifecycle ────────────────────────────────────────────────────────

/**
 * Start background timers:
 * - Heartbeat comment every 25 s (below most proxy idle-connection timeouts).
 * - Timed broadcast every 30 s (catches time-based live transitions, e.g. F1).
 */
export function startSSE(): void {
  heartbeatTimer = setInterval(sendHeartbeat, 25_000);
  broadcastTimer = setInterval(() => {
    broadcastLive().catch((err) =>
      logger.warn({ err: (err as Error).message }, '[sse] timed broadcast failed')
    );
  }, 30_000);

  logger.info('[sse] Live SSE service started (heartbeat 25 s, broadcast 30 s)');
}

/** Stop all timers and close every active connection cleanly. */
export function stopSSE(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (broadcastTimer) clearInterval(broadcastTimer);
  for (const client of clients) {
    try { client.end(); } catch { /* ignore */ }
  }
  clients.clear();
  logger.info('[sse] Live SSE service stopped');
}

/** Current number of active SSE subscribers. */
export const liveClientCount = (): number => clients.size;
