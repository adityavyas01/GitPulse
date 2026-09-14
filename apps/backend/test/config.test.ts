import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/index.js';

describe('loadConfig', () => {
  it('uses defaults when env is empty', () => {
    const config = loadConfig({});
    expect(config.port).toBe(3000);
    expect(config.logLevel).toBe('info');
    expect(config.databaseUrl).toContain('gitpulse');
    expect(config.redisUrl).toBe('redis://localhost:6379');
  });

  it('reads overrides from environment', () => {
    const config = loadConfig({ PORT: '8080', LOG_LEVEL: 'debug' });
    expect(config.port).toBe(8080);
    expect(config.logLevel).toBe('debug');
  });

  it('falls back on invalid port', () => {
    const config = loadConfig({ PORT: 'not-a-number' });
    expect(config.port).toBe(3000);
  });
});
