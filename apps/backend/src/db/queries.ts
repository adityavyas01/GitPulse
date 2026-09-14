import type pg from 'pg';

export interface ActivityQuery {
  from: Date;
  to: Date;
  language: string | null;
  activityType: string | null;
  location: string | null;
}

export interface ActivityBucketGroup {
  time: string;
  locations: Array<{
    locationId: string;
    count: number;
    languages: Record<string, number>;
  }>;
}

const UNKNOWN = 'unknown';

/**
 * Reads activity buckets for a time range, shaped per API_CONTRACT:
 * buckets[] → locations[] → { locationId, count, languages{} }.
 * Parameterized throughout; user input never reaches SQL as fragments.
 * Max range 24h enforced by caller (route validation).
 */
export async function queryActivity(pool: pg.Pool, query: ActivityQuery): Promise<ActivityBucketGroup[]> {
  const conditions = ['bucket_start >= $1', 'bucket_start <= $2'];
  const params: unknown[] = [query.from, query.to];

  if (query.language !== null) {
    params.push(query.language);
    conditions.push(`language_id = $${params.length}`);
  }
  if (query.activityType !== null) {
    params.push(query.activityType);
    conditions.push(`event_type = $${params.length}`);
  }
  if (query.location !== null) {
    params.push(query.location);
    conditions.push(`location_id = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT bucket_start, location_id, language_id, event_type, event_count
     FROM activity_buckets
     WHERE ${conditions.join(' AND ')}
     ORDER BY bucket_start ASC`,
    params
  );

  return groupByTime(result.rows);
}

interface RawRow {
  bucket_start: Date | string;
  location_id: string;
  language_id: string;
  event_type: string;
  event_count: string | number;
}

function groupByTime(rows: RawRow[]): ActivityBucketGroup[] {
  const groups = new Map<string, ActivityBucketGroup>();

  for (const row of rows) {
    const time = new Date(row.bucket_start).toISOString();
    let group = groups.get(time);
    if (!group) {
      group = { time, locations: [] };
      groups.set(time, group);
    }

    const locationId = row.location_id === UNKNOWN ? 'unknown' : row.location_id;
    let location = group.locations.find((l) => l.locationId === locationId);
    if (!location) {
      location = { locationId, count: 0, languages: {} };
      group.locations.push(location);
    }

    const count = Number(row.event_count);
    location.count += count;
    const lang = row.language_id === UNKNOWN ? 'unknown' : row.language_id;
    location.languages[lang] = (location.languages[lang] ?? 0) + count;
  }

  return [...groups.values()];
}

export interface StatsResult {
  activities: number;
  activeLocations: number;
  topLanguage: string | null;
  topCity: string | null;
  activityBreakdown: Record<string, number>;
}

/**
 * Stats over the 24h window per API_CONTRACT: activities, activeLocations,
 * topLanguage, topCity, activityBreakdown. Unknown dims count toward totals
 * (retained activity per SRS §8) but 'unknown' never becomes topCity/topLanguage.
 */
export async function queryStats(pool: pg.Pool, now: Date): Promise<StatsResult> {
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const result = await pool.query<RawRow>(
    `SELECT bucket_start, location_id, language_id, event_type, event_count
     FROM activity_buckets
     WHERE bucket_start >= $1 AND bucket_start <= $2`,
    [from, now]
  );

  let activities = 0;
  const locations = new Map<string, number>();
  const languages = new Map<string, number>();
  const breakdown = new Map<string, number>();

  for (const row of result.rows) {
    const count = Number(row.event_count);
    activities += count;
    if (row.location_id !== UNKNOWN) {
      locations.set(row.location_id, (locations.get(row.location_id) ?? 0) + count);
    }
    if (row.language_id !== UNKNOWN) {
      languages.set(row.language_id, (languages.get(row.language_id) ?? 0) + count);
    }
    breakdown.set(row.event_type, (breakdown.get(row.event_type) ?? 0) + count);
  }

  return {
    activities,
    activeLocations: locations.size,
    topLanguage: topEntry(languages),
    topCity: topEntry(locations),
    activityBreakdown: Object.fromEntries(breakdown)
  };
}

function topEntry(map: Map<string, number>): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const [key, count] of map) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}
