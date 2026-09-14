import type { RawGithubEvent } from './types.js';

export type ValidationResult =
  | { ok: true; event: RawGithubEvent }
  | { ok: false; reason: string };

/**
 * Validates the required common fields (SRS §4):
 * id, type, actor, repo, created_at.
 * Invalid events are rejected (with reason) and counted by the caller.
 */
export function validateRawEvent(raw: unknown): ValidationResult {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, reason: 'not an object' };
  }
  const event = raw as RawGithubEvent;

  if (typeof event.id !== 'string' || event.id.length === 0) {
    return { ok: false, reason: 'missing id' };
  }
  if (typeof event.type !== 'string' || event.type.length === 0) {
    return { ok: false, reason: 'missing type' };
  }
  if (!event.actor || typeof event.actor.id !== 'number') {
    return { ok: false, reason: 'missing actor' };
  }
  if (!event.repo || typeof event.repo.id !== 'number') {
    return { ok: false, reason: 'missing repo' };
  }
  if (typeof event.created_at !== 'string' || Number.isNaN(Date.parse(event.created_at))) {
    return { ok: false, reason: 'missing or invalid created_at' };
  }
  return { ok: true, event };
}
