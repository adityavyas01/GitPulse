import { useEffect, useState } from 'react';

/**
 * Community pulse — compact activity summary below location search.
 * Reads ONLY existing frontend data: /api/stats (aggregate) and the activity
 * already fetched by the timeline hook (bucket totals). No new backend
 * endpoints; no raw GitHub data; repository-language semantics preserved
 * (top language is repository language metadata, not event-level language).
 */

interface Stats {
  activities: number;
  activeLocations: number;
  topLanguage: string | null;
  topCity: string | null;
  activityBreakdown: Record<string, number>;
}

interface Props {}

export function CommunityPulse(_: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/stats', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`stats ${res.status}`);
        return res.json() as Promise<Stats>;
      })
      .then((data) => {
        setStats(data);
        setFailed(false);
      })
    .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  if (failed || !stats) {
    return null;
  }

  // Dominant types shown individually; tiny types (<=2% of total) group as Other.
  const mix = dominantMix(stats.activityBreakdown ?? {});

  return (
    <section className="community-pulse">
      <h3 className="community-pulse-heading">COMMUNITY PULSE</h3>

      <div className="community-pulse-figures">
        <div className="pulse-figure">
          <span className="pulse-figure-value">{stats.activities.toLocaleString()}</span>
          <span className="pulse-figure-label">activities</span>
        </div>
        <div className="pulse-figure">
          <span className="pulse-figure-value">{stats.activeLocations}</span>
          <span className="pulse-figure-label">active locations</span>
        </div>
      </div>

      {stats.topLanguage && (
        <div className="community-pulse-language">
          <span className="community-pulse-label">TOP LANGUAGE</span>
          <span className="community-pulse-value">{formatLanguage(stats.topLanguage)}</span>
        </div>
      )}

      <div className="community-pulse-mix">
        <span className="community-pulse-label">ACTIVITY MIX</span>
        <ul className="pulse-mix-list">
          {mix.map((row) => (
            <li key={row.name} className="pulse-mix-row">
              <span className="pulse-mix-name">{row.name}</span>
              <span className="pulse-mix-bar">
                <span
                  className={"pulse-mix-fill" + (row.other ? " other" : "")}
                  style={{ width: `${row.pct}%` }}
                />
              </span>
              <span className="pulse-mix-pct">{row.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Dominant activity types shown individually; types at or below 2% of the
 * total are grouped as "Other". Exported for unit testing against real
 * /api/stats data.
 */
export function dominantMix(
  breakdown: Record<string, number>
): Array<{ name: string; pct: number; other?: boolean }> {
  const entries = Object.entries(breakdown);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) return [];

  const dominant = entries
    .filter(([, n]) => n / total > 0.02)
    .sort((a, b) => b[1] - a[1]);
  const dominantTotal = dominant.reduce((sum, [, n]) => sum + n, 0);
  const other = total - dominantTotal;

  const rows: Array<{ name: string; pct: number; other?: boolean }> = dominant.map(([type, n]) => ({
    name: formatType(type),
    pct: Math.round((n / total) * 100)
  }));

  if (other > 0) {
    rows.push({ name: 'Other', pct: Math.round((other / total) * 100), other: true });
  }
  return rows;
}

function formatLanguage(raw: string): string {
  // Repository language metadata, presented as capitalized metadata — not
  // claimed as the language of any individual event.
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatType(raw: string): string {
  const names: Record<string, string> = {
    PUSH: 'Push',
    CREATE: 'Create',
    DELETE: 'Delete',
    PULL_REQUEST: 'Pull request',
    ISSUE_COMMENT: 'Issue comment',
    REVIEW_COMMENT: 'Review comment',
    WATCH: 'Watch',
    FORK: 'Fork',
    RELEASE: 'Release',
    ISSUE: 'Issue'
  };
  return names[raw] ?? raw;
}
