import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type pg from 'pg';

/**
 * Minimal deterministic SQL migrator: ordered .sql files in migrations/,
 * applied once, tracked in schema_migrations. No external migration tooling
 * required for V1 (ADR-014: intentionally simple).
 */
export async function runMigrations(pool: pg.Pool, dir?: string): Promise<string[]> {
  const migrationsDir = dir ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  const applied: string[] = [];

  // Tracking table must exist before the first check; created outside the
  // per-file transaction so an early failure never loses bookkeeping.
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  for (const file of files) {
    const exists = await pool.query('SELECT 1 FROM schema_migrations WHERE id = $1', [file]);
    if (exists.rowCount && exists.rowCount > 0) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      await client.query('COMMIT');
      applied.push(file);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return applied;
}
