import type { FastifyBaseLogger } from 'fastify';

import type { GithubConfig } from './config.js';
import { createPipelineDeps, runPipeline, type IngestionPipelineDeps } from './pipeline.js';
import type { PollResult } from './fetcher.js';

export interface PollScheduler {
  start(): void;
  stop(): Promise<void>;
  readonly running: boolean;
}

const RETRYABLE_STATUSES = new Set(['error', 'rate_limited']);

/**
 * Polling loop honoring X-Poll-Interval (min floor from config) with
 * retry + exponential backoff on transient failures/rate limits.
 * GitHub Events API is a polling source, not a true real-time stream (ADR-009).
 */
export class GithubPollScheduler implements PollScheduler {
  private timer: NodeJS.Timeout | null = null;
  private stopped = true;
  private readonly deps: IngestionPipelineDeps;
  private readonly onResult?: (result: Awaited<ReturnType<typeof runPipeline>>) => void;
  private readonly config: GithubConfig;

  constructor(
    config: GithubConfig,
    log: FastifyBaseLogger,
    onResult?: (result: Awaited<ReturnType<typeof runPipeline>>) => void
  ) {
    this.config = config;
    this.deps = createPipelineDeps(config, log);
    this.onResult = onResult;
  }

  get metrics(): IngestionPipelineDeps['metrics'] {
    return this.deps.metrics;
  }

  get running(): boolean {
    return !this.stopped;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.scheduleNext(0);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(delayMs: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => void this.tick(), delayMs);
  }

  private async tick(): Promise<void> {
    if (this.stopped) return;

    let delayMs: number;
    let attempt = 0;

    // Retry loop: transient failures back off exponentially; success resets.
    for (;;) {
      const result = await runPipeline(this.deps);
      this.onResult?.(result);

      if (result.status === 'ok' || result.status === 'not_modified') {
        delayMs = this.resolvedPollIntervalMs(result.pollIntervalMs);
        break;
      }

      if (!RETRYABLE_STATUSES.has(result.status) || attempt >= this.config.maxRetries) {
        delayMs = this.resolvedPollIntervalMs(result.pollIntervalMs);
        break;
      }

      delayMs = this.config.retryBaseDelayMs * 2 ** attempt;
      attempt += 1;
      await wait(delayMs);
    }

    this.scheduleNext(delayMs);
  }

  private resolvedPollIntervalMs(headerIntervalMs: number | null): number {
    const floor = this.config.minPollIntervalMs;
    if (headerIntervalMs && headerIntervalMs > floor) return headerIntervalMs;
    return floor;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type { PollResult };
