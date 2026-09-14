import { describe, expect, it } from 'vitest';

import { bucketStartFor, aggregateIntoBuckets, type BucketRow } from '../src/db/aggregation.js';
import type { ActivityEvent } from '../src/github/types.js';

function event(partial: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: 'github_1',
    source: 'github',
    eventType: 'PUSH',
    eventAction: null,
    eventTime: '2026-09-05T10:07:30Z',
    ingestedAt: '2026-09-05T10:08:00Z',
    userId: 1,
    repositoryId: 2,
    locationId: null,
    languageId: null,
    ...partial
  };
}

describe('bucketStartFor', () => {
  it('floors to the UTC 15-minute boundary', () => {
    expect(bucketStartFor('2026-09-05T10:07:30Z')).toBe('2026-09-05T10:00:00.000Z');
    expect(bucketStartFor('2026-09-05T10:00:00Z')).toBe('2026-09-05T10:00:00.000Z');
    expect(bucketStartFor('2026-09-05T10:14:59.999Z')).toBe('2026-09-05T10:00:00.000Z');
  });

  it('rolls over at the boundary — next event lands in the next bucket', () => {
    expect(bucketStartFor('2026-09-05T10:15:00.000Z')).toBe('2026-09-05T10:15:00.000Z');
    expect(bucketStartFor('2026-09-05T23:59:59Z')).toBe('2026-09-05T23:45:00.000Z');
  });

  it('is UTC-based, not local time', () => {
    // 10:00Z must bucket identically regardless of machine timezone.
    expect(bucketStartFor('2026-01-01T00:07:00Z')).toBe('2026-01-01T00:00:00.000Z');
  });

  it('throws on invalid timestamps', () => {
    expect(() => bucketStartFor('not-a-date')).toThrow();
  });
});

describe('aggregateIntoBuckets', () => {
  it('counts events per time × location × language × type', () => {
    const now = new Date('2026-09-05T10:20:00Z');
    const events = [
      event({ id: '1', eventTime: '2026-09-05T10:01:00Z', locationId: 'blr', languageId: 'python' }),
      event({ id: '2', eventTime: '2026-09-05T10:09:00Z', locationId: 'blr', languageId: 'python' }),
      event({ id: '3', eventTime: '2026-09-05T10:16:00Z', locationId: 'blr', languageId: 'python' }),
      event({ id: '4', eventTime: '2026-09-05T10:02:00Z', locationId: 'sfo', languageId: 'javascript', eventType: 'ISSUE' })
    ];

    const rows = aggregateIntoBuckets(events, now);
    const find = (loc: string, lang: string, type: string, bucket: string): BucketRow | undefined =>
      rows.find((r) => r.locationId === loc && r.languageId === lang && r.eventType === type && r.bucketStart === bucket);

    expect(rows).toHaveLength(3); // 10:00 blr/python/PUSH ×2 merged; 10:15 blr/python/PUSH; 10:00 sfo/javascript/ISSUE
    expect(find('blr', 'python', 'PUSH', '2026-09-05T10:00:00.000Z')?.eventCount).toBe(2);
    expect(find('blr', 'python', 'PUSH', '2026-09-05T10:15:00.000Z')?.eventCount).toBe(1);
    expect(find('sfo', 'javascript', 'ISSUE', '2026-09-05T10:00:00.000Z')?.eventCount).toBe(1);
  });

  it('aggregates unresolved dimensions under the unknown sentinel', () => {
    const now = new Date('2026-09-05T10:20:00Z');
    const rows = aggregateIntoBuckets([event({ id: '9', eventTime: '2026-09-05T10:05:00Z' })], now);
    expect(rows[0].locationId).toBe('unknown');
    expect(rows[0].languageId).toBe('unknown');
  });

  it('excludes events older than 24 hours (retention window)', () => {
    const now = new Date('2026-09-05T10:20:00Z');
    const rows = aggregateIntoBuckets(
      [event({ id: 'old', eventTime: '2026-09-04T10:19:00Z' })],
      now
    );
    expect(rows).toHaveLength(0);
  });

  it('excludes future-skewed events', () => {
    const now = new Date('2026-09-05T10:20:00Z');
    const rows = aggregateIntoBuckets(
      [event({ id: 'future', eventTime: '2026-09-05T11:30:00Z' })],
      now
    );
    expect(rows).toHaveLength(0);
  });

  it('includes an event exactly at the 24h boundary', () => {
    const now = new Date('2026-09-05T10:20:00Z');
    const boundary = '2026-09-04T10:20:00Z';
    const rows = aggregateIntoBuckets([event({ id: 'edge', eventTime: boundary })], now);
    expect(rows).toHaveLength(1);
  });
});
