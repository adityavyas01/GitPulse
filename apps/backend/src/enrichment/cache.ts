/**
 * Generic bounded TTL cache for enrichment metadata (SRS §6/§7: cache-first,
 * never one GitHub request per event). Single-flight: concurrent lookups of
 * the same key share one in-flight promise (no N+1 / duplicate requests).
 */
export class TtlCache<T> {
  private readonly entries = new Map<string, { value: T | null; expiresAt: number }>();
  private readonly inflight = new Map<string, Promise<T | null>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly loader: (key: string) => Promise<T | null>
  ) {}

  async get(key: string): Promise<T | null> {
    const existing = this.entries.get(key);
    const now = Date.now();
    if (existing && existing.expiresAt > now) {
      // Refresh recency for LRU eviction.
      this.entries.delete(key);
      this.entries.set(key, existing);
      return existing.value;
    }
    if (existing) {
      this.entries.delete(key);
    }

    const pending = this.inflight.get(key);
    if (pending) {
      return pending;
    }

    const promise = this.loader(key)
      .then((value) => {
        this.store(key, value, now);
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }

  private store(key: string, value: T | null, now: number): void {
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
  }

  get size(): number {
    return this.entries.size;
  }
}
