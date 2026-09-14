import { beforeEach, describe, expect, it, vi } from 'vitest';

import { currentFps, recordFrame, resetFpsForTests, subscribeFps } from './performance.js';

describe('FPS instrumentation store (Week 12)', () => {
  beforeEach(() => resetFpsForTests());

  it('emits one rounded FPS value per 1s window and resets the count', () => {
    const listener = vi.fn();
    const stop = subscribeFps(listener);
    expect(listener).toHaveBeenCalledWith(0); // immediate current-value callback

    listener.mockClear();
    recordFrame(0); // window opens here
    recordFrame(100);
    recordFrame(500);
    recordFrame(999);
    expect(listener).not.toHaveBeenCalled();

    recordFrame(1000); // 4 frames (incl. window-open) in 1000ms
    expect(listener).toHaveBeenCalledWith(4);
    expect(currentFps()).toBe(4);

    // Window restarted at 1000; nothing due until >=2000.
    recordFrame(1500);
    expect(listener).toHaveBeenCalledTimes(1);

    stop();
  });

  it('stops emitting after unsubscribe', () => {
    const listener = vi.fn();
    const stop = subscribeFps(listener);
    listener.mockClear(); // discard the immediate current-value callback

    recordFrame(0);
    recordFrame(1000);
    expect(listener).toHaveBeenCalledTimes(1);

    stop();
    recordFrame(3000);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
