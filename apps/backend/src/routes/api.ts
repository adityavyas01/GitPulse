import type { FastifyInstance } from 'fastify';
import type pg from 'pg';

import { queryActivity, queryStats } from '../db/queries.js';
import { LOCATION_CATALOG } from '../enrichment/locationCatalog.js';

const MAX_RANGE_MS = 24 * 60 * 60 * 1000;
const KNOWN_TYPES = new Set(['PUSH', 'PULL_REQUEST', 'ISSUE', 'ISSUE_COMMENT', 'REVIEW', 'REVIEW_COMMENT', 'RELEASE', 'CREATE', 'DELETE', 'FORK', 'WATCH', 'PUBLIC', 'UNKNOWN']);

export function registerApiRoutes(app: FastifyInstance, pool: pg.Pool): void {
  app.get('/api/activity', async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;

    const toMs = parseTimestamp(query.to ?? new Date().toISOString());
    const fromMs = parseTimestamp(query.from ?? new Date(Date.now() - MAX_RANGE_MS).toISOString());
    if (toMs === null || fromMs === null) {
      return reply.code(400).send({ error: 'invalid timestamp: from/to must be ISO-8601' });
    }
    if (toMs - fromMs <= 0) {
      return reply.code(400).send({ error: 'from must be before to' });
    }
    if (toMs - fromMs > MAX_RANGE_MS) {
      return reply.code(400).send({ error: 'maximum range is 24 hours' });
    }
    const from = new Date(fromMs);
    const to = new Date(toMs);

    const language = normalizeFilter(query.language);
    // Event types are stored uppercase in the database (canonical mapping).
    const activityType = query.activityType?.trim().toUpperCase() ?? null;
    if (activityType !== null && activityType.length === 0) {
      return reply.code(400).send({ error: 'invalid activityType' });
    }
    if (activityType !== null && !KNOWN_TYPES.has(activityType)) {
      return reply.code(400).send({ error: 'invalid activityType' });
    }
    const location = normalizeFilter(query.location);

    try {
      const buckets = await queryActivity(pool, { from, to, language, activityType, location });
      return {
        range: { from: from.toISOString(), to: to.toISOString() },
        buckets
      };
    } catch (err) {
      request.log.error({ err }, 'activity query failed');
      return reply.code(503).send({ error: 'database unavailable' });
    }
  });

  app.get('/api/stats', async (request, reply) => {
    try {
      return await queryStats(pool, new Date());
    } catch (err) {
      request.log.error({ err }, 'stats query failed');
      return reply.code(503).send({ error: 'database unavailable' });
    }
  });

  app.get('/api/locations', async () => {
    // Reference data from the authoritative catalog — never fabricated.
    return { locations: LOCATION_CATALOG };
  });
}

function parseTimestamp(value: string): number | null {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function normalizeFilter(value: string | undefined): string | null {
  if (value === undefined || value.trim().length === 0) {
    return null;
  }
  return value.trim().toLowerCase();
}
