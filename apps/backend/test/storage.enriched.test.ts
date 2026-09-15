import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import pg from 'pg';

import { persistEnrichedResult } from '../src/db/storage.js';
import { runMigrations } from '../src/db/migrator.js';
import { createEnrichmentDeps, type EnrichmentDeps } from '../src/enrichment/enrich.js';
import type { ActivityEvent } from '../src/github/types.js';
import type { GithubConfig } from '../src/github/config.js';
import { loadConfig } from '../src/index.js';

const RUN = process.env.RUN_DB_INTEGRATION_TESTS === 'true';
// Dynamic timestamps: retention (24h by ingested_at) runs inside
// persistPipelineResult, so fixtures must stay inside the live window.
const base = Date.now();
const d = (minutesAgo: number) => new Date(base - minutesAgo * 60000).toISOString();

function makeEvent(id: number, userId: number, repoId: number): ActivityEvent {
  return {
    id: `github_test_enrich_${id}`,
    source: 'github',
    eventType: 'PUSH',
    eventAction: null,
    eventTime: d(60 - id),
    ingestedAt: d(1),
    userId,
    repositoryId: repoId,
    locationId: null,
    languageId: null
  };
}

// Deterministic enrichment stubs (client never touched).
function stubDeps(behavior: {
  location?: string | null;
  language?: string | null;
  throwOnUser?: boolean;
}): EnrichmentDeps {
  const config: GithubConfig = {
    token: null,
    apiUrl: 'http://localhost:0',
    minPollIntervalMs: 60000,
    maxRetries: 0,
    retryBaseDelayMs: 1,
    requestTimeoutMs: 1
  };
  const log = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
    trace: () => undefined,
    fatal: () => undefined,
    child: () => log
  } as never;
  const deps = createEnrichmentDeps(config, log);
  const base = behavior.throwOnUser
    ? Promise.reject(new Error('enrichment down'))
    : Promise.resolve({
        userId: 1,
        username: 'u',
        location: behavior.location ?? null
      });
  // enrichEvents consumes deps.client.users/.repositories — replace the
  // whole client with a deterministic stub (no network access in tests).
  (deps as { client: unknown }).client = {
    users: { get: () => base },
    repositories: {
      get: () =>
        Promise.resolve({ repositoryId: 1, name: 'r', primaryLanguage: behavior.language ?? null })
    }
  };
  return deps;
}

describe.skipIf(!RUN)('persistEnrichedResult (live database)', () => {
  let pool: pg.Pool;
  const dbName = process.env.GITPULSE_TEST_DB ?? 'gitpulse_test';

  beforeAll(async () => {
    const admin = new pg.Pool({ connectionString: loadConfig().databaseUrl });
    await admin.query(`DROP DATABASE IF EXISTS ${dbName}`);
    await admin.query(`CREATE DATABASE ${dbName}`);
    await admin.end();
    pool = new pg.Pool({
      connectionString: loadConfig().databaseUrl.replace(/\/[^/]+$/, `/${dbName}`)
    });
    await runMigrations(pool);
  });

  afterAll(async () => {
    await pool?.end();
    const admin = new pg.Pool({ connectionString: loadConfig().databaseUrl });
    await admin.query(`DROP DATABASE IF EXISTS ${dbName}`);
    await admin.end();
  });

  it('persists enriched location_id and language_id on the production path', async () => {
    const events = [makeEvent(1, 101, 201), makeEvent(2, 102, 202)];
    const { outcome, events: enriched } = await persistEnrichedResult(
      pool,
      events,
      stubDeps({ location: 'San Francisco, United States', language: 'TypeScript' }),
      console as never
    );
    expect(outcome.persisted).toBe(2);
    expect(enriched.every((e) => e.locationId === 'sfo' && e.languageId !== null)).toBe(true);

    const rows = await pool.query(
      'SELECT location_id, language_id FROM activity_events WHERE source_event_id LIKE \'test_enrich_%\' ORDER BY source_event_id'
    );
    expect(rows.rowCount).toBe(2);
    expect(rows.rows[0].location_id).toBe('sfo');
    expect(rows.rows[0].language_id).not.toBeNull();
  });

  it('keeps events with NULL location/language when metadata is missing', async () => {
    const events = [makeEvent(3, 103, 203)];
    const { outcome, events: enriched } = await persistEnrichedResult(
      pool,
      events,
      stubDeps({ location: null, language: null }),
      console as never
    );
    expect(outcome.persisted).toBe(1);
    expect(enriched[0].locationId).toBeNull();
    expect(enriched[0].languageId).toBeNull();
    const rows = await pool.query(
      'SELECT location_id, language_id FROM activity_events WHERE source_event_id = \'test_enrich_3\''
    );
    expect(rows.rows[0].location_id).toBeNull();
    expect(rows.rows[0].language_id).toBeNull();
  });

  it('persists unenriched rather than discarding events when enrichment throws', async () => {
    const events = [makeEvent(4, 104, 204)];
    const { outcome, events: enriched } = await persistEnrichedResult(
      pool,
      events,
      stubDeps({ throwOnUser: true }),
      console as never
    );
    expect(outcome.persisted).toBe(1);
    expect(enriched[0].locationId).toBeNull();
    const rows = await pool.query(
      'SELECT count(*)::int AS n FROM activity_events WHERE source_event_id = \'test_enrich_4\''
    );
    expect(rows.rows[0].n).toBe(1);
  });
});
