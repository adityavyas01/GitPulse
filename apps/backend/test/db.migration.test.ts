import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Static contract tests for the migration SQL: assert the documented schema
 * requirements are present. Live-database behavior is exercised in
 * integration tests (docker compose postgres) when the DB is available.
 */
describe('migration 001_init.sql', () => {
  let sql: string;

  it('loads', async () => {
    const p = path.join(path.dirname(fileURLToPath(import.meta.url)), '../migrations/001_init.sql');    sql = await readFile(p, 'utf8');
    expect(sql.length).toBeGreaterThan(0);
  });

  it('creates activity_events with UNIQUE(source, source_event_id) — durable dedup backstop', async () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS activity_events/);
    expect(sql).toMatch(/UNIQUE \(source, source_event_id\)/);
  });

  it('stores event_time and ingested_at as distinct TIMESTAMPTZ columns', async () => {
    expect(sql).toMatch(/event_time TIMESTAMPTZ NOT NULL/);
    expect(sql).toMatch(/ingested_at TIMESTAMPTZ NOT NULL/);
  });

  it('keeps enrichment fields nullable — never fabricated', async () => {
    expect(sql).toMatch(/location_id TEXT,/);
    expect(sql).toMatch(/language_id TEXT,/);
  });

  it('has no latitude/longitude columns on activity_events (ADR-005)', async () => {
    expect(sql).not.toMatch(/latitude/);
    expect(sql).not.toMatch(/longitude/);
  });

  it('creates activity_buckets with the documented composite primary key', async () => {
    expect(sql).toMatch(/PRIMARY KEY \(bucket_start, location_id, language_id, event_type\)/);
  });

  it('creates the required SRS §11 indexes', async () => {
    expect(sql).toMatch(/idx_activity_events_event_time\s+ON activity_events \(event_time\)/);
    expect(sql).toMatch(/idx_activity_events_event_time_location/);
    expect(sql).toMatch(/idx_activity_events_event_time_language/);
    expect(sql).toMatch(/idx_activity_events_event_time_type/);
  });

  it('tracks applied migrations in schema_migrations', async () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS schema_migrations/);
  });
});
