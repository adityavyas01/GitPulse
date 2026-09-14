import { describe, expect, it } from 'vitest';

import { EventDeduplicator } from '../src/github/dedupe.js';
import type { ActivityEvent } from '../src/github/types.js';

describe('EventDeduplicator', () => {
  it('flags repeated source + source event id as duplicate', () => {
    const dedupe = new EventDeduplicator();
    const event = activity('github_1');
    dedupe.add(event);
    expect(dedupe.isDuplicate(event)).toBe(true);
    expect(dedupe.isDuplicate(activity('github_2'))).toBe(false);
  });

  it('distinguishes different sources with same numeric id via id prefix', () => {
    const dedupe = new EventDeduplicator();
    dedupe.add(activity('gitlab_1'));
    expect(dedupe.isDuplicate(activity('github_1'))).toBe(false);
  });

  it('handles repeated rolling polls without growth beyond cap', () => {
    const dedupe = new EventDeduplicator(3);
    for (let i = 0; i < 5; i++) {
      dedupe.add(activity(`github_${i}`));
    }
    expect(dedupe.size).toBe(3);
  });

  it('evicts least-recently-seen, not merely first-inserted', () => {
    const dedupe = new EventDeduplicator(2);
    dedupe.add(activity('github_a'));
    dedupe.add(activity('github_b'));
    // Touch github_a: it becomes most-recently-seen.
    expect(dedupe.isDuplicate(activity('github_a'))).toBe(true);
    // Adding github_c must evict github_b (stale), not github_a (recent).
    dedupe.add(activity('github_c'));
    expect(dedupe.isDuplicate(activity('github_a'))).toBe(true);
    expect(dedupe.isDuplicate(activity('github_b'))).toBe(false);
    expect(dedupe.isDuplicate(activity('github_c'))).toBe(true);
  });
});

function activity(id: string): ActivityEvent {
  return {
    id,
    source: 'github',
    eventType: 'PUSH',
    eventAction: null,
    eventTime: '2026-09-04T10:00:00Z',
    ingestedAt: '2026-09-04T10:00:01Z',
    userId: 1,
    repositoryId: 2,
    locationId: null,
    languageId: null
  };
}
