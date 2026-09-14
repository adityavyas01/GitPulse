import type pg from 'pg';
import type { ActivityEvent } from '../github/types.js';

/** 15-minute buckets per ADR-008 / SRS §14. */
export const BUCKET_MINUTES = 15;

export interface BucketRow {
  bucketStart: string;
  locationId: string;
  languageId: string;
  eventType: string;
  eventCount: number;
}

/**
 * Floor an ISO timestamp to its UTC 15-minute bucket start.
 * Deterministic: uses absolute UTC time, never local timezone.
 */
export function bucketStartFor(isoTime: string, bucketMinutes: number = BUCKET_MINUTES): string {
  const ms = Date.parse(isoTime);
  if (Number.isNaN(ms)) {
    throw new Error(`invalid timestamp: ${isoTime}`);
  }
  const bucketMs = bucketMinutes * 60 * 1000;
  const floored = Math.floor(ms / bucketMs) * bucketMs;
  return new Date(floored).toISOString();
}

/**
 * Aggregates events into time × location × language × event_type buckets
 * (SRS §14). Bucket key uses eventTime (not ingestion time) per contract.
 * Null enrichment dims aggregate under the 'unknown' sentinel so the
 * composite primary key holds; raw rows keep real NULLs.
 */
export function aggregateIntoBuckets(events: ActivityEvent[], now: Date): BucketRow[] {
  const UNKNOWN = 'unknown';
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  const totals = new Map<string, BucketRow>();

  for (const event of events) {
    const eventMs = Date.parse(event.eventTime);
    if (Number.isNaN(eventMs) || eventMs < cutoff || eventMs > now.getTime()) {
      // Outside the 24h window or skewed: excluded from aggregation.
      continue;
    }
    const key = [
      bucketStartFor(event.eventTime),
      event.locationId ?? UNKNOWN,
      event.languageId ?? UNKNOWN,
      event.eventType
    ].join('|');

    const existing = totals.get(key);
    if (existing) {
      existing.eventCount += 1;
    } else {
      totals.set(key, {
        bucketStart: bucketStartFor(event.eventTime),
        locationId: event.locationId ?? UNKNOWN,
        languageId: event.languageId ?? UNKNOWN,
        eventType: event.eventType,
        eventCount: 1
      });
    }
  }

  return [...totals.values()];
}

/**
 * Upserts bucket rows. Repeated aggregation is idempotent: the final state
 * equals the true totals regardless of how many times this runs.
 */
export async function upsertBuckets(pool: pg.Pool, rows: BucketRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const row of rows) {
      await client.query(
        `INSERT INTO activity_buckets (bucket_start, location_id, language_id, event_type, event_count)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (bucket_start, location_id, language_id, event_type)
         DO UPDATE SET event_count = EXCLUDED.event_count`,
        [row.bucketStart, row.locationId, row.languageId, row.eventType, row.eventCount]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 24-hour retention (ADR-007): deletes event rows and bucket rows older
 * than 24h. Based on ingested_at for events (data lifecycle) and
 * bucket_start for buckets. Reference metadata (locations/languages
 * tables) is untouched and persists.
 */
export async function deleteOlderThan24h(pool: pg.Pool, now: Date): Promise<{ events: number; buckets: number }> {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const ev = await pool.query('DELETE FROM activity_events WHERE ingested_at < $1', [cutoff]);
  const bk = await pool.query('DELETE FROM activity_buckets WHERE bucket_start < $1', [cutoff]);
  return { events: ev.rowCount ?? 0, buckets: bk.rowCount ?? 0 };
}
