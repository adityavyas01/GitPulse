// Week 8 E2E smoke check: start the real server stack, exercise the live
// endpoints in-process via fastify.inject, print results, exit.
import { startServer, loadConfig } from '../dist/index.js';
import pg from 'pg';

const config = {
  ...loadConfig(),
  port: 3123,
  logLevel: 'warn'
};

const app = await startServer(config);

async function show(path) {
  const res = await app.inject({ method: 'GET', url: path });
  let body;
  try {
    body = JSON.stringify(JSON.parse(res.body)).slice(0, 220);
  } catch {
    body = res.body.slice(0, 220);
  }
  console.log(`${path} -> ${res.statusCode} ${body}`);
}

await show('/health');
await show('/api/stats');
await show('/api/locations');
await show('/api/activity');

// Count rows so we can see whether the pipeline is storing anything.
const pool = new pg.Pool({ connectionString: config.databaseUrl });
try {
  const ev = await pool.query('SELECT COUNT(*)::int AS n FROM activity_events');
  const bk = await pool.query('SELECT COUNT(*)::int AS n FROM activity_buckets');
  console.log(`activity_events rows: ${ev.rows[0].n}`);
  console.log(`activity_buckets rows: ${bk.rows[0].n}`);
} finally {
  await pool.end();
}

await app.close();
process.exit(0);
