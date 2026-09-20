# Git Pulse — Project State

**Last updated:** 2026-09-09

**Phase:** Implementation

**Milestone:** Milestone 1 — The Machine Exists

---

## Product

Name:

Git Pulse

Tagline:

Watch the world build software.

Definition:

Git Pulse is a live visualization of public GitHub activity happening around the world.

---

## Current status

Weeks 1–8 are implemented through the Real Data → Globe stage:

- npm workspaces monorepo (`apps/backend`, `apps/frontend`)
- Backend: TypeScript strict + Fastify 5, pino logging, `GET /health`, PostgreSQL and Redis connection modules with graceful degradation, vitest config tests
- Ingestion → storage: poll pipeline persists accepted events, aggregates into 15-minute buckets, and applies 24-hour retention (`db/storage.ts`); migrations run automatically at server startup
- Frontend: Vite + React 19 + React Three Fiber globe engine — Earth, atmosphere, stars, lighting, orbit camera, geographic coordinate conversion, aggregate city pulses driven by real `/api/activity` + `/api/locations` data (60s polling, abortable, keeps last-known data on failure); Week 2 fake dataset only as an explicit dev preview prop
- Docker Compose for PostgreSQL 16 + Redis 7 (postgres mapped to host 5433; a local PostgreSQL 17 service owns 5432)
- `.env.example` environment template
- Backend REST API: `/api/activity`, `/api/stats`, and `/api/locations` with validation, shaped responses, parameterized PostgreSQL reads, and non-leaking database failure responses

Run locally: `docker compose up -d` + `npm run dev:backend` / `npm run dev:frontend`.

---

## Locked decisions

- Activity event is the visualization unit.
- Individual commits are not a V1 feature.
- Commit counts are not required.
- Files changed are not required.
- Lines changed are not required.
- Individual developers are not exposed.
- Activity effects are not identity-interactable.
- GitHub profile location is used for geography.
- Location is resolved to a known city/location when possible.
- Latitude/longitude belong to the location record.
- Repository language metadata is used for language filtering.
- Activity retention is maximum 24 hours.
- Initial aggregation interval is 15 minutes.
- WebSockets provide continuous live updates.
- User-facing terminology is "live", not "real-time".
- PostgreSQL stores recent normalized activity/history.
- Redis stores hot/live state and caches.
- V1 is intentionally simple.
- Kafka and multi-region infrastructure belong to later scaling phases.
- Frontend receives compact visualization-ready data.
- The globe uses LOD and capped effects.

---

## Current roadmap position

Week 13 — Visual polish and final QA (implemented). V1 roadmap complete.

Next:

None — all planned roadmap stages (Weeks 1–13) are complete. Future work belongs in FUTURE_WORK.md and requires an explicit scope decision before implementation.

---

## Important distinction

Git Pulse visualizes:

> Geographic activity intensity.

It does not visualize:

> Individual commits or individual developers.

---

## Current implementation tracking

### Completed

- [x] Product definition
- [x] PRD
- [x] SRS
- [x] Data contract
- [x] Architecture
- [x] API contract
- [x] UI specification
- [x] ADRs
- [x] Roadmap
- [x] AI agent workflow
- [x] Week 1 — Foundation (repository structure, backend, frontend, Docker Compose, env config, health endpoint)
- [x] Week 2 — Globe Engine (Earth, atmosphere, stars, lighting, camera, coordinate conversion, fake activity pulses, intensity levels, capped effects)
- [x] Week 3 — GitHub Ingestion (config, Events API client, ETag/304, X-Poll-Interval, retry/backoff, rate-limit tracking, validation, deduplication, ActivityEvent normalization, polling scheduler, 42 unit tests)
- [x] Week 4 — Normalization hardening (fetch timeout via AbortController, true-LRU deduplication, network-error ETag result fix, restored scheduler test assertions; 43 tests)
- [x] Week 5 — Enrichment (location catalog + deterministic resolver with RESOLVED/AMBIGUOUS/MISSING/INVALID states, language normalization, TTL cache with single-flight + LRU bounds, GitHub user/repo metadata client sharing ingestion config, enrichment pipeline with no-fabrication guarantees; 70 tests)
- [x] Week 6 — Database + Aggregation (SQL migrator with schema_migrations tracking, activity_events with UNIQUE(source, source_event_id) + SRS §11 indexes, activity_buckets with composite PK, 15-min UTC bucketing keyed on eventTime, idempotent upserts, 24h retention, live-DB integration tests against docker postgres; 95 tests)
- [x] Week 7 — REST API (GET /api/activity, GET /api/stats, GET /api/locations; 24-hour range and filter validation; visualization-ready response shaping; parameterized database reads; database failures return non-leaking 503 responses; route contract tests)
- [x] Week 8 — Real Data → Globe (pipeline → PostgreSQL persistence → 15-min aggregation → 24h retention wired into the poll scheduler; migrations auto-run at startup; frontend fetches /api/activity + /api/locations and drives globe pulses from real aggregates; unknown locations dropped, never fabricated; fake data demoted to dev preview; 112 backend + 4 frontend tests)
- [x] Week 9 — WebSocket + Live (LiveHub WS server at /api/live using `ws` directly — @fastify/websocket type augmentation does not merge under fastify 5.12/skipLibCheck; heartbeat with grace period, exponential-backoff reconnect, Redis hot state mirroring live aggregate updates, backend live.hub/hotState suites, frontend useLiveSocket hook with stub-guarded test, useGlobeActivity merges live increments between REST refreshes, e2e smoke green)
- [x] Week 10 — 24-Hour Timeline (frontend replay over stored buckets: 96 grid-aligned 15-minute UTC slots, play/pause/scrub/current-time/return-to-LIVE, LIVE↔REPLAY modes sharing the Week 8 live view; replay never queries GitHub; 15 frontend tests)
- [x] Week 11 — Filters + Search (language/activityType selects flow into both live REST polling and timeline replay fetches; location search over plot-ready catalog-backed locations with smooth damped camera fly-to; filters serialize to documented /api/activity parameters; 18 frontend tests)
- [x] Week 12 — Performance + LOD (single InstancedMesh pool of 500 — one draw call, zero per-frame allocation; global/regional/city LOD tiers with intensity-sorted selection; horizon visibility culling; deterministic per-location pulse phase; FPS instrumentation overlay; vendor chunk splitting — app bundle 1119→16.5 kB, three/react cached separately; 25 frontend tests)
- [x] Week 13 — Visual polish + final QA (GLB candidate evaluated and rejected — see CHANGELOG; frame-rate-independent fly-to damping; dead code removed — StarField ref, CityPulse.tsx deleted; restrained UI polish — compact translucent header/footer/timeline with backdrop blur, header stats line, search-result shadow; full QA gate: typecheck/tests/build/E2E/secrets/contract checks green, fake data verified dev-only-gated, Week 12 performance architecture intact)
- [x] Prototype globe integration (2026-09-15) — standalone gitpulse-main visual engine adopted into apps/frontend: textured day/night Earth, aligned night lights, clouds, atmosphere, stars, real-time sidereal rotation, spherical fly-to tracking the rotating Earth group; prototype coordinate frame (0°→+Z) adopted inside the globe after audit found the old app frame mirrored; app data stays plain lat/lon so no API/data-contract change. Week 12 performance architecture preserved (InstancedMesh 500 cap, LOD 80/240/500 via ref, pooling, FPS overlay). User's manual UI changes (sidebar layout, styles, space background, camera tuning) preserved. Visual on-screen checks (city placement, day/night, 60 FPS) NOT VERIFIED — no browser/GPU in the agent environment.
- [x] Visual QA pass (2026-09-15) — browser-reported issues fixed: polar seam line root-caused to ClampToEdge UV wrapping at the ±180° meridian (both textures now RepeatWrapping); location search expanded to the full /api/locations catalog (zero-activity cities searchable, active/inactive badges, fly-to on inactive never fabricates activity); atmosphere toned to a subtle limb glow; cloud layer made subtly visible; FPS overlay gated to dev builds. Full verification green (frontend 27/27 + build; backend 109 + 20/20 live-DB + build; E2E with live data). On-screen re-confirmation of the seam/atmosphere/clouds remains with the user.

### In progress

None.

### Blocked

None.

### Known deviations

- `DATABASE_URL` default uses host port 5433 (docker-compose mapping); host port 5432 is occupied by a machine-local PostgreSQL 17 service (documented since Week 1).
- Week 13 corrective fix: enrichment stage was originally missing from the live ingestion path (events persisted unenriched, buckets all 'unknown'). Now wired via `persistEnrichedResult` (`db/storage.ts`) with deps created once in `index.ts`; verified by `test/storage.enriched.test.ts`. Post-fix live evidence: language enrichment lands (56/90 events); profile-location resolution executes but currently yields 0 matches against the 12-city catalog — rows predating the fix remain unenriched.
- 2026-09-15: an evidence-based catalog expansion (12→68 curated cities, driven by a 1000-unique-event location experiment in `data/experiments/github/2026-09-12/`) hardened `locationResolver.ts` (comma-spacing normalization, `city region` two-token and `city, region, country` multi-part forms, explicit country-synonym/state-qualifier aliases; bare contradictions like "Paris, Texas" deliberately stay unresolved).

### Test status

Canonical `npm test`: 110 backend tests passing across 23 files, 15 database-dependent tests skipped by default, and 27 frontend vitest tests passing. With Docker Compose PostgreSQL and Redis running, `RUN_DB_INTEGRATION_TESTS=true` passes all 120 backend tests across 22 files, including the live database, storage-wiring (incl. enriched persistence), and REST API suites. `npm run lint`, `npm run typecheck`, and `npm run build` pass in both workspaces with no warnings. E2E smoke (`apps/backend/scripts/e2e-check.mjs`): /health postgres+redis up, /api/stats, /api/locations, /api/activity all 200; verified against real ingested data with enrichment active on the production path.

### Deployment status

Not deployed. Local verification only. Graceful shutdown (SIGTERM/SIGINT: scheduler stop → hub close → Fastify close → pool end) implemented for process-manager readiness.