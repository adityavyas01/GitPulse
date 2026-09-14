import { describe, expect, it } from 'vitest';

import { normalizeEvent, mapEventType } from '../src/github/normalize.js';
import type { RawGithubEvent } from '../src/github/types.js';

describe('normalizeEvent', () => {
  it('maps a PushEvent to canonical ActivityEvent per DATA_CONTRACT §5', () => {
    const raw = validRaw();
    const event = normalizeEvent(raw, new Date('2026-09-04T10:16:00Z'));

    expect(event).toEqual({
      id: 'github_22249084964',
      source: 'github',
      eventType: 'PUSH',
      eventAction: null,
      eventTime: '2026-09-04T10:15:20Z',
      ingestedAt: '2026-09-04T10:16:00.000Z',
      userId: 583231,
      repositoryId: 1296269,
      locationId: null,
      languageId: null
    });
  });

  it('preserves eventTime separately from ingestedAt', () => {
    const event = normalizeEvent(validRaw(), new Date('2026-09-04T12:00:00Z'));
    expect(event.eventTime).toBe('2026-09-04T10:15:20Z');
    expect(event.ingestedAt).toBe('2026-09-04T12:00:00.000Z');
  });

  it('does not expand PushEvent into commits — one event, one activity', () => {
    const raw = { ...validRaw(), payload: { commits: [{}, {}, {}] } };
    const event = normalizeEvent(raw);
    expect(event.eventType).toBe('PUSH');
    expect(Object.keys(event)).not.toContain('commits');
  });

  it('keeps payload action as eventAction when present', () => {
    const raw = { ...validRaw(), type: 'PullRequestEvent', payload: { action: 'opened' } };
    expect(normalizeEvent(raw).eventAction).toBe('opened');
  });

  it('leaves location and language null (Week 5 enrichment, never fabricated)', () => {
    const event = normalizeEvent(validRaw());
    expect(event.locationId).toBeNull();
    expect(event.languageId).toBeNull();
  });
});

describe('mapEventType', () => {
  it('maps known types', () => {
    expect(mapEventType('PushEvent')).toBe('PUSH');
    expect(mapEventType('PullRequestEvent')).toBe('PULL_REQUEST');
    expect(mapEventType('IssuesEvent')).toBe('ISSUE');
    expect(mapEventType('ReleaseEvent')).toBe('RELEASE');
  });

  it('maps unknown types to UNKNOWN, never drops', () => {
    expect(mapEventType('SomeNewEvent')).toBe('UNKNOWN');
  });
});

function validRaw(): RawGithubEvent {
  return {
    id: '22249084964',
    type: 'PushEvent',
    actor: { id: 583231, login: 'octocat' },
    repo: { id: 1296269, name: 'octocat/Hello-World' },
    created_at: '2026-09-04T10:15:20Z',
    public: true
  };
}
