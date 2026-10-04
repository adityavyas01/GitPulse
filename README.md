# 🌍 Git Pulse

### Watch the world build software.

Git Pulse is a live 3D globe of public GitHub activity. Cities light up as code gets pushed, and you can replay the last 24 hours to see the world's development rhythm move with the sun.

**Live demo:** https://gitpulse3d.vercel.app

<!-- Add a screen recording or GIF of the globe here, e.g. ![Git Pulse](docs/demo.gif) -->

---

## Features

- **Interactive 3D Earth**: orbit, zoom, and watch it rotate at the real sidereal rate
- **Live activity**: pulses appear on cities as new public GitHub events arrive over WebSockets
- **Real day and night**: the sun's position is computed astronomically, and replay moves it to the selected time
- **24-hour replay**: play, pause, and scrub through 96 fifteen-minute slots, then jump back to LIVE
- **Filters**: by repository language and by activity type (push, pull request, issue, review, release)
- **Location search**: find any of the 70 catalog cities and fly the camera there
- **Hover tooltips**: city name and activity count on each marker
- **Community pulse**: a compact summary of total activity, active locations, top city and top language

## Privacy by design

Git Pulse shows **where, never who**.

- It visualizes aggregated, city-level activity only.
- It does not expose usernames, repositories, commits, files, or lines changed.
- It does not pinpoint individual developers. Locations come from the self-reported `location` field on public GitHub profiles, matched to a fixed catalog of cities.
- Ambiguous, country-only, or unrecognized locations are never plotted. Coordinates always come from the catalog, never guessed.

## How it works

```
GitHub Events API
   → fetch (ETag, poll-interval aware, retry with backoff)
   → validate → deduplicate → enrich (profile location → city)
   → aggregate into 15-minute buckets
   → PostgreSQL (24-hour retention) + Redis (hot state)
   → REST + WebSocket
   → React / React Three Fiber / Three.js globe
```

**Ingestion.** The backend polls the public GitHub Events API, using conditional requests (`ETag` / `If-None-Match`), honoring `X-Poll-Interval`, and retrying transient failures with exponential backoff. Events are validated, deduplicated (LRU cache of 50,000 event IDs), and enriched with the actor's public profile location and the repository's primary language, both cached for 24 hours. One GitHub event counts as one activity unit; pushes are not expanded into commits.

**Location resolution.** Profile locations are normalized (case, diacritics, punctuation) and matched deterministically against a catalog of 70 cities in 34 countries. Each string resolves to one of four states: `RESOLVED`, `AMBIGUOUS`, `MISSING`, or `INVALID`. The catalog was expanded from a real 1,000-event sample (see `data/experiments/`), which showed that only about 23% of sampled profiles list a location at all.

**Live updates.** New clients receive a hot-state snapshot from Redis on connect, followed by compact aggregated updates as they are persisted. The server heartbeats every 30 seconds, and the client reconnects with exponential backoff (up to 60 seconds).

**Rendering.** All activity markers are drawn by a single pooled `InstancedMesh` (capped at 500 instances) with a custom pulse shader. Level of detail depends on camera distance (80 / 240 / 500 markers, with hysteresis so it doesn't flicker), and markers past the horizon are hidden.

> "LIVE" here means "continuously updated". GitHub's Events API is a polled feed, not a true real-time stream, and it is a sample of public activity rather than every event on GitHub.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Three.js, React Three Fiber, Drei |
| Backend | Node.js 20+, Fastify, `ws`, `pg`, `redis`, Pino |
| Data | PostgreSQL (Supabase in production), Redis / Valkey |
| Testing | Vitest |
| Hosting | Vercel (frontend), Render (backend), Supabase (database) |

## Getting started

**Prerequisites:** Node.js 20+, npm, and Docker (for local PostgreSQL and Redis).

```bash
# 1. Install dependencies (npm workspaces)
npm install

# 2. Start PostgreSQL and Redis
docker compose up -d

# 3. Configure the backend
cp .env.example .env
#    Optional: set GITHUB_TOKEN for higher GitHub API rate limits

# 4. Run the backend (http://localhost:3000)
npm run dev:backend

# 5. Run the frontend (http://localhost:5173)
npm run dev:frontend
```

In development the frontend calls `/api/...` on its own origin and Vite proxies it (including the WebSocket) to the backend on port 3000. Database migrations run automatically on backend start.

### Configuration

| Variable | Where | Purpose |
|---|---|---|
| `PORT` | backend | HTTP port (default `3000`) |
| `DATABASE_URL` | backend | PostgreSQL connection string |
| `REDIS_URL` | backend | Redis / Valkey connection string |
| `GITHUB_TOKEN` | backend | Optional token for higher rate limits (server-side only) |
| `GITHUB_MIN_POLL_INTERVAL_MS` | backend | Minimum polling interval (default `60000`) |
| `CORS_ORIGIN` | backend | Allowed browser origin in production |
| `VITE_API_BASE_URL` | frontend | Backend base URL in production (unset in development) |

See `.env.example` for the full list.

## API

| Endpoint | Description |
|---|---|
| `GET /api/activity` | Aggregated activity in 15-minute buckets. Optional `from`, `to` (ISO-8601, max 24-hour range), `language`, `activityType`, `location` |
| `GET /api/stats` | Aggregate summary: total activities, active locations, top language and city, activity mix |
| `GET /api/locations` | The location catalog (id, city, country, coordinates) |
| `GET /health` | Service status and PostgreSQL / Redis connectivity |
| `WS /api/live` | Live aggregated updates: `{ timestamp, updates: [{ locationId, count }] }` |

## Scripts

```bash
npm run typecheck   # TypeScript checks for all workspaces
npm test            # Vitest for all workspaces
npm run build       # Production builds
```

Database-backed backend tests run against a local PostgreSQL (`docker compose up -d`) and are skipped automatically when it is unavailable.

## Project structure

```
apps/
  backend/     Fastify API, GitHub ingestion, enrichment, aggregation, WebSocket hub
  frontend/    React + React Three Fiber globe, timeline, filters, search
data/
  experiments/ Location-data experiment (1,000 public events)
deploy/        Deployment configuration
```

## Deployment

The frontend is a static Vite build on Vercel. The backend runs on Render with Supabase PostgreSQL and a managed Redis-compatible store. Because free-tier Render instances sleep when idle, an external cron job pings `/health` every 10 minutes to keep the ingestion loop running.

## Limitations

- Only events whose author has a public profile location that matches a catalog city are plotted, so the globe shows a subset of activity.
- Profile locations are self-reported and unverified.
- GitHub's public Events API is a rate-limited, polled sample of recent public events.
- Only the most recent 24 hours are stored, so there is no long-term history.

## Author

Built by **Aditya Vyas** · [LinkedIn](https://linkedin.com/in/aditya-vyas-1050921a8)