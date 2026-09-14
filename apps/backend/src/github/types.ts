/**
 * Raw GitHub Events API event shape (subset the adapter may consume).
 * Raw payloads must not leak past the source adapter boundary (DATA_CONTRACT.md §1).
 */
export interface RawGithubEvent {
  id: string;
  type: string;
  actor?: { id?: number; login?: string };
  repo?: { id?: number; name?: string };
  created_at?: string;
  public?: boolean;
  payload?: { action?: string };
}

/**
 * Canonical Git Pulse ActivityEvent (DATA_CONTRACT.md §5).
 * Contains no GitHub-specific JSON.
 */
export interface ActivityEvent {
  id: string;
  source: 'github';
  eventType: string;
  eventAction: string | null;
  eventTime: string;
  ingestedAt: string;
  userId: number | null;
  repositoryId: number | null;
  locationId: string | null;
  languageId: string | null;
}
