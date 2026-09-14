import { describe, expect, it } from 'vitest';

import { loadGithubConfig } from '../src/github/config.js';

describe('loadGithubConfig', () => {
  it('defaults to no token and standard API URL', () => {
    const config = loadGithubConfig({});
    expect(config.token).toBeNull();
    expect(config.apiUrl).toBe('https://api.github.com');
    expect(config.minPollIntervalMs).toBe(60000);
    expect(config.maxRetries).toBe(3);
  });

  it('reads token from env, never hard-coded', () => {
    const config = loadGithubConfig({ GITHUB_TOKEN: 'secret-token' });
    expect(config.token).toBe('secret-token');
  });

  it('treats empty token as absent', () => {
    expect(loadGithubConfig({ GITHUB_TOKEN: '' }).token).toBeNull();
  });

  it('honors env overrides', () => {
    const config = loadGithubConfig({
      GITHUB_API_URL: 'https://github.example.com',
      GITHUB_MIN_POLL_INTERVAL_MS: '30000',
      GITHUB_MAX_RETRIES: '5'
    });
    expect(config.apiUrl).toBe('https://github.example.com');
    expect(config.minPollIntervalMs).toBe(30000);
    expect(config.maxRetries).toBe(5);
  });
});
