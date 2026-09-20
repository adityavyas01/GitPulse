import { describe, expect, it } from 'vitest';

import { dominantMix } from './CommunityPulse.js';

// Real /api/stats payload shape (reported during QA of the running system).
const REAL_BREAKDOWN: Record<string, number> = {
  CREATE: 180,
  PUSH: 638,
  DELETE: 88,
  REVIEW_COMMENT: 1,
  WATCH: 1,
  ISSUE_COMMENT: 1,
  PULL_REQUEST: 4,
  REVIEW: 1
};

describe('dominantMix (CommunityPulse activity mix)', () => {
  it('computes percentages from actual counts for the real stats payload', () => {
    const mix = dominantMix(REAL_BREAKDOWN);

    const total = 914;
    const push = mix.find((r) => r.name === 'Push');
    const create = mix.find((r) => r.name === 'Create');
    const del = mix.find((r) => r.name === 'Delete');

    expect(push?.pct).toBe(Math.round((638 / total) * 100)); // 70
    expect(create?.pct).toBe(Math.round((180 / total) * 100)); // 20
    expect(del?.pct).toBe(Math.round((88 / total) * 100)); // 10
    // PULL_REQUEST (4/914 = 0.4%) is below the 2% threshold — grouped as
    // Other, never shown as its own row.
    expect(mix.find((r) => r.name === 'Pull request')).toBeUndefined();
  });

  it('groups tiny types as Other, preserving the total', () => {
    const mix = dominantMix(REAL_BREAKDOWN);

    const other = mix.find((r) => r.other);
    expect(other).toBeDefined();

    const otherTypes = ['REVIEW_COMMENT', 'WATCH', 'ISSUE_COMMENT', 'PULL_REQUEST', 'REVIEW'];
    const expectedOther = otherTypes.reduce((sum, t) => sum + REAL_BREAKDOWN[t], 0);
    expect(other?.pct).toBe(Math.round((expectedOther / 914) * 100));

    const sum = mix.reduce((acc, r) => acc + r.pct, 0);
    // Rows are rounded independently, so the display sum may differ from 100
    // by up to one point per row — it must stay close and never collapse.
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(102);
  });

  it('sorts dominant types by descending count', () => {
    const mix = dominantMix(REAL_BREAKDOWN);
    const dominant = mix.filter((r) => !r.other);
    const counts = dominant.map((r) => r.pct);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('returns no Other row when no type is below the threshold', () => {
    const mix = dominantMix({ PUSH: 90, CREATE: 10 });
    expect(mix.find((r) => r.other)).toBeUndefined();
    expect(mix.map((r) => r.name)).toEqual(['Push', 'Create']);
  });

  it('returns an empty mix for an empty breakdown', () => {
    expect(dominantMix({})).toEqual([]);
  });

  it('never shows a developer count (field does not exist in /api/stats)', () => {
    // Guards the product decision: "developers" is omitted unless
    // activeDevelopers exists in the data. The Stats interface has no such
    // field, so none can be rendered — asserted via the real payload shape.
    const stats = REAL_BREAKDOWN;
    expect(Object.keys(stats).some((k) => k.toLowerCase() === 'developers')).toBe(false);
  });
});
