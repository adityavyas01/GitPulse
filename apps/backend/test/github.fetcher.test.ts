import { describe, expect, it, vi, afterEach } from 'vitest';

import { GithubEventFetcher, parsePollInterval } from '../src/github/fetcher.js';
import { loadGithubConfig } from '../src/github/config.js';

const log = fakeLogger();

function fetcher(): GithubEventFetcher {
  return new GithubEventFetcher(loadGithubConfig({}), log);
}

function jsonResponse(status: number, headers: Record<string, string> = {}, body: unknown = []): Response {
  if (status === 304) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(JSON.stringify(body), { status, headers });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GithubEventFetcher.poll', () => {
  it('sends conditional If-None-Match after a 200 with ETag', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { ETag: '"abc123"' }, [event('1')])
    );
    vi.stubGlobal('fetch', fetchMock);

    const f = fetcher();
    await f.poll();
    await f.poll();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const init = fetchMock.mock.calls[1][1] as { headers: Record<string, string> };
    expect(init.headers['If-None-Match']).toBe('"abc123"');
  });

  it('handles 304 Not Modified without clearing etag', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { ETag: '"abc123"' }, [event('1')]))
      .mockResolvedValueOnce(jsonResponse(304)));

    const f = fetcher();
    const first = await f.poll();
    const second = await f.poll();

    expect(first.status).toBe('ok');
    expect(second.status).toBe('not_modified');
    expect(second.etag).toBe('"abc123"');
    expect(second.events).toHaveLength(0);
  });

  it('captures X-Poll-Interval in milliseconds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse(200, { ETag: '"e"', 'X-Poll-Interval': '60' }, [])
    ));
    const result = await fetcher().poll();
    expect(result.pollIntervalMs).toBe(60000);
  });

  it('captures rate-limit headers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse(200, {
        ETag: '"e"',
        'X-RateLimit-Remaining': '42',
        'X-RateLimit-Reset': '1756890000'
      }, [])
    ));
    const f = fetcher();
    await f.poll();
    expect(f.rateLimitRemaining).toBe(42);
    expect(f.rateLimitResetAt).toBe(new Date(1756890000 * 1000).toISOString());
  });

  it('reports rate_limited on 403 with exhausted rate limit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse(403, { 'X-RateLimit-Remaining': '0' })
    ));
    const result = await fetcher().poll();
    expect(result.status).toBe('rate_limited');
  });

  it('reports error on unexpected status without losing etag', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { ETag: '"e"' }, []))
      .mockResolvedValueOnce(jsonResponse(500)));
    const f = fetcher();
    await f.poll();
    const result = await f.poll();
    expect(result.status).toBe('error');
    expect(result.etag).toBe('"e"');
  });

  it('reports error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const result = await fetcher().poll();
    expect(result.status).toBe('error');
  });

  it('reports error on non-array body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse(200, { ETag: '"e"' }, { unexpected: true })
    ));
    const result = await fetcher().poll();
    expect(result.status).toBe('error');
  });

  it('never sends Authorization when no token configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ETag: '"e"' }, []));
    vi.stubGlobal('fetch', fetchMock);
    await fetcher().poll();
    const init = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBeUndefined();
  });
});

describe('parsePollInterval', () => {
  it('parses seconds into ms', () => {
    expect(parsePollInterval('60')).toBe(60000);
  });

  it('returns null for missing or invalid values', () => {
    expect(parsePollInterval(null)).toBeNull();
    expect(parsePollInterval('bogus')).toBeNull();
    expect(parsePollInterval('-5')).toBeNull();
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

function fakeLogger() {
  const noop = () => undefined;
  return { info: noop, warn: noop, error: noop, debug: noop, child: noop } as never;
}
