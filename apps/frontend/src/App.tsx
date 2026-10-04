import { useEffect, useState } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';

import { GlobeCanvas } from './globe/GlobeCanvas.js';
import { TimelineControls } from './globe/TimelineControls.js';
import { FilterSearchPanel } from './globe/FilterSearchPanel.js';
import { CommunityPulse } from './globe/CommunityPulse.js';
import { PerformanceOverlay } from './globe/effects/PerformanceOverlay.js';
import { useTimeline } from './hooks/useTimeline.js';
import {
  fetchLocationCatalog,
  type ActivityFilters,
  type GlobeActivityLocation
} from './api/globeActivity.js';

export function App() {
  const timeline = useTimeline();

  // Full location catalog for search (fetched once; activity-independent).
  const [catalog, setCatalog] = useState<GlobeActivityLocation[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetchLocationCatalog(controller.signal)
      .then(setCatalog)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const [flyToTarget, setFlyToTarget] = useState<{
    latitude: number;
    longitude: number;
    seq: number;
  } | null>(null);

  const [flySeq, setFlySeq] = useState(0);

  const handleFilters = (next: ActivityFilters) => {
    timeline.applyFilters(next);
  };

  return (
    <div className="app-shell">

      <header className="app-header">
        <div className="brand">
          <h1>Git Pulse</h1>
          <p className="tagline">
            Watch the world build software.
          </p>
        </div>

        <div className="header-meta">
          <p className="header-stats">
            {timeline.locations.length} active locations
          </p>

          <span
            className={
              timeline.mode === 'live'
                ? 'live-indicator'
                : 'live-indicator replay'
            }
          >
            {timeline.mode === 'live' ? 'LIVE' : 'REPLAY'}
          </span>
        </div>
      </header>

      <main className="workspace">

        <aside className="activity-sidebar">
          <div className="sidebar-heading">
            <span>ACTIVITY</span>
            <span className="sidebar-count">
              {timeline.locations.length}
            </span>
          </div>

          <FilterSearchPanel
            filters={timeline.filters}
            onFilters={handleFilters}
            catalog={catalog}
            currentLocations={timeline.locations}
            onFlyTo={(target) => {
              setFlyToTarget({
                ...target,
                seq: flySeq
              });

              setFlySeq((n) => n + 1);
            }}
          />

          <CommunityPulse />
        </aside>

        <section className="globe-stage">
          <GlobeCanvas
            locations={timeline.locations}
            flyToTarget={flyToTarget}
            visualizationTime={timeline.visualizationTime}
          />
        </section>

      </main>

      <TimelineControls
        mode={timeline.mode}
        slots={timeline.slots}
        index={timeline.index}
        playing={timeline.playing}
        loading={timeline.loading}
        failed={timeline.failed}
        onScrub={timeline.enterReplay}
        onTogglePlay={timeline.togglePlay}
        onReturnToLive={timeline.returnToLive}
      />

      <footer className="app-footer">
        <p>
          Geographic activity intensity. Not individual developers or commits.
        </p>
      </footer>

      <PerformanceOverlay />

      <SpeedInsights />
      <Analytics />

    </div>
  );
}