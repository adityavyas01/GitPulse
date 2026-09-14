import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type pg from 'pg';

import { registerApiRoutes } from '../src/routes/api.js';

const query = vi.fn();
const pool = { query } as unknown as pg.Pool;

async function createApp() {
  const app = Fastify({ logger: false });
  registerApiRoutes(app, pool);
  await app.ready();
  return app;
}

describe('REST API route contract', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue({
      rows: [
        {
          bucket_start: new Date('2026-09-05T10:00:00Z'),
          location_id: 'blr',
          language_id: 'python',
          event_type: 'PUSH',
          event_count: '2'
        }
      ]
    });
  });

  it('shapes activity buckets and parameterizes documented filters', async () => {
    const app = await createApp();
    const response = await app.inject('/api/activity?from=2026-09-05T00:00:00Z&to=2026-09-05T12:00:00Z&language=Python&activityType=push&location=BLR');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      range: { from: '2026-09-05T00:00:00.000Z', to: '2026-09-05T12:00:00.000Z' },
      buckets: [
        {
          time: '2026-09-05T10:00:00.000Z',
          locations: [{ locationId: 'blr', count: 2, languages: { python: 2 } }]
        }
      ]
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE bucket_start >= $1 AND bucket_start <= $2'),
      [new Date('2026-09-05T00:00:00Z'), new Date('2026-09-05T12:00:00Z'), 'python', 'PUSH', 'blr']
    );
    await app.close();
  });

  it('rejects invalid requests without querying the database', async () => {
    const app = await createApp();
    const response = await app.inject('/api/activity?from=2026-09-05T00:00:00Z&to=2026-09-07T00:00:00Z');

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'maximum range is 24 hours' });
    expect(query).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns a non-leaking 503 when activity storage is unavailable', async () => {
    query.mockRejectedValueOnce(new Error('internal connection details'));
    const app = await createApp();
    const response = await app.inject('/api/activity?from=2026-09-05T00:00:00Z&to=2026-09-05T12:00:00Z');

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: 'database unavailable' });
    expect(response.body).not.toContain('internal connection details');
    await app.close();
  });

  it('returns shaped statistics and handles database failures without leaking errors', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          bucket_start: new Date(),
          location_id: 'blr',
          language_id: 'python',
          event_type: 'PUSH',
          event_count: '3'
        },
        {
          bucket_start: new Date(),
          location_id: 'sfo',
          language_id: 'javascript',
          event_type: 'ISSUE',
          event_count: '1'
        }
      ]
    });
    const app = await createApp();
    const response = await app.inject('/api/stats');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      activities: 4,
      activeLocations: 2,
      topLanguage: 'python',
      topCity: 'blr',
      activityBreakdown: { PUSH: 3, ISSUE: 1 }
    });

    query.mockRejectedValueOnce(new Error('internal stats details'));
    const failed = await app.inject('/api/stats');
    expect(failed.statusCode).toBe(503);
    expect(failed.json()).toEqual({ error: 'database unavailable' });
    expect(failed.body).not.toContain('internal stats details');
    await app.close();
  });

  it('returns only the authoritative location catalog', async () => {
    const app = await createApp();
    const response = await app.inject('/api/locations');

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.locations).toContainEqual({
      id: 'blr',
      city: 'Bengaluru',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.5946
    });
    expect(query).not.toHaveBeenCalled();
    await app.close();
  });
});
