import { describe, expect, it } from 'vitest';

import { validateRawEvent } from '../src/github/validate.js';

describe('validateRawEvent', () => {
  it('accepts a complete valid event', () => {
    const result = validateRawEvent(validEvent());
    expect(result.ok).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(validateRawEvent(null).ok).toBe(false);
    expect(validateRawEvent('string').ok).toBe(false);
  });

  it('rejects missing id', () => {
    const event = validEvent();
    delete (event as Record<string, unknown>).id;
    expect(validateRawEvent(event)).toMatchObject({ ok: false, reason: 'missing id' });
  });

  it('rejects missing type', () => {
    const event = validEvent();
    delete (event as Record<string, unknown>).type;
    expect(validateRawEvent(event)).toMatchObject({ ok: false, reason: 'missing type' });
  });

  it('rejects missing actor', () => {
    const event = validEvent();
    delete (event as Record<string, unknown>).actor;
    expect(validateRawEvent(event)).toMatchObject({ ok: false, reason: 'missing actor' });
  });

  it('rejects missing repo', () => {
    const event = validEvent();
    delete (event as Record<string, unknown>).repo;
    expect(validateRawEvent(event)).toMatchObject({ ok: false, reason: 'missing repo' });
  });

  it('rejects invalid created_at', () => {
    const event = { ...validEvent(), created_at: 'not-a-date' };
    expect(validateRawEvent(event)).toMatchObject({ ok: false, reason: 'missing or invalid created_at' });
  });
});

function validEvent() {
  return {
    id: '22249084964',
    type: 'PushEvent',
    actor: { id: 583231, login: 'octocat' },
    repo: { id: 1296269, name: 'octocat/Hello-World' },
    created_at: '2026-09-04T10:15:20Z',
    public: true
  };
}
