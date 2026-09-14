import type { ActivityEvent } from './types.js';

/**
 * In-memory deduplication on (source, source_event_id) — the unique identity
 * required by SRS §5. Rolling GitHub polls re-deliver events; duplicates must
 * not create duplicate activity records. The database UNIQUE constraint
 * (Week 6) remains the durable backstop; this is the in-flight filter.
 *
 * Eviction is LRU: re-seeing an id refreshes its recency, so ids that keep
 * being re-delivered stay protected while stale ids age out at the cap.
 */
export class EventDeduplicator {
  private readonly seen = new Map<string, null>();
  private readonly maxKeys: number;

  constructor(maxKeys = 50000) {
    this.maxKeys = maxKeys;
  }

  isDuplicate(event: ActivityEvent): boolean {
    if (!this.seen.has(event.id)) {
      return false;
    }
    // Refresh recency: delete + re-insert moves the key to the end.
    const existed = this.seen.delete(event.id);
    if (existed) {
      this.seen.set(event.id, null);
    }
    return true;
  }

  add(event: ActivityEvent): void {
    if (this.seen.has(event.id)) {
      // Re-delivered before eviction: refresh recency, keep identity.
      this.seen.delete(event.id);
    } else if (this.seen.size >= this.maxKeys) {
      const oldest = this.seen.keys().next().value;
      if (oldest !== undefined) {
        this.seen.delete(oldest);
      }
    }
    this.seen.set(event.id, null);
  }

  get size(): number {
    return this.seen.size;
  }
}
