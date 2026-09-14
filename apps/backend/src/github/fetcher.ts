import type { FastifyBaseLogger } from 'fastify';

import type { GithubConfig } from './config.js';
import type { RawGithubEvent } from './types.js';

export interface PollResult {
  status: 'ok' | 'not_modified' | 'rate_limited' | 'error';
  events: RawGithubEvent[];
  etag: string | null;
  /** Milliseconds GitHub asks us to wait before the next poll. */
  pollIntervalMs: number | null;
}

const USER_AGENT = 'Git-Pulse/0.1';

export class GithubEventFetcher {
  private etag: string | null = null;
  private readonly config: GithubConfig;
  private readonly log: FastifyBaseLogger;

  constructor(config: GithubConfig, log: FastifyBaseLogger) {
    this.config = config;
    this.log = log;
  }

  get currentEtag(): string | null {
    return this.etag;
  }

  async poll(): Promise<PollResult> {
    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
      Accept: 'application/vnd.github+json'
    };
    if (this.config.token) {
      headers.Authorization = `Bearer ${this.config.token}`;
    }
    if (this.etag) {
      headers['If-None-Match'] = this.etag;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.config.apiUrl}/events`, { headers, signal: controller.signal });
    } catch (err) {
      this.log.warn({ err }, 'github events request failed');
      return { status: 'error', events: [], etag: this.etag, pollIntervalMs: null };
    } finally {
      clearTimeout(timeout);
    }

    return this.handleResponse(response);
  }

  private async handleResponse(response: Response): Promise<PollResult> {
    const etag = response.headers.get('etag');
    const pollIntervalMs = parsePollInterval(response.headers.get('x-poll-interval'));
    this.updateRateLimit(response);

    if (response.status === 304) {
      return { status: 'not_modified', events: [], etag: this.etag, pollIntervalMs };
    }

    if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
      this.log.warn('github rate limit exhausted');
      return { status: 'rate_limited', events: [], etag: this.etag, pollIntervalMs };
    }

    if (!response.ok) {
      this.log.warn({ status: response.status }, 'github events unexpected status');
      return { status: 'error', events: [], etag: this.etag, pollIntervalMs };
    }

    const body = (await response.json().catch(() => null)) as RawGithubEvent[] | null;
    if (!Array.isArray(body)) {
      return { status: 'error', events: [], etag: this.etag, pollIntervalMs };
    }

    if (etag) {
      this.etag = etag;
    }

    return { status: 'ok', events: body, etag: this.etag, pollIntervalMs };
  }

  private updateRateLimit(response: Response): void {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    if (remaining !== null) {
      this.rateLimitRemaining = Number(remaining);
    }
    if (reset !== null) {
      this.rateLimitResetAt = new Date(Number(reset) * 1000).toISOString();
    }
  }

  rateLimitRemaining: number | null = null;
  rateLimitResetAt: string | null = null;
}

export function parsePollInterval(headerValue: string | null): number | null {
  if (headerValue === null) return null;
  const seconds = Number(headerValue);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}
