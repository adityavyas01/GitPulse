import type { FastifyBaseLogger } from 'fastify';
import pg from 'pg';

export interface PostgresHandle {
  pool: pg.Pool;
  ready: boolean;
}

let handle: PostgresHandle | null = null;

export async function connectPostgres(databaseUrl: string, log: FastifyBaseLogger): Promise<boolean> {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  try {
    await pool.query('SELECT 1');
    handle = { pool, ready: true };
    log.info('postgres connection established');
    return true;
  } catch (err) {
    log.error({ err }, 'postgres connection failed — continuing without database');
    await pool.end().catch(() => undefined);
    handle = null;
    return false;
  }
}

export function getPostgres(): pg.Pool {
  if (!handle) {
    throw new Error('postgres not connected');
  }
  return handle.pool;
}

export async function closePostgres(): Promise<void> {
  if (handle) {
    await handle.pool.end();
    handle = null;
  }
}
