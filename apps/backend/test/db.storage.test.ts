import { describe, expect, it } from 'vitest';
import pg from 'pg';

import { persistPipelineResult } from '../src/db/storage.js';
import type { ActivityEvent } from '../src/github/types.js';

const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://gitpulse:gitpulse@localhost:5433/gitpulse_test_wiring';

function log() {
  return { error: () => undefined, warn: () => undefined, info: () => undefined } as never;
}

function event(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: 'github_w8_1',
    source: 'github',
    eventType: 'PUSH',
    eventAction: null,
    eventTime: new Date(Date.now() - 60_000).toISOString(),
    ingestedAt: new Date().toISOString(),
    userId: 1,
    repositoryId: 2,
    locationId: 'sfo',
    languageId: 'javascript',
    ...overrides
  };
}

describe('pipeline → storage wiring (Week 8)', () => {
  it('is a no-op for an empty accepted list without touching the database', async () => {
    const pool = new pg.Pool({ connectionString: 'postgres://gitpulse:gitpulse@localhost:5433/no_such_db_w8' });
    try {
      const outcome = await persistPipelineResult(pool, [], log());
      expect(outcome).toEqual({ persisted: 0, buckets: 0, deletedEvents: 0, deletedBuckets: 0 });
    } finally {
      await pool.end();
    }
  });

  it('survives a database outage without throwing (ingestion must not crash)', async () => {
    const pool = new pg.Pool({
      connectionString: 'postgres://gitpulse:gitpulse@localhost:5433/no_such_db_w8',
      connectionTimeoutMillis: 1000
    });
    try {
      const outcome = await persistPipelineResult(pool, [event()], log());
      expect(outcome.persisted).toBe(0);
      expect(outcome.buckets).toBe(0);
    } finally {
      await pool.end();
    }
  });

  it(
    'persists accepted events into events + buckets against a live database',
    { skip: process.env.RUN_DB_INTEGRATION_TESTS !== 'true' },
    async () => {
      const admin = new pg.Pool({ connectionString: DATABASE_URL.replace(/\/[^/]+$/, '/gitpulse') });
      await admin.query('CREATE DATABASE gitpulse_test_wiring').catch(() => undefined);
      await admin.end();

      const pool = new pg.Pool({ connectionString: DATABASE_URL });
      try {
        const { runMigrations } = await import('../src/db/migrator.js');
        await runMigrations(pool);

        const outcome = await persistPipelineResult(
          pool,
          [event(), event({ id: 'github_w8_2', locationId: 'tok' })],
          log()
        );
        expect(outcome.persisted).toBe(2);
        expect(outcome.buckets).toBeGreaterThan(0);

        const buckets = await pool.query('SELECT event_count FROM activity_buckets');
        const total = buckets.rows.reduce((sum, r) => sum + Number(r.event_count), 0);
        expect(total).toBe(2);
      } finally {
        await pool.query('DROP TABLE IF EXISTS activity_events').catch(() => undefined);
        await pool.query('DROP TABLE IF EXISTS activity_buckets').catch(() => undefined);
        await pool.query('DROP TABLE IF EXISTS schema_migrations').catch(() => undefined);
        await pool.end();
      }
    }
  );
});
