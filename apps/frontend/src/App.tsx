// import { useState } from 'react';

// import { GlobeCanvas } from './globe/GlobeCanvas.js';
// import { TimelineControls } from './globe/TimelineControls.js';
// import { FilterSearchPanel } from './globe/FilterSearchPanel.js';
// import { PerformanceOverlay } from './globe/effects/PerformanceOverlay.js';
// import { useTimeline } from './hooks/useTimeline.js';
// import type { ActivityFilters } from './api/globeActivity.js';

// export function App() {
//   const timeline = useTimeline();
//   const [flyToTarget, setFlyToTarget] = useState<{
//     latitude: number;
//     longitude: number;
//     seq: number;
//   } | null>(null);
//   const [flySeq, setFlySeq] = useState(0);

//   const handleFilters = (next: ActivityFilters) => {
//     timeline.applyFilters(next);
//   };

//   return (
//     <div className="app-shell">
//       <header className="app-header">
//         <h1>Git Pulse</h1>
//         <p className="tagline">Watch the world build software.</p>
//         <p className="header-stats">{timeline.locations.length} active locations</p>
//         <span className={timeline.mode === 'live' ? 'live-indicator' : 'live-indicator replay'}>
//           {timeline.mode === 'live' ? 'LIVE' : 'REPLAY'}
//         </span>
//         <FilterSearchPanel
//           filters={timeline.filters}
//           onFilters={handleFilters}
//           slots={timeline.slots}
//           currentLocations={timeline.locations}
//           onFlyTo={(target) => {
//             setFlyToTarget({ ...target, seq: flySeq });
//             setFlySeq((n) => n + 1);
//           }}
//         />
//       </header>
//       <main className="app-main globe-main">
//         <GlobeCanvas locations={timeline.locations} flyToTarget={flyToTarget} />
//       </main>
//       <TimelineControls
//         mode={timeline.mode}
//         slots={timeline.slots}
//         index={timeline.index}
//         playing={timeline.playing}
//         loading={timeline.loading}
//         failed={timeline.failed}
//         onScrub={timeline.enterReplay}
//         onTogglePlay={timeline.togglePlay}
//         onReturnToLive={timeline.returnToLive}
//       />
//       <footer className="app-footer">
//         <p>Geographic activity intensity. Not individual developers or commits.</p>
//       </footer>
//       <PerformanceOverlay />
//     </div>
//   );
// }


import { useState } from 'react';

import { GlobeCanvas } from './globe/GlobeCanvas.js';
import { TimelineControls } from './globe/TimelineControls.js';
import { FilterSearchPanel } from './globe/FilterSearchPanel.js';
import { PerformanceOverlay } from './globe/effects/PerformanceOverlay.js';
import { useTimeline } from './hooks/useTimeline.js';
import type { ActivityFilters } from './api/globeActivity.js';

export function App() {
  const timeline = useTimeline();

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
            slots={timeline.slots}
            currentLocations={timeline.locations}
            onFlyTo={(target) => {
              setFlyToTarget({
                ...target,
                seq: flySeq
              });

              setFlySeq((n) => n + 1);
            }}
          />
        </aside>

        <section className="globe-stage">
          <GlobeCanvas
            locations={timeline.locations}
            flyToTarget={flyToTarget}
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

    </div>
  );
}