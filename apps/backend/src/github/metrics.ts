export interface IngestionMetrics {
  pollsStarted: number;
  pollsSucceeded: number;
  pollsFailed: number;
  responsesNotModified: number;
  eventsReceived: number;
  eventsDeduplicated: number;
  eventsRejected: number;
  eventsNormalized: number;
  rateLimitRemaining: number | null;
  rateLimitResetAt: string | null;
  lastPollAt: string | null;
}

export function createIngestionMetrics(): IngestionMetrics {
  return {
    pollsStarted: 0,
    pollsSucceeded: 0,
    pollsFailed: 0,
    responsesNotModified: 0,
    eventsReceived: 0,
    eventsDeduplicated: 0,
    eventsRejected: 0,
    eventsNormalized: 0,
    rateLimitRemaining: null,
    rateLimitResetAt: null,
    lastPollAt: null
  };
}
