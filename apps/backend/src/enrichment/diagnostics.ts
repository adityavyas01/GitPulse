import { appendFileSync } from 'node:fs';

import { normalizeLocationString } from './locationResolver.js';

/**
 * TEMPORARY location-enrichment diagnostics (LOCATION_DIAGNOSTICS=true).
 * Observation only: no production semantics, resolver behavior, or
 * persistence is altered. Default is off and the code paths are no-ops.
 */
const ENABLED = process.env.LOCATION_DIAGNOSTICS === 'true';
const LOG_FILE = 'location-diagnostics.log';
const MAX_TABLE_ROWS = 50;

export const locDiagEnabled = (): boolean => ENABLED;

export interface LocDiagResolution {
  status: string;
  locationId: string | null;
}

export interface LocDiagState {
  eventsInBatch: number;
  actors: Set<string>;
  eventsWithActor: number;
  profileOk: number;
  profile404: number;
  profileRateLimited: number;
  profileOther: number;
  profileNetworkFail: number;
  profileNull: number;
  profilesFetched: number;
  rows: Array<{ username: string | null; raw: string | null; normalized: string | null; status: string; locationId: string | null }>;
  nonNullLocations: number;
  nullLocations: number;
  eventsTotal: number;
  eventsWithLocation: number;
  eventsWithLanguage: number;
  eventsWithBoth: number;
}

let state: LocDiagState = blank();

function blank(): LocDiagState {
  return {
    eventsInBatch: 0,
    actors: new Set(),
    eventsWithActor: 0,
    profileOk: 0,
    profile404: 0,
    profileRateLimited: 0,
    profileOther: 0,
    profileNetworkFail: 0,
    profileNull: 0,
    profilesFetched: 0,
    rows: [],
    nonNullLocations: 0,
    nullLocations: 0,
    eventsTotal: 0,
    eventsWithLocation: 0,
    eventsWithLanguage: 0,
    eventsWithBoth: 0
  };
}

export function diagReset(eventsInBatch: number): void {
  state = blank();
  state.eventsInBatch = eventsInBatch;
}

/** Called from EnrichmentClient.requestJson for /user/ requests only. */
export function diagProfileFetch(status: number | 'network_fail'): void {
  if (!ENABLED) return;
  if (status === 200) state.profileOk += 1;
  else if (status === 404) state.profile404 += 1;
  else if (status === 403) state.profileRateLimited += 1;
  else if (status === 'network_fail') state.profileNetworkFail += 1;
  else state.profileOther += 1;
}

export function diagUserResult(username: string | null, rawLocation: string | null, resolution: LocDiagResolution | null): void {
  if (!ENABLED) return;
  if (rawLocation !== null && rawLocation.length > 0) {
    state.nonNullLocations += 1;
    state.rows.push({
      username,
      raw: rawLocation,
      normalized: normalizeLocationString(rawLocation),
      status: resolution?.status ?? 'NOT_RESOLVED',
      locationId: resolution?.locationId ?? null
    });
  } else {
    state.nullLocations += 1;
  }
}

export function diagProfileNull(): void {
  if (!ENABLED) return;
  state.profileNull += 1;
}

export function diagProfileFetched(username: string | null, eventId: string): void {
  if (!ENABLED) return;
  state.profilesFetched += 1;
  state.actors.add(username ?? `id:${eventId}`);
  state.eventsWithActor += 1;
}

export function diagEvent(locationId: string | null, languageId: string | null): void {
  if (!ENABLED) return;
  state.eventsTotal += 1;
  if (locationId !== null) state.eventsWithLocation += 1;
  if (languageId !== null) state.eventsWithLanguage += 1;
  if (locationId !== null && languageId !== null) state.eventsWithBoth += 1;
}

export function diagReport(
  extra: { persistedRows?: number; persistedWithLocation?: number; persistedWithLanguage?: number; buckets?: number; bucketsKnown?: number; bucketsUnknown?: number },
  log: { info: (obj: unknown, msg?: string) => void }
): LocDiagState {
  if (!ENABLED) return state;
  const s = state;
  const lines: string[] = [];
  lines.push('=== LOCATION DIAGNOSTIC ===');
  lines.push(
    `A. INPUT: events=${s.eventsInBatch} uniqueActors=${s.actors.size} eventsWithActor=${s.eventsWithActor}`
  );
  lines.push(
    `B. PROFILE LOOKUPS: ok=${s.profileOk} notFound404=${s.profile404} rateLimited403=${s.profileRateLimited} otherStatus=${s.profileOther} networkFail=${s.profileNetworkFail} | nullProfileResults=${s.profileNull} profilesReturned=${s.profilesFetched}`
  );
  lines.push(`C. RAW LOCATIONS: nonNull=${s.nonNullLocations} nullOrEmpty=${s.nullLocations}`);
  lines.push(
    `F. ENRICHED EVENTS: total=${s.eventsTotal} withLocation=${s.eventsWithLocation} nullLocation=${s.eventsTotal - s.eventsWithLocation} withLanguage=${s.eventsWithLanguage} withBoth=${s.eventsWithBoth}`
  );
  lines.push(
    `G/H. PERSISTENCE+AGGREGATION (from stage results): persistedRows=${extra.persistedRows ?? 'n/a'} withLocationId=${extra.persistedWithLocation ?? 'n/a'} withLanguageId=${extra.persistedWithLanguage ?? 'n/a'} buckets=${extra.buckets ?? 'n/a'} knownLocationBuckets=${extra.bucketsKnown ?? 'n/a'} unknownSentinelBuckets=${extra.bucketsUnknown ?? 'n/a'}`
  );
  lines.push('TABLE (username | raw | normalized | status | locationId)');
  const total = s.rows.length;
  const shown = s.rows.slice(0, MAX_TABLE_ROWS);
  for (const r of shown) {
    lines.push(`${r.username ?? '-'} | ${r.raw} | ${r.normalized} | ${r.status} | ${r.locationId ?? '-'}`);
  }
  if (total > shown.length) {
    lines.push(`(table capped at ${MAX_TABLE_ROWS} of ${total} rows — counts above cover all)`);
  }
  const text = lines.join('\n');
  try {
    appendFileSync(LOG_FILE, text + '\n\n');
  } catch {
    // diagnostics only — never affect the pipeline
  }
  log.info({ locationDiagnostic: text }, 'location diagnostic batch');
  return s;
}
