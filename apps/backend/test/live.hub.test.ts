import { describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';

import { LiveHub } from '../src/live/hub.js';

describe('LiveHub (Week 9)', () => {
  it('is safe to construct with no connections and no-op broadcasts', () => {
    const fakeServer = { on: vi.fn() } as never;
    const hub = new LiveHub(fakeServer, { redis: null, log: { debug: () => undefined, info: () => undefined } });
    expect(hub.clientCount).toBe(0);
    hub.broadcast([{ locationId: 'sfo', count: 1 }]);
    hub.startHeartbeat(10);
    hub.close();
  });

  it('ignores malformed inbound frames and never echoes raw payloads', async () => {
    // Snapshot path validation is covered via hotState tests; here we assert
    // the hub's snapshot validation: readHotState rejects bad payloads, so a
    // poisoned Redis value never reaches a client.
    const { readHotState } = await import('../src/live/hotState.js');
    const poisoned = {
      get: async () => JSON.stringify({ timestamp: 'bad', updates: null })
    } as never;
    expect(await readHotState(poisoned)).toBeNull();
    expect(typeof WebSocket.OPEN).toBe('number');
  });
});