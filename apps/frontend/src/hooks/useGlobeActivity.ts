import { useEffect, useRef, useState } from 'react';

import { fetchGlobeActivity, type ActivityFilters, type GlobeActivityLocation } from '../api/globeActivity.js';

const REFRESH_MS = 60_000;

/**
 * Polls the REST API for aggregated activity (activity updates
 * continuously; GitHub Events is a polling source, not a real-time
 * stream — ADR-009). Empty until data arrives: the globe renders no
 * fabricated activity.
 *
 * Week 9: incremental live updates arrive over WS /api/live and are
 * merged here between REST refreshes, so the globe updates without a
 * browser refresh (ROADMAP.md Week 9 output).
 */
export function useGlobeActivity(
  liveUpdates?: Array<{ locationId: string; count: number }>,
  filters?: ActivityFilters
): GlobeActivityLocation[] {
  const [locations, setLocations] = useState<GlobeActivityLocation[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const locationsRef = useRef<GlobeActivityLocation[]>([]);
  const liveRef = useRef(liveUpdates);

  // Keep latest live updates without re-triggering the polling effect.
  useEffect(() => {
    liveRef.current = liveUpdates;
    if (!liveUpdates || liveUpdates.length === 0) return;
    setLocations((current) => {
      const byId = new Map(current.map((l) => [l.locationId, l]));
      for (const update of liveUpdates) {
        const existing = byId.get(update.locationId);
        if (existing) {
          byId.set(update.locationId, { ...existing, count: existing.count + update.count });
        } else {
          // Location not yet in the REST view: keep the count; it gains
          // coordinates on the next REST refresh (never fabricate them).
          byId.set(update.locationId, {
            locationId: update.locationId,
            city: '',
            country: '',
            latitude: Number.NaN,
            longitude: Number.NaN,
            count: update.count
          });
        }
      }
      const next = [...byId.values()];
      locationsRef.current = next;
      return next;
    });
  }, [liveUpdates]);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        const next = await fetchGlobeActivity(controller.signal, filters);
        if (!cancelled) {
          locationsRef.current = next;
          setLocations(next);
        }
      } catch {
        // Keep the last known data on transient failures; empty at startup.
      }
    };

    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      controllerRef.current?.abort();
    };
  }, [filters]);

  return locations;
}
