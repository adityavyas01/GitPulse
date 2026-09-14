import { describe, expect, it, vi } from 'vitest';

import { TtlCache } from '../src/enrichment/cache.js';

describe('TtlCache', () => {
  it('caches hits and calls the loader once per key', async () => {
    const loader = vi.fn().mockResolvedValue('value');
    const cache = new TtlCache<string>(1000, 10, loader);

    expect(await cache.get('a')).toBe('value');
    expect(await cache.get('a')).toBe('value');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('single-flights concurrent lookups of the same key', async () => {
    const loader = vi.fn().mockImplementation(() => new Promise<string | null>((resolve) => setTimeout(() => resolve('x'), 5)));
    const cache = new TtlCache<string>(1000, 10, loader);

    const [a, b, c] = await Promise.all([cache.get('k'), cache.get('k'), cache.get('k')]);
    expect(a).toBe('x');
    expect(b).toBe('x');
    expect(c).toBe('x');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('expires entries after TTL', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const loader = vi.fn().mockImplementation(async () => {
      calls += 1;
      return `v${calls}`;
    });
    const cache = new TtlCache<string>(100, 10, loader);

    expect(await cache.get('k')).toBe('v1');
    vi.advanceTimersByTime(150);
    expect(await cache.get('k')).toBe('v2');
    expect(loader).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('evicts least-recently-used beyond the cap', async () => {
    const loader = vi.fn().mockImplementation(async (key: string) => key);
    const cache = new TtlCache<string>(10000, 2, loader);

    await cache.get('a');
    await cache.get('b');
    await cache.get('a'); // refresh a
    await cache.get('c'); // evicts b

    expect(cache.size).toBe(2);
    expect(await cache.get('a')).toBe('a'); // still cached
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it('caches null results (missing metadata) to avoid repeat requests', async () => {
    const loader = vi.fn().mockResolvedValue(null);
    const cache = new TtlCache<string>(10000, 10, loader);

    expect(await cache.get('missing')).toBeNull();
    expect(await cache.get('missing')).toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
