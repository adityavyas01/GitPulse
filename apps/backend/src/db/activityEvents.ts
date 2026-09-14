import type pg from 'pg';
import type { ActivityEvent } from '../github/types.js';

/**
 * Persists normalized activity events. Durable backstop for in-memory
 * dedup: UNIQUE(source, source_event_id) per SRS §5. Duplicates are
 * skipped via ON CONFLICT — repeated polls/retries never duplicate rows.
 * Unresolved location/language stay NULL (never fabricated).
 */
export async function insertActivityEvents(pool: pg.Pool, events: ActivityEvent[]): Promise<number> {
  if (events.length === 0) {
    return 0;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let inserted = 0;
    for (const event of events) {
      const result = await client.query(
        `INSERT INTO activity_events
           (id, source, source_event_id, event_type, event_action,
            event_time, ingested_at, user_id, repository_id, location_id, language_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (source, source_event_id) DO NOTHING`,
        [
          event.id,
          event.source,
          event.id.replace(/^github_/, ''),
          event.eventType,
          event.eventAction,
          event.eventTime,
          event.ingestedAt,
          event.userId,
          event.repositoryId,
          event.locationId,
          event.languageId
        ]
      );
      inserted += result.rowCount ?? 0;
    }
    await client.query('COMMIT');
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
