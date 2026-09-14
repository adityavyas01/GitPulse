import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

import { runMigrations } from '../src/db/migrator.js';
import { insertActivityEvents } from '../src/db/activityEvents.js';
import { aggregateIntoBuckets, upsertBuckets, deleteOlderThan24h, bucketStartFor } from '../src/db/aggregation.js';
import type { ActivityEvent } from '../src/github/types.js';

/**
 * Live-database integration tests (TESTING.md integration scope).
 * Requires postgres from docker-compose (host port 5433).
 * Uses a dedicated test database; skipped automatically when unavailable.
 */
const RUN_DB_INTEGRATION = process.env.RUN_DB_INTEGRATION_TESTS === 'true';
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://gitpulse:gitpulse@localhost:5433/gitpulse_test';

let pool: pg.Pool;
let dbAvailable = false;

beforeAll(async () => {
  if (!RUN_DB_INTEGRATION) return;
  pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });
  try {
    // Provision the test database itself if missing.
    const admin = new pg.Pool({ connectionString: DATABASE_URL.replace(/\/[^/]+$/, '/gitpulse') });
    await admin.query('CREATE DATABASE gitpulse_test').catch(() => undefined);
    await admin.end();

    await pool.query('SELECT 1');
    dbAvailable = true;
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
    locationId: null,
    languageId: null,
    ...overrides
  };
}

describe.skipIf(!RUN_DB_INTEGRATION)('database integration', () => {
  it('applies migrations from a clean database and is idempotent', async () => {
    const first = await runMigrations(pool);
    expect(first).toContain('001_init.sql');

    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
    );
    const names = tables.rows.map((r) => r.table_name);
    expect(names).toContain('activity_events');
    expect(names).toContain('activity_buckets');
    expect(names).toContain('schema_migrations');

    const second = await runMigrations(pool);
    expect(second).toHaveLength(0);
  });

  it('persists an event and rejects duplicates via UNIQUE(source, source_event_id)', async () => {
    await runMigrations(pool);
    const inserted = await insertActivityEvents(pool, [event('a1')]);
    expect(inserted).toBe(1);

    const again = await insertActivityEvents(pool, [event('a1')]);
    expect(again).toBe(0);

    const count = await pool.query('SELECT COUNT(*)::int AS n FROM activity_events');
    expect(count.rows[0].n).toBe(1);
  });

  it('keeps nullable enrichment fields NULL and separates event_time from ingested_at', async () => {
    await insertActivityEvents(pool, [event('a2')]);
    const row = await pool.query('SELECT event_time, ingested_at, location_id, language_id FROM activity_events WHERE source_event_id = $1', ['a2']);
    expect(row.rows[0].location_id).toBeNull();
    expect(row.rows[0].language_id).toBeNull();
    expect(new Date(row.rows[0].event_time).toISOString()).toBe('2026-09-05T10:07:30.000Z');
    expect(new Date(row.rows[0].ingested_at).toISOString()).toBe('2026-09-05T10:08:00.000Z');
  });

  it('aggregates and upserts idempotently — repeated runs keep correct totals', async () => {
    const now = new Date('2026-09-05T10:20:00Z');
    const events = [
      event('b1', { eventTime: '2026-09-05T10:01:00Z', locationId: 'blr', languageId: 'python' }),
      event('b2', { eventTime: '2026-09-05T10:09:00Z', locationId: 'blr', languageId: 'python' })
    ];
    await insertActivityEvents(pool, events);

    const rows = aggregateIntoBuckets(events, now);
    expect(rows).toHaveLength(1);
    expect(rows[0].eventCount).toBe(2);

    await upsertBuckets(pool, rows);
    await upsertBuckets(pool, rows); // repeat — idempotent

    const stored = await pool.query('SELECT event_count FROM activity_buckets WHERE location_id=$1', ['blr']);
    expect(stored.rows).toHaveLength(1);
    expect(Number(stored.rows[0].event_count)).toBe(2);
  });

  it('deletes events older than 24h by ingested_at and buckets by bucket_start; keeps recent reference rows', async () => {
    await runMigrations(pool);
    const now = new Date('2026-09-05T10:20:00Z');

    await insertActivityEvents(pool, [
      event('fresh', { ingestedAt: '2026-09-05T10:00:00Z' }),
      event('stale', { ingestedAt: '2026-09-04T10:00:00Z' })
    ]);

    const staleBucketStart = bucketStartFor('2026-09-04T09:00:00Z');
    await pool.query(
      'INSERT INTO activity_buckets (bucket_start, location_id, language_id, event_type, event_count) VALUES ($1,$2,$3,$4,$5)',
      [staleBucketStart, 'blr', 'python', 'PUSH', 5]
    );

    const result = await deleteOlderThan24h(pool, now);
    expect(result.events).toBeGreaterThanOrEqual(1);
    expect(result.buckets).toBeGreaterThanOrEqual(1);

    const remaining = await pool.query("SELECT source_event_id FROM activity_events WHERE source_event_id IN ('fresh','stale')");
    expect(remaining.rows.map((r) => r.source_event_id)).toEqual(['fresh']);
  });
});
