export type LocationResolutionState = 'RESOLVED' | 'AMBIGUOUS' | 'MISSING' | 'INVALID';

/**
 * Canonical Location record (DATA_CONTRACT.md §4).
 * Coordinates belong here — never on individual ActivityEvents (ADR-005).
 */
export interface LocationRecord {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export type LocationResolutionResult =
  | { state: 'RESOLVED'; location: LocationRecord }
  | { state: 'AMBIGUOUS'; candidates: LocationRecord[] }
  | { state: 'MISSING' }
  | { state: 'INVALID' };
