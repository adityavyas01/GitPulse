import { describe, expect, it, afterEach, vi } from 'vitest';

import { fetchGlobeActivity } from './globeActivity.js';

describe('globe activity data join (Week 8)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('joins activity buckets with the location catalog and sorts by count', async () => {
    const apiResponse = {
      range: { from: '2026-09-09T09:00:00Z', to: '2026-09-09T10:00:00Z' },
      buckets: [
        {
          time: '2026-09-09T09:00:00Z',
          locations: [
            { locationId: 'sfo', count: 10, languages: { javascript: 10 } },
            { locationId: 'blr', count: 5, languages: { python: 5 } }
          ]
        },
        {
          time: '2026-09-09T09:15:00Z',
          locations: [{ locationId: 'sfo', count: 7, languages: {} }]
        }
      ]
    };
    const catalogResponse = {
      locations: [
        { id: 'sfo', city: 'San Francisco', country: 'United States', latitude: 37.7749, longitude: -122.4194 },
        { id: 'blr', city: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946 }
      ]
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(url.includes('/api/locations') ? catalogResponse : apiResponse)
        })
      )
    );

    const result = await fetchGlobeActivity(new AbortController().signal);
    expect(result).toEqual([
      expect.objectContaining({ locationId: 'sfo', count: 17 }),
      expect.objectContaining({ locationId: 'blr', count: 5 })
    ]);
    expect(result[0].latitude).toBe(37.7749);
  });

  it('drops location ids without a catalog record instead of fabricating coordinates', async () => {
    const apiResponse = {
      range: { from: '2026-09-09T09:00:00Z', to: '2026-09-09T10:00:00Z' },
      buckets: [
        {
          time: '2026-09-09T09:00:00Z',
          locations: [
            { locationId: 'unknown', count: 99, languages: {} },
            { locationId: 'nowhere', count: 42, languages: {} }
          ]
        }
      ]
    };
    const catalogResponse = { locations: [] };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(url.includes('/api/locations') ? catalogResponse : apiResponse)
        })
      )
    );

    const result = await fetchGlobeActivity(new AbortController().signal);
    expect(result).toEqual([]);
  });

  it('aggregates the same location across multiple buckets', async () => {
    const apiResponse = {
      range: { from: '2026-09-09T09:00:00Z', to: '2026-09-09T10:00:00Z' },
      buckets: [
        { time: '2026-09-09T09:00:00Z', locations: [{ locationId: 'tok', count: 3, languages: {} }] },
        { time: '2026-09-09T09:15:00Z', locations: [{ locationId: 'tok', count: 4, languages: {} }] },
        { time: '2026-09-09T09:30:00Z', locations: [{ locationId: 'tok', count: 5, languages: {} }] }
      ]
    };
    const catalogResponse = {
      locations: [{ id: 'tok', city: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 }]
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(url.includes('/api/locations') ? catalogResponse : apiResponse)
        })
      )
    );

    const result = await fetchGlobeActivity(new AbortController().signal);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(12);
  });

  it('propagates API failures so the hook can keep last-known data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 503 }))
    );

    await expect(fetchGlobeActivity(new AbortController().signal)).rejects.toThrow('503');
  });
});
