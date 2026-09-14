import { useMemo, useState } from 'react';

import type { ActivityFilters, GlobeActivityLocation } from '../api/globeActivity.js';

interface FilterSearchPanelProps {
  filters: ActivityFilters;
  onFilters: (next: ActivityFilters) => void;
  slots: Array<{ locations: GlobeActivityLocation[] }>;
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
 * location search over the authoritative catalog. Selecting a search
 * result flies the camera to that location (smooth fly-to). Search only
 * ever offers catalog-backed, plottable locations — never fabricated ones.
 */
export function FilterSearchPanel({
  filters,
  onFilters,
  slots,
  currentLocations,
  onFlyTo
}: FilterSearchPanelProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  // Language options per UI_SPEC §9 (catalog-level language filter).
  const languageOptions = useMemo(() => LANGUAGES.map((l) => l.toLowerCase()), []);

  // Location search over currently visible (plot-ready) locations.
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length === 0) return [];
    const pool = currentLocations.length > 0 ? currentLocations : slots.flatMap((s) => s.locations);
    const seen = new Map<string, GlobeActivityLocation>();
    for (const loc of pool) {
      if (!seen.has(loc.locationId)) seen.set(loc.locationId, loc);
    }
    return [...seen.values()]
      .filter(
        (l) =>
          l.city.toLowerCase().includes(q) ||
          l.country.toLowerCase().includes(q) ||
          l.locationId.includes(q)
      )
      .slice(0, 6);
  }, [search, currentLocations, slots]);

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
        {open && matches.length > 0 && (
          <ul className="search-results" role="listbox">
            {matches.map((m) => (
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
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
