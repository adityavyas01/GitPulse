import type { Activity, Location } from './types.js';
import { isCoordinate } from './coordinates.js';
import { ACTIVITY_CAPACITY } from './lod.js';

/**
 * Aggregate-driven ranking: one record per location, summed counts, sorted
 * by intensity. Locations without catalog coordinates are never plottable.
 */
export function rankedActivities(locations: Location[], activities: Activity[]) {
  const known = new Map(
    locations.filter((l) => isCoordinate(l.latitude, l.longitude)).map((l) => [l.id, l]),
  );
  const counts = new Map<string, number>();
  for (const activity of activities) {
    if (!known.has(activity.locationId) || !Number.isFinite(activity.count) || activity.count <= 0) continue;
    counts.set(activity.locationId, (counts.get(activity.locationId) ?? 0) + activity.count);
  }
  return [...counts.entries()]
    .map(([locationId, count]) => ({ location: known.get(locationId)!, count }))
    .sort((a, b) => b.count - a.count || a.location.id.localeCompare(b.location.id))
    .slice(0, ACTIVITY_CAPACITY);
}
