import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TIMELINE_BUCKETS, fetchTimeline, type TimelineSlot } from '../api/timeline.js';
import type { ActivityFilters, GlobeActivityLocation } from '../api/globeActivity.js';
import { useGlobeActivity } from './useGlobeActivity.js';
import { useLiveSocket } from './useLiveSocket.js';

/**
 * Week 10 (ROADMAP.md — 24-Hour Timeline): playback state machine over
 * stored 15-minute buckets. In LIVE mode the globe renders the live/poll
 * view (Weeks 8–9 behavior); in replay mode it renders the selected
 * historical slot. Replay uses stored data only — no new GitHub queries.
 * Week 11: language/activityType filters flow into both views.
 */
export type TimelineMode = 'live' | 'replay';

const PLAY_INTERVAL_MS = 400; // one slot per tick

export function useTimeline() {
  const { last: liveMessage } = useLiveSocket();
  const [filters, setFilters] = useState<ActivityFilters>({});
  const liveLocations = useGlobeActivity(liveMessage?.updates, filters);

  const [slots, setSlots] = useState<TimelineSlot[]>([]);
  const [mode, setMode] = useState<TimelineMode>('live');
  const [index, setIndex] = useState(TIMELINE_BUCKETS - 1);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const next = await fetchTimeline(controller.signal, filters);
      if (controller.signal.aborted) return;
      setSlots(next);
      setFailed(false);
    } catch {
      // Keep last-known slots on transient failure; the globe keeps
      // rendering whatever mode it is in.
      setFailed(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => {
      clearInterval(timer);
      controllerRef.current?.abort();
    };
  }, [load]);

  // Playback: advance one 15-minute slot per tick while playing.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setIndex((i) => {
        if (i >= TIMELINE_BUCKETS - 1) {
          return 0; // wrap to the start of the 24-hour window
        }
        return i + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playing]);

  const enterReplay = useCallback((slotIndex: number) => {
    setIndex(slotIndex);
    setMode('replay');
    setPlaying(false);
  }, []);

  const returnToLive = useCallback(() => {
    setMode('live');
    setPlaying(false);
    setIndex(TIMELINE_BUCKETS - 1);
  }, []);

  const togglePlay = useCallback(() => {
    setMode('replay');
    setPlaying((p) => !p);
  }, []);

  const currentSlot = mode === 'replay' ? slots[index] : undefined;
  const locations: GlobeActivityLocation[] =
    mode === 'replay' && currentSlot ? currentSlot.locations : liveLocations;

  const applyFilters = useCallback((next: ActivityFilters) => {
    setFilters(next);
  }, []);

  return useMemo(
    () => ({
      mode,
      locations,
      slots,
      index,
      playing,
      loading,
      failed,
      filters,
      applyFilters,
      currentSlot,
      enterReplay,
      returnToLive,
      togglePlay
    }),
    [mode, locations, slots, index, playing, loading, failed, filters, applyFilters, currentSlot, enterReplay, returnToLive, togglePlay]
  );
}
