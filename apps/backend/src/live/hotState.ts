import type { RedisConnection } from '../infra/redis.js';

/**
 * Week 9 — Redis hot state (ARCHITECTURE.md: aggregation → Redis →
 * WebSocket). Stores the latest compact per-location activity counts so
 * WebSocket connections can receive a current-state snapshot on connect
 * without querying PostgreSQL. Reference metadata (coordinates) stays in
 * the location catalog; this holds only aggregate counts.
 */

const HOT_KEY = 'live:activity:latest';

export interface LiveUpdate {
  locationId: string;
  count: number;
}

export interface HotState {
  timestamp: number;
  updates: LiveUpdate[];
}

export async function storeHotState(redis: RedisConnection, updates: LiveUpdate[]): Promise<void> {
  if (updates.length === 0) return;
  const state: HotState = { timestamp: Date.now(), updates };
  await redis.set(HOT_KEY, JSON.stringify(state));
}

export async function readHotState(redis: RedisConnection): Promise<HotState | null> {
  const raw = await redis.get(HOT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as HotState;
    if (
      typeof parsed.timestamp !== 'number' ||
      !Array.isArray(parsed.updates) ||
      !parsed.updates.every(
        (u) => typeof u.locationId === 'string' && typeof u.count === 'number'
      )
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
