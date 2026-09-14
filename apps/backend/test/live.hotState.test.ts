import { describe, expect, it, vi, afterEach } from 'vitest';

import { storeHotState, readHotState } from '../src/live/hotState.js';
import type { RedisConnection } from '../src/infra/redis.js';

function fakeRedis(store = new Map<string, string>()): RedisConnection {
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    })
  } as unknown as RedisConnection;
}

describe('Redis hot state (Week 9)', () => {
  it('stores and reads back compact location counts', async () => {
    const redis = fakeRedis();
    await storeHotState(redis, [
      { locationId: 'sfo', count: 12 },
      { locationId: 'blr', count: 5 }
    ]);
    const state = await readHotState(redis);
    expect(state).not.toBeNull();
    expect(state!.updates).toEqual([
      { locationId: 'sfo', count: 12 },
      { locationId: 'blr', count: 5 }
    ]);
    expect(typeof state!.timestamp).toBe('number');
  });

  it('stores nothing for an empty update list', async () => {
    const redis = fakeRedis();
    await storeHotState(redis, []);
    expect(await readHotState(redis)).toBeNull();
  });

  it('rejects malformed stored payloads instead of propagating them', async () => {
    const redis = fakeRedis(new Map([['live:activity:latest', 'not json']]));
    expect(await readHotState(redis)).toBeNull();

    const bad = fakeRedis(
      new Map([['live:activity:latest', JSON.stringify({ timestamp: 'x', updates: [{ locationId: 1, count: 'y' }] })]])
    );
    expect(await readHotState(bad)).toBeNull();
  });
});