import { useMemo, useState } from 'react';

import type { ActivityFilters, GlobeActivityLocation } from '../api/globeActivity.js';

interface FilterSearchPanelProps {
  filters: ActivityFilters;
  onFilters: (next: ActivityFilters) => void;
  catalog: GlobeActivityLocation[];
  currentLocations: GlobeActivityLocation[];
  onFlyTo: (target: { latitude: number; longitude: number }) => void;
}

const LANGUAGES = [
  'Python',
  'JavaScript',
  'TypeScript',
  'Java',
  'C',
  'C++',
  'Go',
  'Rust',
  'Ruby',
  'PHP',
  'Kotlin',
  'Swift'
];

const ACTIVITY_TYPES = [
  { value: 'PUSH', label: 'Push' },
  { value: 'PULL_REQUEST', label: 'Pull Request' },
  { value: 'ISSUE', label: 'Issue' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'RELEASE', label: 'Release' }
];

/**
 * Week 11 (UI_SPEC §9 + §7): language/activity filter selects and a
 * location search over the full authoritative catalog — zero-activity
 * locations stay searchable, and selection always flies the camera there.
 * Catalog-backed, plottable entries only; search never creates activity.
 */
export function FilterSearchPanel({
  filters,
  onFilters,
  catalog,
  currentLocations,
  onFlyTo
}: FilterSearchPanelProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  // Language options per UI_SPEC §9 (catalog-level language filter).
  const languageOptions = useMemo(() => LANGUAGES.map((l) => l.toLowerCase()), []);

  // Full-catalog search (UI_SPEC §9): includes zero-activity locations.
  // Slots/currentLocations props were replaced by the catalog for search;
  // they remain available to callers for active-location indication.
  const activeIds = useMemo(
    () => new Set(currentLocations.map((l) => l.locationId)),
    [currentLocations]
  );

  // Dropdown list: all catalog locations (active first) when opened without
  // a query; filtered matches while typing. Full list capped for scroll.
  const activeFirst = (a: GlobeActivityLocation, b: GlobeActivityLocation) => {
    const activeDiff =
      Number(activeIds.has(b.locationId)) - Number(activeIds.has(a.locationId));
    if (activeDiff !== 0) return activeDiff;
    return a.city.localeCompare(b.city);
  };

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length === 0) return [];
    return catalog
      .filter(
        (l) =>
          l.city.toLowerCase().includes(q) ||
          l.country.toLowerCase().includes(q) ||
          l.locationId.includes(q)
      )
      .sort(activeFirst)
      .slice(0, 40);
  }, [search, catalog, activeIds]);

  const listItems = search.trim().length === 0
    ? [...catalog].sort(activeFirst).slice(0, 40)
    : matches;

  return (
    <div className="filter-panel">
      <label className="filter-field">
        <span>Language</span>
        <select
          value={filters.language ?? 'all'}
          onChange={(e) => onFilters({ ...filters, language: e.target.value })}
        >
          <option value="all">All</option>
          {languageOptions.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </label>

      <label className="filter-field">
        <span>Activity</span>
        <select
          value={filters.activityType ?? 'all'}
          onChange={(e) => onFilters({ ...filters, activityType: e.target.value })}
        >
          <option value="all">All</option>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <div className="filter-field search-field">
        <span>Search</span>
        <div className="search-row">
          <input
            type="search"
            placeholder="Search locations…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            aria-label="Search locations"
          />
          <button
            type="button"
            className="search-toggle"
            aria-label="Show all locations"
            aria-expanded={open}
            onMouseDown={(e) => {
              e.preventDefault();
              setSearch('');
              setOpen((v) => !v);
            }}
          >
            ▼
          </button>
        </div>
        {open && listItems.length > 0 && (
          <ul className="search-results" role="listbox">
            {listItems.map((m) => (
              <li key={m.locationId}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onFlyTo({ latitude: m.latitude, longitude: m.longitude });
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  {m.city}, {m.country}
                  <span className={"search-badge" + (activeIds.has(m.locationId) ? " active" : "")}>
                    {activeIds.has(m.locationId) ? '● Active' : '○ Inactive'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
