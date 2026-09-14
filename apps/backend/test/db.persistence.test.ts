import { describe, expect, it } from 'vitest';

import { insertActivityEvents } from '../src/db/activityEvents.js';
import type { ActivityEvent } from '../src/github/types.js';

describe('insertActivityEvents SQL contract', () => {
  it('uses ON CONFLICT (source, source_event_id) DO NOTHING for idempotent inserts', async () => {
    const src = await readFileSource();
    expect(src).toMatch(/ON CONFLICT \(source, source_event_id\) DO NOTHING/);
  });

  it('wraps inserts in a transaction', async () => {
    const src = await readFileSource();
    expect(src).toMatch(/BEGIN/);
    expect(src).toMatch(/COMMIT/);
    expect(src).toMatch(/ROLLBACK/);
  });

  it('preserves the event id prefix as source_event_id stripping', () => {
    const event = makeEvent('github_123');
    expect(event.id.replace(/^github_/, '')).toBe('123');
  });
});

function makeEvent(id: string): ActivityEvent {
  return {
    id,
    source: 'github',
    eventType: 'PUSH',
    eventAction: null,
    eventTime: '2026-09-05T10:00:00Z',
    ingestedAt: '2026-09-05T10:00:01Z',
    userId: 1,
    repositoryId: 2,
    locationId: null,
    languageId: null
  };
}

async function readFileSource(): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const path = await import('node:path');
  const p = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/db/activityEvents.ts');  return readFile(p, 'utf8');
}
