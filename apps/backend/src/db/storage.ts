import type pg from 'pg';
import type { FastifyBaseLogger } from 'fastify';

import type { ActivityEvent } from '../github/types.js';
import { enrichEvents } from '../enrichment/enrich.js';
import type { EnrichmentDeps } from '../enrichment/enrich.js';
import { diagReport } from '../enrichment/diagnostics.js';
import { insertActivityEvents } from './activityEvents.js';
import { aggregateIntoBuckets, upsertBuckets, deleteOlderThan24h } from './aggregation.js';

export interface StorageOutcome {
  persisted: number;
  buckets: number;
  deletedEvents: number;
  deletedBuckets: number;
}

/**
 * Week 8 minimal persistence stage of the live pipeline (ROADMAP.md
 * "Real Data → Globe"): accepted events must reach the database so
 * /api/activity serves real aggregated buckets. Persistence failures are
 * logged and swallowed — ingestion must never crash the poll loop over a
 * storage outage; events are simply not durably recorded until it recovers.
 */
export async function persistPipelineResult(
  pool: pg.Pool,
  events: ActivityEvent[],
  log: FastifyBaseLogger
): Promise<StorageOutcome> {
  const outcome: StorageOutcome = { persisted: 0, buckets: 0, deletedEvents: 0, deletedBuckets: 0 };
  if (events.length === 0) {
    return outcome;
  }

  try {
    outcome.persisted = await insertActivityEvents(pool, events);
    const rows = aggregateIntoBuckets(events, new Date());
    outcome.buckets = rows.length;
    await upsertBuckets(pool, rows);
  } catch (err) {
    log.error({ err }, 'activity persistence failed; events not stored');
    return outcome;
  }

  // Retention is idempotent; run opportunistically after writes.
  try {
    const deleted = await deleteOlderThan24h(pool, new Date());
    outcome.deletedEvents = deleted.events;
    outcome.deletedBuckets = deleted.buckets;
  } catch (err) {
    log.warn({ err }, 'retention cleanup failed');
  }

  return outcome;
}

export interface PersistEnrichedOutcome {
  outcome: StorageOutcome;
  /** Events as persisted — enriched when enrichment succeeded. */
  events: ActivityEvent[];
}

/**
 * Enriches accepted events then persists them. If the enrichment stage
 * itself fails, events fall back to unenriched persistence — enrichment
 * failure must never discard a valid activity event.
 */
export async function persistEnrichedResult(
  pool: pg.Pool,
  events: ActivityEvent[],
  enrichment: EnrichmentDeps,
  log: FastifyBaseLogger
): Promise<PersistEnrichedOutcome> {
  let toPersist = events;
  try {
    toPersist = (await enrichEvents(events, enrichment)).map((r) => r.event);
  } catch (err) {
    log.error({ err }, 'enrichment failed; persisting unenriched events');
  }
  const outcome = await persistPipelineResult(pool, toPersist, log);
  diagReport(
    {
      persistedRows: outcome.persisted,
      persistedWithLocation: toPersist.filter((e) => e.locationId !== null).length,
      persistedWithLanguage: toPersist.filter((e) => e.languageId !== null).length,
      buckets: outcome.buckets
    },
    log
  );
  return { outcome, events: toPersist };
}
