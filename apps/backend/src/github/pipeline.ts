import type { FastifyBaseLogger } from 'fastify';

import type { GithubConfig } from './config.js';
import type { ActivityEvent } from './types.js';
import { validateRawEvent } from './validate.js';
import { normalizeEvent } from './normalize.js';
import { EventDeduplicator } from './dedupe.js';
import { GithubEventFetcher } from './fetcher.js';
import { createIngestionMetrics, type IngestionMetrics } from './metrics.js';

export interface IngestionPipelineDeps {
  fetcher: GithubEventFetcher;
  deduplicator: EventDeduplicator;
  metrics: IngestionMetrics;
  config: GithubConfig;
  log: FastifyBaseLogger;
}

export interface PipelineRunResult {
  status: 'ok' | 'not_modified' | 'rate_limited' | 'error';
  accepted: ActivityEvent[];
  rejected: number;
  duplicates: number;
  /** X-Poll-Interval from the response, in ms (null when absent). */
  pollIntervalMs: number | null;
}

/**
 * One poll → validate → deduplicate → normalize. Storage + aggregation
 * run downstream of this function (see db/storage.ts, Week 8 wiring).
 */
export async function runPipeline(deps: IngestionPipelineDeps): Promise<PipelineRunResult> {
  const { fetcher, deduplicator, metrics, log } = deps;
  metrics.pollsStarted += 1;
  metrics.lastPollAt = new Date().toISOString();

  const poll = await fetcher.poll();

  if (poll.status === 'not_modified') {
    metrics.responsesNotModified += 1;
    return { status: 'not_modified', accepted: [], rejected: 0, duplicates: 0, pollIntervalMs: poll.pollIntervalMs };
  }

  if (poll.status === 'rate_limited') {
    metrics.pollsFailed += 1;
    return { status: 'rate_limited', accepted: [], rejected: 0, duplicates: 0, pollIntervalMs: poll.pollIntervalMs };
  }

  if (poll.status === 'error') {
    metrics.pollsFailed += 1;
    return { status: 'error', accepted: [], rejected: 0, duplicates: 0, pollIntervalMs: poll.pollIntervalMs };
  }

  metrics.pollsSucceeded += 1;
  metrics.eventsReceived += poll.events.length;

  const accepted: ActivityEvent[] = [];
  let rejected = 0;
  let duplicates = 0;

  for (const raw of poll.events) {
    const validation = validateRawEvent(raw);
    if (!validation.ok) {
      metrics.eventsRejected += 1;
      rejected += 1;
      log.debug({ reason: validation.reason }, 'event rejected');
      continue;
    }

    const activity = normalizeEvent(validation.event);
    if (deduplicator.isDuplicate(activity)) {
      metrics.eventsDeduplicated += 1;
      duplicates += 1;
      continue;
    }
    deduplicator.add(activity);

    accepted.push(activity);
    metrics.eventsNormalized += 1;
  }

  return { status: 'ok', accepted, rejected, duplicates, pollIntervalMs: poll.pollIntervalMs };
}

export function createPipelineDeps(config: GithubConfig, log: FastifyBaseLogger): IngestionPipelineDeps {
  return {
    fetcher: new GithubEventFetcher(config, log),
    deduplicator: new EventDeduplicator(),
    metrics: createIngestionMetrics(),
    config,
    log
  };
}
