import { describe, expect, it, vi } from 'vitest';

import { runPipeline, type IngestionPipelineDeps } from '../src/github/pipeline.js';
import { GithubEventFetcher } from '../src/github/fetcher.js';
import { EventDeduplicator } from '../src/github/dedupe.js';
import { createIngestionMetrics } from '../src/github/metrics.js';
import { loadGithubConfig } from '../src/github/config.js';
import type { RawGithubEvent } from '../src/github/types.js';

describe('runPipeline', () => {
  it('validates, deduplicates and normalizes an ok poll', async () => {
    const deps = depsWith([
      event('1'),
      event('1'),
      { id: '2', type: 'WeirdEvent', actor: { id: 9 }, repo: { id: 8 }, created_at: '2026-09-04T10:00:00Z' },
      { id: '', type: 'PushEvent', actor: { id: 9 }, repo: { id: 8 }, created_at: '2026-09-04T10:00:00Z' }
    ]);

    const result = await runPipeline(deps);

    expect(result.status).toBe('ok');
    expect(result.accepted).toHaveLength(2);
    expect(result.accepted[0].eventType).toBe('PUSH');
    expect(result.accepted[1].eventType).toBe('UNKNOWN');
    expect(result.duplicates).toBe(1);
    expect(result.rejected).toBe(1);
    expect(deps.metrics.eventsReceived).toBe(4);
    expect(deps.metrics.eventsDeduplicated).toBe(1);
    expect(deps.metrics.eventsRejected).toBe(1);
    expect(deps.metrics.eventsNormalized).toBe(2);
  });

  it('propagates not_modified status', async () => {
    const deps = depsWith([], { status: 'not_modified', events: [], etag: null, pollIntervalMs: 60000 });
    const result = await runPipeline(deps);
    expect(result.status).toBe('not_modified');
    expect(deps.metrics.responsesNotModified).toBe(1);
  });

  it('propagates rate_limited and error as failed polls', async () => {
    const rateDeps = depsWith([], { status: 'rate_limited', events: [], etag: null, pollIntervalMs: null });
    expect((await runPipeline(rateDeps)).status).toBe('rate_limited');
    expect(rateDeps.metrics.pollsFailed).toBe(1);

    const errDeps = depsWith([], { status: 'error', events: [], etag: null, pollIntervalMs: null });
    expect((await runPipeline(errDeps)).status).toBe('error');
    expect(errDeps.metrics.pollsFailed).toBe(1);
  });

  it('never fabricates location or language', async () => {
    const deps = depsWith([event('77')]);
    const result = await runPipeline(deps);
    expect(result.accepted[0].locationId).toBeNull();
    expect(result.accepted[0].languageId).toBeNull();
  });
});

interface FetcherOverrides {
  status: 'ok' | 'not_modified' | 'rate_limited' | 'error';
  events: RawGithubEvent[];
  etag: string | null;
  pollIntervalMs: number | null;
}

function depsWith(events: RawGithubEvent[], override?: FetcherOverrides): IngestionPipelineDeps {
  const poll: FetcherOverrides = override ?? { status: 'ok', events, etag: null, pollIntervalMs: 60000 };
  const fetcher = {
    poll: vi.fn().mockResolvedValue(poll)
  } as unknown as GithubEventFetcher;

  return {
    fetcher,
    deduplicator: new EventDeduplicator(),
    metrics: createIngestionMetrics(),
    config: loadGithubConfig({}),
    log: fakeLogger()
  };
}

function event(id: string): RawGithubEvent {
  return {
    id,
    type: 'PushEvent',
    actor: { id: 1, login: 'octocat' },
    repo: { id: 2, name: 'octocat/Hello-World' },
    created_at: '2026-09-04T10:00:00Z',
    public: true
  };
}

function fakeLogger() {
  const noop = () => undefined;
  return { info: noop, warn: noop, error: noop, debug: noop, child: noop } as never;
}
