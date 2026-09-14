import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';

import { registerApiRoutes } from '../src/routes/api.js';
import { runMigrations } from '../src/db/migrator.js';
import { insertActivityEvents } from '../src/db/activityEvents.js';
import { aggregateIntoBuckets, upsertBuckets } from '../src/db/aggregation.js';
import type { ActivityEvent } from '../src/github/types.js';

const RUN_DB_INTEGRATION = process.env.RUN_DB_INTEGRATION_TESTS === 'true';
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://gitpulse:gitpulse@localhost:5433/gitpulse_test_api';

let app: FastifyInstance;
let pool: pg.Pool;
let dbAvailable = false;

beforeAll(async () => {
  if (!RUN_DB_INTEGRATION) return;
  pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });
  try {
    // Separate database so parallel vitest files never interfere.
    const admin = new pg.Pool({ connectionString: DATABASE_URL.replace(/\/[^/]+$/, '/gitpulse') });
    await admin.query('CREATE DATABASE gitpulse_test_api').catch(() => undefined);
    await admin.end();

    await pool.query('SELECT 1');
    dbAvailable = true;
    await runMigrations(pool);
    // Start from a clean slate — prior runs must never leak into assertions.
    await pool.query('DELETE FROM activity_buckets');
    await pool.query('DELETE FROM activity_events');
    app = Fastify({ logger: false });
    registerApiRoutes(app, pool);
    await app.ready();
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  if (dbAvailable) {
    await pool.query('DROP TABLE IF EXISTS activity_events').catch(() => undefined);
    await pool.query('DROP TABLE IF EXISTS activity_buckets').catch(() => undefined);
    await pool.query('DROP TABLE IF EXISTS schema_migrations').catch(() => undefined);
  }
  if (pool) await pool.end();
  if (app) await app.close();
});

function event(id: string, overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: `github_${id}`,
    source: 'github',
    eventType: 'PUSH',
    eventAction: null,
    eventTime: '2026-09-05T10:07:30Z',
    ingestedAt: '2026-09-05T10:08:00Z',
    userId: 1,
    repositoryId: 2,
    locationId: 'blr',
    languageId: 'python',
    ...overrides
  };
}

const FROM = 'from=2026-09-05T00:00:00Z';
const TO = 'to=2026-09-05T12:00:00Z';

describe.skipIf(!RUN_DB_INTEGRATION)('REST API (live database)', () => {
  beforeAll(async () => {
    if (!dbAvailable) return;
    const events = [
      event('p1', { eventTime: '2026-09-05T10:01:00Z' }),
      event('p2', { eventTime: '2026-09-05T10:09:00Z' }),
      event('i1', { eventTime: '2026-09-05T10:05:00Z', locationId: 'sfo', languageId: 'javascript', eventType: 'ISSUE' }),
      event('u1', { eventTime: '2026-09-05T10:06:00Z', locationId: null, languageId: null })
    ];
    await insertActivityEvents(pool, events);
    await upsertBuckets(pool, aggregateIntoBuckets(events, new Date('2026-09-05T12:00:00Z')));
  });

  it('GET /api/activity returns contract-shaped buckets', async () => {
    const res = await app.inject(`/api/activity?${FROM}&${TO}`);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.range).toEqual({ from: '2026-09-05T00:00:00.000Z', to: '2026-09-05T12:00:00.000Z' });
    expect(Array.isArray(body.buckets)).toBe(true);

    const bucket = body.buckets.find((b: { time: string }) => b.time === '2026-09-05T10:00:00.000Z');
    expect(bucket).toBeDefined();
    const blr = bucket.locations.find((l: { locationId: string }) => l.locationId === 'blr');
    expect(blr.count).toBe(2);
    expect(blr.languages).toEqual({ python: 2 });
  });

  it('GET /api/activity filters by language', async () => {
    const res = await app.inject(`/api/activity?${FROM}&${TO}&language=python`);
    expect(res.statusCode).toBe(200);
    for (const bucket of res.json().buckets) {
      for (const loc of bucket.locations) {
        expect(Object.keys(loc.languages)).toEqual(['python']);
      }
    }
  });

  it('GET /api/activity filters by activityType and location', async () => {
    const res = await app.inject(`/api/activity?${FROM}&${TO}&activityType=ISSUE&location=sfo`);
    expect(res.statusCode).toBe(200);
    const buckets = res.json().buckets;
    expect(buckets.length).toBeGreaterThanOrEqual(1);
    for (const bucket of buckets) {
      for (const loc of bucket.locations) {
        expect(loc.locationId).toBe('sfo');
      }
    }
  });

  it('rejects range over 24 hours with 400 and documented error shape', async () => {
    const res = await app.inject('/api/activity?from=2026-09-04T00:00:00Z&to=2026-09-05T12:00:00Z');
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'maximum range is 24 hours' });
  });

  it('rejects malformed timestamps and inverted ranges with 400', async () => {
    const bad = await app.inject(`/api/activity?${FROM}&to=not-a-date`);
    expect(bad.statusCode).toBe(400);

    const inverted = await app.inject(`/api/activity?from=2026-09-05T12:00:00Z&to=2026-09-05T00:00:00Z`);
    expect(inverted.statusCode).toBe(400);
    expect(inverted.json().error).toBe('from must be before to');
  });

  it('rejects unknown activityType values with 400', async () => {
    const res = await app.inject(`/api/activity?${FROM}&${TO}&activityType=NOT_A_TYPE`);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid activityType');
  });

  it('returns empty buckets (not an error) for ranges with no data', async () => {
    const res = await app.inject('/api/activity?from=2026-09-01T00:00:00Z&to=2026-09-01T01:00:00Z');
    expect(res.statusCode).toBe(200);
    expect(res.json().buckets).toEqual([]);
  });

  it('GET /api/stats computes contract statistics over 24h', async () => {
    const now = new Date();
    const statsEvents = [
      event('stats-push', {
        eventTime: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        ingestedAt: now.toISOString()
      }),
      event('stats-issue', {
        eventTime: new Date(now.getTime() - 4 * 60 * 1000).toISOString(),
        ingestedAt: now.toISOString(),
        eventType: 'ISSUE',
        locationId: 'sfo',
        languageId: 'javascript'
      })
    ];
    await insertActivityEvents(pool, statsEvents);
    await upsertBuckets(pool, aggregateIntoBuckets(statsEvents, now));

    const res = await app.inject('/api/stats');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.activities).toBe('number');
    expect(typeof body.activeLocations).toBe('number');
    expect(body.topLanguage).toBe('python');
    expect(body.topCity).toBe('blr');
    expect(body.activityBreakdown.PUSH).toBeGreaterThanOrEqual(1);
    expect(body.activityBreakdown.ISSUE).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/locations returns the catalog without fabricated entries', async () => {
    const res = await app.inject('/api/locations');
    expect(res.statusCode).toBe(200);
    const locations = res.json().locations;
    expect(locations.length).toBeGreaterThanOrEqual(1);
    for (const loc of locations) {
      expect(Object.keys(loc).sort()).toEqual(['city', 'country', 'id', 'latitude', 'longitude']);
    }
    expect(locations.find((l: { id: string }) => l.id === 'blr')).toMatchObject({ city: 'Bengaluru' });
  });
});
