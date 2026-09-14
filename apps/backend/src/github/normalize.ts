import type { RawGithubEvent, ActivityEvent } from './types.js';

/**
 * Maps a validated raw GitHub event to a canonical ActivityEvent.
 * One GitHub event = one Git Pulse activity unit (ADR-002).
 * PushEvent is NOT expanded into commits (AGENTS.md §8).
 *
 * locationId/languageId are Week 5 enrichment output — null here.
 * Never fabricate missing data (DATA_CONTRACT.md §9).
 */
export function normalizeEvent(raw: RawGithubEvent, ingestedAt: Date = new Date()): ActivityEvent {
  return {
    id: `github_${raw.id}`,
    source: 'github',
    eventType: mapEventType(raw.type),
    eventAction: raw.payload?.action ?? null,
    eventTime: raw.created_at as string,
    ingestedAt: ingestedAt.toISOString(),
    userId: raw.actor?.id ?? null,
    repositoryId: raw.repo?.id ?? null,
    locationId: null,
    languageId: null
  };
}

const EVENT_TYPE_MAP: Record<string, string> = {
  PushEvent: 'PUSH',
  PullRequestEvent: 'PULL_REQUEST',
  IssuesEvent: 'ISSUE',
  IssueCommentEvent: 'ISSUE_COMMENT',
  PullRequestReviewEvent: 'REVIEW',
  PullRequestReviewCommentEvent: 'REVIEW_COMMENT',
  ReleaseEvent: 'RELEASE',
  CreateEvent: 'CREATE',
  DeleteEvent: 'DELETE',
  ForkEvent: 'FORK',
  WatchEvent: 'WATCH',
  PublicEvent: 'PUBLIC'
};

/**
 * Maps GitHub event type to canonical type. Unknown types map to
 * UNKNOWN (retained, counted — never dropped silently, never invented).
 */
export function mapEventType(githubType: string): string {
  return EVENT_TYPE_MAP[githubType] ?? 'UNKNOWN';
}
