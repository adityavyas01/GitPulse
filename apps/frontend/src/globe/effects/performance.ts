/**
 * Week 12 performance instrumentation (ROADMAP.md): frame-rate tracker as
 * a tiny external store, written from inside the R3F frame loop and read
 * by a DOM overlay outside the canvas. No React state in the render path.
 */

let fps = 0;
let frames = 0;
let windowStart: number | null = null;
const listeners = new Set<(fps: number) => void>();

export function recordFrame(nowMs: number): void {
  if (windowStart === null) {
    windowStart = nowMs;
    return;
  }
  frames++;
  const elapsed = nowMs - windowStart;
  if (elapsed >= 1000) {
    fps = Math.round((frames * 1000) / elapsed);
    frames = 0;
    windowStart = nowMs;
    for (const listener of listeners) listener(fps);
  }
}

export function subscribeFps(listener: (fps: number) => void): () => void {
  listeners.add(listener);
  listener(fps);
  return () => listeners.delete(listener);
}

export function currentFps(): number {
  return fps;
}

/** Module-singleton state must be reset between tests. */
export function resetFpsForTests(): void {
  fps = 0;
  frames = 0;
  windowStart = null;
  listeners.clear();
}
