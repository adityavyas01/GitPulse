import { useEffect, useState } from 'react';

import { subscribeFps } from './performance.js';

/**
 * Week 12 performance instrumentation (ROADMAP.md): a lightweight FPS
 * readout driven by the external store in performance.ts — one DOM node,
 * updated at most once per second, outside the canvas render path.
 */
export function PerformanceOverlay() {
  const [fps, setFps] = useState(0);

  useEffect(() => subscribeFps(setFps), []);

  return <div className="perf-overlay">{fps > 0 ? `${fps} FPS` : ''}</div>;
}
