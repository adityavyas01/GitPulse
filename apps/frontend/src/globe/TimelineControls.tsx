import { TIMELINE_BUCKETS, formatSlotTime, type TimelineSlot } from '../api/timeline.js';
import type { TimelineMode } from '../hooks/useTimeline.js';

interface TimelineControlsProps {
  mode: TimelineMode;
  slots: TimelineSlot[];
  index: number;
  playing: boolean;
  loading: boolean;
  failed: boolean;
  onScrub: (index: number) => void;
  onTogglePlay: () => void;
  onReturnToLive: () => void;
}

/**
 * Week 10 timeline strip (UI_SPEC §8): play, pause, scrub, current slot
 * time, and return to LIVE, over the stored 24-hour window (96 x 15-min).
 * Replay visualizes past aggregate intensity only — never individuals.
 */
export function TimelineControls({
  mode,
  slots,
  index,
  playing,
  loading,
  failed,
  onScrub,
  onTogglePlay,
  onReturnToLive
}: TimelineControlsProps) {
  const last = slots.length - 1;
  const current = slots[index];
  return (
    <div className="timeline" role="group" aria-label="24 hour activity timeline">
      <button
        type="button"
        className="timeline-btn"
        onClick={onTogglePlay}
        aria-label={playing ? 'Pause replay' : 'Play replay'}
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <input
        type="range"
        min={0}
        max={last < 0 ? TIMELINE_BUCKETS - 1 : last}
        value={index}
        onChange={(e) => onScrub(Number(e.target.value))}
        aria-label="Timeline position"
        disabled={slots.length === 0}
      />
      <span className="timeline-time">
        {mode === 'replay' && current ? formatSlotTime(current.time) : formatSlotTime(new Date().toISOString())}
      </span>
      <button
        type="button"
        className={`timeline-btn live-btn${mode === 'live' ? ' active' : ''}`}
        onClick={onReturnToLive}
        disabled={mode === 'live'}
      >
        LIVE
      </button>
      {failed && <span className="timeline-status">updates delayed</span>}
      {loading && !failed && <span className="timeline-status">loading…</span>}
    </div>
  );
}
