/**
 * Week 8 (ROADMAP.md — Real Data → Globe): frontend reads only the
 * project's own REST API — never raw GitHub payloads. Location ids without
 * a catalog record have no coordinates and are never plotted (no
 * fabricated geography, ADR-005).
 */
export interface GlobeActivityLocation {
  locationId: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  count: number;
}

interface ActivityResponse {
  range: { from: string; to: string };
  buckets: Array<{
    time: string;
    locations: Array<{ locationId: string; count: number; languages: Record<string, number> }>;
  }>;
}

interface LocationRecord {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`API ${url} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Week 11 filters (API_CONTRACT.md /api/activity parameters). */
export interface ActivityFilters {
  language?: string;
  activityType?: string;
}

export function filtersToQuery(filters?: ActivityFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.language && filters.language !== 'all') params.set('language', filters.language);
  if (filters.activityType && filters.activityType !== 'all') params.set('activityType', filters.activityType);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Fetch the full location catalog (all plot-ready known locations),
 * independent of current activity. Powers location search over zero-activity
 * cities; count is always 0 — no activity is implied or fabricated.
 */
export async function fetchLocationCatalog(
  signal: AbortSignal
): Promise<GlobeActivityLocation[]> {
  const locations = await fetchJson<{ locations: LocationRecord[] }>(
    '/api/locations',
    signal
  );
  return locations.locations.map((record) => ({
    locationId: record.id,
    city: record.city,
    country: record.country,
    latitude: record.latitude,
    longitude: record.longitude,
    count: 0
  }));
}

/**
 * Fetch recent activity buckets and the location catalog, join them into
 * plot-ready locations sorted by activity count. Unknown/unresolved
 * location ids are dropped (not plottable), never guessed coordinates.
 */
export async function fetchGlobeActivity(
  signal: AbortSignal,
  filters?: ActivityFilters
): Promise<GlobeActivityLocation[]> {
  const [activity, locations] = await Promise.all([
    fetchJson<ActivityResponse>(`/api/activity${filtersToQuery(filters)}`, signal),
    fetchJson<{ locations: LocationRecord[] }>('/api/locations', signal)
  ]);

  const byId = new Map(locations.locations.map((l) => [l.id, l]));
  const totals = new Map<string, number>();
  for (const bucket of activity.buckets) {
    for (const loc of bucket.locations) {
      totals.set(loc.locationId, (totals.get(loc.locationId) ?? 0) + loc.count);
    }
  }

  const result: GlobeActivityLocation[] = [];
  for (const [locationId, count] of totals) {
    const record = byId.get(locationId);
    if (!record) {
      continue;
    }
    result.push({
      locationId,
      city: record.city,
      country: record.country,
      latitude: record.latitude,
      longitude: record.longitude,
      count
    });
  }
  result.sort((a, b) => b.count - a.count);
  return result;
}
