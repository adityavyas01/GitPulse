import { describe, expect, it, vi, afterEach } from 'vitest';

// The hook module touches window at connect time only inside useEffect,
// so importing it is safe in node; we test its exported types indirectly.
// Real reconnect behavior needs a DOM environment; covered by the WS
// integration path in Week 14 (Reliability + Testing).
describe('useLiveSocket module (Week 9)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('can be imported in a node environment without side effects', async () => {
    const mod = await import('./useLiveSocket.js');
    expect(typeof mod.useLiveSocket).toBe('function');
  });
});