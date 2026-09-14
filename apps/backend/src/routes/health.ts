import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../index.js';

export function registerHealthRoutes(app: FastifyInstance, deps: AppDeps): void {
  app.get('/health', async () => {
    const healthy = deps.postgresReady && deps.redisReady;
    return {
      status: healthy ? 'ok' : 'degraded',
      service: 'git-pulse-backend',
      dependencies: {
        postgres: deps.postgresReady ? 'up' : 'down',
        redis: deps.redisReady ? 'up' : 'down'
      }
    };
  });
}
