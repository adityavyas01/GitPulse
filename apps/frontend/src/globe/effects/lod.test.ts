import { describe, expect, it } from 'vitest';

import {
  LOD_TIERS,
  MAX_PULSES,
  isFrontFacing,
  phaseFor,
  selectLodPulses,
  tierForDistance
} from './lod.js';

function loc(id: string, count: number, lat = 0, lon = 0) {
  return { locationId: id, city: id, country: 'X', latitude: lat, longitude: lon, count };
}

describe('LOD tier selection (Week 12)', () => {
  it('maps camera distance to tiers with decreasing budgets', () => {
    expect(tierForDistance(8)).toBe('far');
    expect(tierForDistance(4.4)).toBe('mid');
    expect(tierForDistance(2.3)).toBe('near');
    expect(LOD_TIERS.far.maxPulses).toBeLessThan(LOD_TIERS.mid.maxPulses);
    expect(LOD_TIERS.mid.maxPulses).toBeLessThan(LOD_TIERS.near.maxPulses);
  });

  it('selects the most active locations first (intensity-sorted)', () => {
    const locations = [
      loc('a', 5),
      loc('b', 900),
      loc('c', 50)
    ];
    const result = selectLodPulses(locations, 'far');
    expect(result[0].locationId).toBe('b');
    expect(result).toHaveLength(3);
  });

  it('caps selection at the tier budget and the global MAX_PULSES', () => {
    const many = Array.from({ length: MAX_PULSES + 50 }, (_, i) => loc(`l${i}`, i));
    expect(selectLodPulses(many, 'far')).toHaveLength(LOD_TIERS.far.maxPulses);
    expect(selectLodPulses(many, 'near')).toHaveLength(MAX_PULSES);
  });

  it('never returns more than MAX_PULSES regardless of tier', () => {
    const many = Array.from({ length: 2000 }, (_, i) => loc(`l${i}`, 2000 - i));
    for (const tier of ['far', 'mid', 'near'] as const) {
      expect(selectLodPulses(many, tier).length).toBeLessThanOrEqual(MAX_PULSES);
    }
  });
});

describe('deterministic per-location phase (Week 12)', () => {
  it('is stable per id and within [0, 1)', () => {
    expect(phaseFor('blr')).toBe(phaseFor('blr'));
    expect(phaseFor('nyc')).not.toBe(phaseFor('blr'));
    for (const id of ['sfo', 'nyc', 'lon', 'ber', 'blr', 'tok']) {
      const p = phaseFor(id);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});

describe('horizon visibility control (Week 12)', () => {
  it('front-facing locations are visible, back-hemisphere are hidden', () => {
    const camera = { x: 0, y: 0, z: 1 };
    expect(isFrontFacing({ x: 0, y: 0, z: 1 }, camera)).toBe(true);
    expect(isFrontFacing({ x: 1, y: 0, z: 0 }, camera)).toBe(false);
    expect(isFrontFacing({ x: 0, y: 0, z: -1 }, camera)).toBe(false);
  });

  it('keeps limb-grazing locations visible (threshold above zero)', () => {
    expect(isFrontFacing({ x: 0.5, y: 0, z: 0.87 }, { x: 0, y: 0, z: 1 })).toBe(true);
  });
});
