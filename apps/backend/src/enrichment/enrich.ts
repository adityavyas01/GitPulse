import type { FastifyBaseLogger } from 'fastify';

import type { GithubConfig } from '../github/config.js';
import type { ActivityEvent } from '../github/types.js';
import { EnrichmentClient } from './enrichmentClient.js';
import { resolveLocation } from './locationResolver.js';
import { normalizeLanguage } from './language.js';
import { diagEvent, diagProfileFetched, diagProfileNull, diagReset, diagUserResult, locDiagEnabled } from './diagnostics.js';

export interface EnrichmentStats {
  resolvedLocations: number;
  unresolvedLocations: number;
  languagesAssigned: number;
}

export interface EnrichmentDeps {
  client: EnrichmentClient;
  stats: EnrichmentStats;
  log: FastifyBaseLogger;
}

export interface EnrichmentResult {
  event: ActivityEvent;
  /** True when the profile location resolved to a known city. */
  plotted: boolean;
}

/**
 * Enrichment: ActivityEvent → location + language (ROADMAP Week 5 output).
 * Coordinates come ONLY from the resolved Location record (ADR-005) and
 * never attach to the event itself. Unresolved events are retained, just
 * not geographically plotted (SRS §8). No fabricated data — nulls stay null.
 */
export async function enrichEvents(
  events: ActivityEvent[],
  deps: EnrichmentDeps
): Promise<EnrichmentResult[]> {
  const results: EnrichmentResult[] = [];
  if (locDiagEnabled()) diagReset(events.length);

  for (const event of events) {
    const enriched: ActivityEvent = { ...event };

    // User enrichment (cache-first, single-flight per user id).
    if (event.userId !== null) {
      const profile = await deps.client.users.get(String(event.userId));
      if (profile) {
        diagProfileFetched(profile.username, event.id);
        const resolution = resolveLocation(profile.location);
        diagUserResult(profile.username, profile.location, {
          status: resolution.state,
          locationId: resolution.state === 'RESOLVED' ? resolution.location.id : null
        });
        if (resolution.state === 'RESOLVED') {
          enriched.locationId = resolution.location.id;
        }
        // AMBIGUOUS/MISSING/INVALID: retain activity, no geographic plot.
      } else {
        diagProfileNull();
      }
    }

    // Repository enrichment (cache-first, single-flight per repo id).
    if (event.repositoryId !== null) {
      const repo = await deps.client.repositories.get(String(event.repositoryId));
      if (repo) {
        enriched.languageId = normalizeLanguage(repo.primaryLanguage);
      }
    }

    const plotted = enriched.locationId !== null;
    diagEvent(enriched.locationId, enriched.languageId);
    if (plotted) {
      deps.stats.resolvedLocations += 1;
    } else {
      deps.stats.unresolvedLocations += 1;
    }
    if (enriched.languageId !== null) {
      deps.stats.languagesAssigned += 1;
    }
    results.push({ event: enriched, plotted });
  }

  return results;
}

export function createEnrichmentDeps(config: GithubConfig, log: FastifyBaseLogger): EnrichmentDeps {
  return {
    client: new EnrichmentClient(config, log),
    stats: { resolvedLocations: 0, unresolvedLocations: 0, languagesAssigned: 0 },
    log
  };
}
