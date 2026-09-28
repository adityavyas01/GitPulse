/**
 * Week 10 (ROADMAP.md — 24-Hour Timeline): replay uses stored activity
 * data (activity_buckets via /api/activity), never new GitHub queries.
 * Retention is 24 hours, so replay range is bounded the same way.
 */
import { apiUrl } from './apiBase.js';
import type { ActivityFilters, GlobeActivityLocation } from './globeActivity.js';

export const TIMELINE_BUCKETS = 96; // 24h / 15min (UI_SPEC §8)

interface ActivityResponse {
  range: { from: string; to: string };
  buckets: Array<{
    time: string;
    locations: Array<{ locationId: string; count: number }>;
  }>;
}

interface LocationRecord {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

/** One aligned 15-minute slot; empty locations means no activity. */
export interface TimelineSlot {
  time: string;
  locations: GlobeActivityLocation[];
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(apiUrl(url), { signal });
  if (!res.ok) {
    throw new Error(`API ${url} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * Aligns the API's returned buckets onto TIMELINE_BUCKETS 15-minute slots
 * ending at `to`. Buckets are keyed on event time (UTC) and indexed from
 * the range end backwards; missing buckets become empty slots rather than
 * fabricated activity.
 */
export function alignTimeline(
  activity: ActivityResponse,
  catalog: LocationRecord[]
): TimelineSlot[] {
  const slots: TimelineSlot[] = [];
  const endMs = Date.parse(activity.range.to);
  if (!Number.isFinite(endMs)) {
    return slots;
  }

  const byId = new Map(catalog.map((l) => [l.id, l]));
  // Week 6 buckets are floor-aligned to the absolute 15-minute UTC grid,
  // so slots use the same grid: the newest slot is the one containing
  // range.to, and the 96 slots extend backwards from it.
  const SLOT_MS = 15 * 60_000;
  const newestSlot = Math.floor(endMs / SLOT_MS);
  const firstSlot = newestSlot - (TIMELINE_BUCKETS - 1);
  const bucketsBySlot = new Map<number, Map<string, number>>();
  for (const bucket of activity.buckets) {
    const t = Date.parse(bucket.time);
    if (!Number.isFinite(t) || t > endMs) continue;
    const slot = Math.floor(t / SLOT_MS) - firstSlot;
    if (slot < 0 || slot >= TIMELINE_BUCKETS) continue;
    const counts = bucketsBySlot.get(slot) ?? new Map<string, number>();
    for (const loc of bucket.locations) {
      counts.set(loc.locationId, (counts.get(loc.locationId) ?? 0) + loc.count);
    }
    bucketsBySlot.set(slot, counts);
  }

  for (let i = 0; i < TIMELINE_BUCKETS; i++) {
    const time = new Date((firstSlot + i) * SLOT_MS).toISOString();
    const counts = bucketsBySlot.get(i);
    const locations: GlobeActivityLocation[] = [];
    if (counts) {
      for (const [locationId, count] of counts) {
        const record = byId.get(locationId);
        if (!record) continue; // no catalog record → not plottable, never guessed
        locations.push({
          locationId,
          city: record.city,
          country: record.country,
          latitude: record.latitude,
          longitude: record.longitude,
          count
        });
      }
      locations.sort((a, b) => b.count - a.count);
    }
    slots.push({ time, locations });
  }
  return slots;
}

/**
 * Fetches the last 24 hours of stored buckets joined with the catalog.
 * Filters (Week 11) flow through the documented /api/activity parameters,
 * so replay honors the same semantics as the live view.
 */
export async function fetchTimeline(
  signal: AbortSignal,
  filters?: ActivityFilters
): Promise<TimelineSlot[]> {
  const params = new URLSearchParams();
  if (filters?.language && filters.language !== 'all') params.set('language', filters.language);
  if (filters?.activityType && filters.activityType !== 'all') params.set('activityType', filters.activityType);
  const qs = params.toString();
  const [activity, locations] = await Promise.all([
    fetchJson<ActivityResponse>(`/api/activity${qs ? `?${qs}` : ''}`, signal),
    fetchJson<{ locations: LocationRecord[] }>('/api/locations', signal)
  ]);
  return alignTimeline(activity, locations.locations);
}

/** UTC "HH:MM" label for the scrub position. */
export function formatSlotTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}
