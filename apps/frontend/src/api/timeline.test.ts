import { describe, expect, it } from 'vitest';

import { TIMELINE_BUCKETS, alignTimeline, formatSlotTime } from './timeline.js';

const CATALOG = [
  { id: 'blr', city: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946 },
  { id: 'sfo', city: 'San Francisco', country: 'United States', latitude: 37.7749, longitude: -122.4194 }
];

const TO = '2026-09-11T12:00:00.000Z'; // range end; newest slot (95)

// Buckets from the API are floor-aligned to the absolute 15-minute grid.
function bucketAt(minutesBeforeEnd: number, locationId: string, count: number) {
  const raw = Date.parse(TO) - minutesBeforeEnd * 60_000;
  const time = new Date(Math.floor(raw / (15 * 60_000)) * 15 * 60_000).toISOString();
  return { time, locations: [{ locationId, count }] };
}

describe('alignTimeline (Week 10)', () => {
  it('produces exactly 96 grid-aligned 15-minute slots covering the 24 hours before range.to', () => {
    const slots = alignTimeline({ range: { from: '2026-09-10T12:00:00.000Z', to: TO }, buckets: [] }, CATALOG);
    expect(slots).toHaveLength(TIMELINE_BUCKETS);
    // Newest slot = the grid slot containing range.to.
    expect(slots[95].time).toBe('2026-09-11T12:00:00.000Z');
    expect(slots[94].time).toBe('2026-09-11T11:45:00.000Z');
    expect(slots[0].time).toBe('2026-09-10T12:15:00.000Z');
    // Newest slot time is >= range.to (contains it); its label reads 12:00.
  });

  it('places bucket activity in the correct slot', () => {
    const slots = alignTimeline(
      {
        range: { from: '2026-09-10T12:00:00.000Z', to: TO },
        buckets: [bucketAt(30, 'blr', 7), bucketAt(0, 'sfo', 3)]
      },
      CATALOG
    );
    expect(slots[93].locations).toEqual([
      { locationId: 'blr', city: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946, count: 7 }
    ]);
    expect(slots[95].locations[0].locationId).toBe('sfo');
  });

  it('merges buckets that fall into the same slot', () => {
    const slots = alignTimeline(
      {
        range: { from: '2026-09-10T12:00:00.000Z', to: TO },
        buckets: [bucketAt(1, 'blr', 4), bucketAt(14, 'blr', 2)]
      },
      CATALOG
    );
    expect(slots[94].locations).toHaveLength(1);
    expect(slots[94].locations[0].count).toBe(6);
  });

  it('leaves missing slots empty instead of fabricating activity', () => {
    const slots = alignTimeline(
      { range: { from: '2026-09-10T12:00:00.000Z', to: TO }, buckets: [bucketAt(0, 'sfo', 3)] },
      CATALOG
    );
    expect(slots[0].locations).toEqual([]);
    expect(slots[50].locations).toEqual([]);
  });

  it('drops unknown location ids (never plots unresolved locations)', () => {
    const slots = alignTimeline(
      { range: { from: '2026-09-10T12:00:00.000Z', to: TO }, buckets: [bucketAt(0, 'nowhere', 9)] },
      CATALOG
    );
    expect(slots[95].locations).toEqual([]);
  });

  it('sorts slot locations by descending count', () => {
    const slots = alignTimeline(
      {
        range: { from: '2026-09-10T12:00:00.000Z', to: TO },
        buckets: [bucketAt(0, 'blr', 2), bucketAt(0, 'sfo', 8)]
      },
      CATALOG
    );
    expect(slots[95].locations.map((l) => l.locationId)).toEqual(['sfo', 'blr']);
  });

  it('ignores buckets outside the 24-hour window or in the future', () => {
    const slots = alignTimeline(
      {
        range: { from: '2026-09-10T12:00:00.000Z', to: TO },
        buckets: [bucketAt(25 * 60, 'blr', 5), bucketAt(-20, 'sfo', 5)]
      },
      CATALOG
    );
    expect(slots.every((s) => s.locations.length === 0)).toBe(true);
  });

  it('returns no slots on an unparseable range end', () => {
    const slots = alignTimeline(
      { range: { from: 'bad', to: 'bad' }, buckets: [bucketAt(0, 'blr', 1)] },
      CATALOG
    );
    expect(slots).toEqual([]);
  });
});

describe('formatSlotTime', () => {
  it('formats UTC HH:MM', () => {
    expect(formatSlotTime('2026-09-11T09:05:00.000Z')).toBe('09:05 UTC');
  });

  it('returns a placeholder for invalid input', () => {
    expect(formatSlotTime('not-a-date')).toBe('--:--');
  });
});
