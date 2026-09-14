export interface GithubConfig {
  /** Optional personal access token. Server-side only; never logged. */
  token: string | null;
  apiUrl: string;
  /** Floor for polling interval; GitHub guidance for /events is ~60s. */
  minPollIntervalMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  /** Per-request timeout; a hung connection must not stall the poll loop. */
  requestTimeoutMs: number;
}

export function loadGithubConfig(env: NodeJS.ProcessEnv = process.env): GithubConfig {
  return {
    token: env.GITHUB_TOKEN && env.GITHUB_TOKEN.length > 0 ? env.GITHUB_TOKEN : null,
    apiUrl: env.GITHUB_API_URL ?? 'https://api.github.com',
    minPollIntervalMs: Number(env.GITHUB_MIN_POLL_INTERVAL_MS ?? '60000'),
    maxRetries: Number(env.GITHUB_MAX_RETRIES ?? '3'),
    retryBaseDelayMs: Number(env.GITHUB_RETRY_BASE_DELAY_MS ?? '500'),
    requestTimeoutMs: Number(env.GITHUB_REQUEST_TIMEOUT_MS ?? '15000')
  };
}
