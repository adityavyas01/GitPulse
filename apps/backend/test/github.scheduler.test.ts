import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { GithubPollScheduler } from '../src/github/scheduler.js';
import { loadGithubConfig } from '../src/github/config.js';

const log = (() => {
  const noop = () => undefined;
  return { info: noop, warn: noop, error: noop, debug: noop, child: noop } as never;
})();

// Fast timings so tests run quickly; behavior (floor/backoff) is unchanged.
const config = loadGithubConfig({
  GITHUB_MIN_POLL_INTERVAL_MS: '20',
  GITHUB_MAX_RETRIES: '2',
  GITHUB_RETRY_BASE_DELAY_MS: '10'
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function flush(times = 12): Promise<void> {
  for (let i = 0; i < times; i++) {
    await vi.advanceTimersByTimeAsync(200);
  }
}

describe('GithubPollScheduler', () => {
  it('starts, polls, and stops cleanly', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), {
      status: 200, headers: { ETag: '"e"', 'X-Poll-Interval': '60' }
    }));
    vi.stubGlobal('fetch', fetchMock);

    const scheduler = new GithubPollScheduler(config, log);
    scheduler.start();
    await flush(4);
    await scheduler.stop();
    // Allow any in-flight tick to finish before assertions.
    await vi.runAllTimersAsync();

    expect(scheduler.running).toBe(false);
    expect(fetchMock).toHaveBeenCalled();
    expect(scheduler.metrics.pollsSucceeded).toBeGreaterThanOrEqual(1);
  });

  it('counts 304 responses without failing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([event('1')]), { status: 200, headers: { ETag: '"e"' } }))
      .mockResolvedValue(new Response(null, { status: 304 }));
    vi.stubGlobal('fetch', fetchMock);

    const scheduler = new GithubPollScheduler(config, log);
    scheduler.start();
    await flush(6);
    await scheduler.stop();
    await vi.runAllTimersAsync();

    expect(fetchMock).toHaveBeenCalled();
    expect(scheduler.metrics.responsesNotModified).toBeGreaterThanOrEqual(1);
  });

  it('retries with backoff on transient errors then recovers', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('nope', { status: 500 }))
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200, headers: { ETag: '"e2"' } }));
    vi.stubGlobal('fetch', fetchMock);

    const scheduler = new GithubPollScheduler(config, log);
    scheduler.start();
    await flush(10);
    await scheduler.stop();
    await vi.runAllTimersAsync();

    expect(fetchMock).toHaveBeenCalled();
    expect(scheduler.metrics.pollsStarted).toBeGreaterThanOrEqual(1);
    expect(scheduler.metrics.pollsFailed).toBeGreaterThanOrEqual(1);
    expect(scheduler.metrics.pollsSucceeded).toBeGreaterThanOrEqual(1);
  });
});

function event(id: string) {
  return {
    id,
    type: 'PushEvent',
    actor: { id: 1, login: 'octocat' },
    repo: { id: 2, name: 'octocat/Hello-World' },
    created_at: '2026-09-04T10:00:00Z',
    public: true
  };
}
