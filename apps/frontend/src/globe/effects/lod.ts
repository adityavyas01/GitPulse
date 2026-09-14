import type { GlobeActivityLocation } from '../../api/globeActivity.js';

/**
 * Week 12 (ROADMAP.md — Performance + LOD): global/regional/city LOD tiers
 * and deterministic per-location animation phase. Pure functions — tested
 * in lod.test.ts without a WebGL context.
 */

export const MAX_PULSES = 500;

/**
 * LOD tiers by camera distance (in globe-radius units, matching
 * OrbitControls min/maxDistance of 1.5–8):
 * - far  (global view): only the busiest cities — the world still reads.
 * - mid  (regional view): top quarter.
 * - near (city view): full capped set.
 */
export const LOD_TIERS = {
  far: { maxDistance: 4.5, maxPulses: 80 },
  mid: { maxDistance: 2.4, maxPulses: 240 },
  near: { maxDistance: Infinity, maxPulses: MAX_PULSES }
} as const;

export type LodTier = keyof typeof LOD_TIERS;

/** Pick the LOD tier for a camera distance. */
export function tierForDistance(distance: number): LodTier {
  if (distance > LOD_TIERS.far.maxDistance) return 'far';
  if (distance > LOD_TIERS.mid.maxDistance) return 'mid';
  return 'near';
}

/**
 * Intensity-sorted, capped selection: most active locations always win the
 * render budget (fixes the Week 2 review note that slice(0, N) took the
 * first N in data order).
 */
export function selectLodPulses(
  locations: GlobeActivityLocation[],
  tier: LodTier
): GlobeActivityLocation[] {
  const cap = LOD_TIERS[tier].maxPulses;
  const sorted = [...locations].sort((a, b) => b.count - a.count);
  return sorted.slice(0, Math.min(cap, MAX_PULSES));
}

/**
 * Deterministic per-location animation phase from the location id (fixes
 * the Week 2 review issue B where phase derived from position.x made
 * same-x cities pulse in sync).
 */
export function phaseFor(locationId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < locationId.length; i++) {
    hash ^= locationId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

/**
 * Horizon visibility: an instance on the far side of the globe is hidden
 * (controls overdraw without per-mesh raycasts). Threshold slightly above
 * 0 so limb-grazing pulses stay visible.
 */
export function isFrontFacing(
  locationNormal: { x: number; y: number; z: number },
  cameraDirection: { x: number; y: number; z: number }
): boolean {
  return (
    locationNormal.x * cameraDirection.x +
      locationNormal.y * cameraDirection.y +
      locationNormal.z * cameraDirection.z >
    0.08
  );
}
