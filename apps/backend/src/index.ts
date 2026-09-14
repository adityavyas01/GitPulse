import Fastify from 'fastify';
import type { FastifyBaseLogger } from 'fastify';
import pg from 'pg';

import { registerHealthRoutes } from './routes/health.js';
import { registerApiRoutes } from './routes/api.js';
import { connectPostgres } from './infra/postgres.js';
import { connectRedis } from './infra/redis.js';
import { loadGithubConfig } from './github/config.js';
import { GithubPollScheduler } from './github/scheduler.js';
import { persistEnrichedResult } from './db/storage.js';
import { createEnrichmentDeps } from './enrichment/enrich.js';
import { runMigrations } from './db/migrator.js';
import { LiveHub } from './live/hub.js';
import { storeHotState } from './live/hotState.js';
import { getRedis } from './infra/redis.js';

export interface AppConfig {
  port: number;
  logLevel: string;
  databaseUrl: string;
  redisUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.PORT ?? '3000');
  return {
    port: Number.isFinite(port) && port > 0 ? port : 3000,
    logLevel: env.LOG_LEVEL ?? 'info',
    // Host port 5433: docker-compose mapping (local 5432 is occupied by a
    // machine-local PostgreSQL service — see PROJECT_STATE deviations).
    databaseUrl: env.DATABASE_URL ?? 'postgres://gitpulse:gitpulse@localhost:5433/gitpulse',
    redisUrl: env.REDIS_URL ?? 'redis://localhost:6379'
  };
}

export type AppLogger = FastifyBaseLogger;

export interface AppDeps {
  postgresReady: boolean;
  redisReady: boolean;
}

export async function createServer(config: AppConfig) {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined
    }
  });
  const deps: AppDeps = {
    postgresReady: false,
    redisReady: false
  };

  registerHealthRoutes(app, deps);

  // API routes accept a pool so tests can supply their own database.
  const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 5 });
  registerApiRoutes(app, pool);

  return { app, deps, pool };
}

export async function startServer(config: AppConfig = loadConfig()) {
  const { app, deps, pool } = await createServer(config);

  deps.postgresReady = await connectPostgres(config.databaseUrl, app.log as AppLogger);
  deps.redisReady = await connectRedis(config.redisUrl, app.log);

  if (deps.postgresReady) {
    try {
      await runMigrations(pool);
      app.log.info('database migrations applied');
    } catch (err) {
      app.log.error(err, 'migration failure — persistence and activity queries will fail until fixed');
    }
  }

  // WebSocket hub attaches to the HTTP server once listening (below).
  let liveHub: LiveHub | null = null;

  const githubConfig = loadGithubConfig();
  // Created once: TtlCache instances (with single-flight) must persist
  // across polls rather than being recreated per event or per poll.
  const enrichment = createEnrichmentDeps(githubConfig, app.log);
  const scheduler = new GithubPollScheduler(githubConfig, app.log, (result) => {
    if (result.status === 'ok' && result.accepted.length > 0) {
      void persistEnrichedResult(pool, result.accepted, enrichment, app.log)
        .then(({ outcome, events }) => {
          if (outcome.persisted > 0 || outcome.buckets > 0) {
            app.log.info(
              { persisted: outcome.persisted, buckets: outcome.buckets },
              'pipeline output persisted'
            );
          }

          // Week 9: fan out compact aggregated updates and mirror them to
          // Redis hot state, from the enriched events as persisted.
          const counts = new Map<string, number>();
          for (const event of events) {
            if (event.locationId) {
              counts.set(event.locationId, (counts.get(event.locationId) ?? 0) + 1);
            }
          }
          const updates = [...counts.entries()].map(([locationId, count]) => ({ locationId, count }));
          liveHub?.broadcast(updates);
          if (deps.redisReady) {
            void storeHotState(getRedis(), updates).catch((err) => {
              app.log.warn({ err }, 'hot state store failed');
            });
          }
        })
        .catch(() => undefined); // persistEnrichedResult already logs failures
    }
  });
  scheduler.start();
  app.log.info({ hasToken: githubConfig.token !== null }, 'github ingestion scheduler started');

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    liveHub = new LiveHub(app.server, {
      redis: deps.redisReady ? getRedis() : null,
      log: {
        debug: (msg) => app.log.debug(msg),
        info: (msg) => app.log.info(msg)
      }
    });
    liveHub.startHeartbeat();
  } catch (err) {
    app.log.error(err, 'failed to start server');
    process.exit(1);
  }
  return app;
}

// Allow direct execution without triggering on imports/tests.
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop() ?? '');
if (isMain) {
  startServer();
}
