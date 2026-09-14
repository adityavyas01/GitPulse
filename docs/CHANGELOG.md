# Git Pulse — Changelog

All meaningful project changes should be recorded here.

---

# 2026-09-11 — Week 13: Visual Polish + Final QA

Implemented Milestone 4 / Week 13 (final planned roadmap stage) per ROADMAP.md and UI_SPEC:

**Post-completion corrective fix — enrichment wired into the live ingestion path.**
A production diagnostic found that the Week 5 enrichment stage (enrichEvents) had no production
caller: the Week 8 scheduler callback persisted result.accepted directly, so every persisted row
had NULL location_id/language_id and activity_buckets aggregated entirely under the 'unknown'
sentinel (verified: 1110 events, 0 resolved, buckets 100% unknown).
Fix (no architecture/contract changes): `db/storage.ts` adds persistEnrichedResult (enrich then
persist; enrichment failure falls back to unenriched persistence so no valid event is lost);
`index.ts` creates createEnrichmentDeps once at startup (TtlCache + single-flight preserved) and
persists via persistEnrichedResult; WS/Redis broadcast now uses the enriched events as persisted
(fixing a latent gap where broadcast counts were computed from pre-enrichment events and were
therefore always empty).
Tests: new `test/storage.enriched.test.ts` (live-DB, 3 tests): enriched location_id ('sfo') and
language_id reach activity_events on the production path; missing metadata keeps both NULL with
the event retained; enrichment failure persists unenriched rather than discarding. Suite: 120/120
backend (22 files, live-DB included), 27/27 frontend, builds clean, E2E smoke green.
Verified against the running system (DB evidence, ~90 post-fix events): language enrichment lands
(56/90 non-null, 9+ distinct languages); location enrichment executes with profile-location
lookup active but 0 resolved — self-reported profile locations from the live GitHub sample do not
match the 12-city curated catalog (and user metadata fetches demonstrably succeed, since repo
language enrichment works on the same client). Existing pre-fix rows remain unenriched by design
(no re-enrichment mechanism; deliberately not invented). No catalog expansion, no debug endpoint,
no API contract change.

- **Earth GLB decision: rejected.** The candidate `public/assets/earth.glb` (7.9 MB embedded texture) requires the deprecated `KHR_materials_pbrSpecularGlossiness` extension (no native three.js GLTFLoader support), carries two FBX-conversion axis-swap matrices making lat/lon alignment unverifiable without visual inspection, adds ~8 MB runtime load versus the ~zero-cost existing material, and its use would couple the Week 12 instanced pulse layer (fixed frame) to the rotating Earth mesh — unverifiable here. Improving the existing implementation instead, per the evaluate-objectively instruction.
- Frame-rate-independent fly-to damping (`CameraFlyTo.tsx`): exponential smoothing `1 - exp(-rate·Δ)` replaces fixed per-frame lerp — identical feel at 60 FPS, correct at 144 Hz and under stutter.
- Dead code removed: `CityPulse.tsx` deleted (dead since Week 12; deletion policy previously blocked); `StarField.tsx` unused ref removed.
- Restrained UI polish (`styles.css`, `App.tsx`): compact translucent header/timeline/footer with backdrop blur so the globe reads as the visual center; header active-location stat line; search-result dropdown shadow for layer separation. No new decorative effects; Week 12 architecture untouched.
- QA gate: frontend typecheck + 27/27 tests; backend typecheck + 117/117 (live-DB included); both builds clean with no warnings; E2E smoke green against real ingested data (630 activity events, 19 buckets; unresolved locations aggregate as unknown — never fabricated); secrets sweep clean; no debug code; fake data verified dev-only-gated (`useFakeData=false` default, no production caller); Weeks 9/10/11 behavior intact (live-socket, timeline, filter suites all pass); API contract unchanged.
- Not physically verifiable in this environment: in-browser visual quality, 60 FPS on real GPU, GLB visual comparison. The shipped FPS instrumentation (`PerformanceOverlay`) is the intended tool for that verification on real hardware.

# 2026-09-11 — Week 12: Performance + LOD

Implemented Milestone 4 / Week 12 (Performance + LOD) per ROADMAP.md:

- `globe/effects/lod.ts`: pure, testable LOD core — global/regional/city tiers by camera distance (far ≤4.5R: 80 pulses, mid ≤2.4R: 240, near: 500), intensity-sorted capped selection (fixes the Week 2 review note that slice(0, N) took data-order first N), deterministic per-location FNV-1a phase (fixes Week 2 review issue B — same-x cities no longer pulse in sync), horizon front-facing test for visibility control.
- `globe/effects/ActivityLayer.tsx`: rewritten from per-city components to one InstancedMesh of fixed capacity 500 allocated once (object pooling, single draw call, zero per-frame allocation); LOD tier re-evaluated in the frame loop only on tier-boundary crossings; back-hemisphere instances scaled to zero each frame; per-instance colors from intensity levels.
- `globe/effects/performance.ts` + `PerformanceOverlay.tsx`: FPS instrumentation as an external store written in the frame loop and read by a DOM overlay outside the canvas (no React state in the render path).
- `vite.config.ts`: vendor chunk splitting — app bundle 1119 kB → 16.5 kB; `three` (733 kB) and `react` (367 kB) ship as separate cacheable chunks; warning limit raised to 800 kB with rationale (three.js is inherently large once split).
- `CityPulse.tsx` is now dead code (no importers — search-verified); file deletion is policy-blocked in this environment, left for manual removal.
- Tests: 7 new LOD tests (tier distance mapping and budget ordering, intensity-sorted selection, tier/global caps, deterministic phase stability, front/back-face visibility, limb tolerance).
- Verification: frontend typecheck + 25/25 tests, build exit 0 with no chunk warnings, backend typecheck + 102/102 regression (no backend changes). 60 FPS target not measurable in this environment (no headless GPU/browser) — instrumentation shipped so it can be verified on real hardware. `CityPulse.tsx` subsequently deleted during Week 13.

# 2026-09-11 — Week 11: Filters + Search

Implemented Milestone 3 / Week 11 (Filters + Search) per ROADMAP.md and UI_SPEC §9 + §7:

- `api/globeActivity.ts`: `ActivityFilters` + `filtersToQuery` serialize language/activityType into the documented `/api/activity` parameters ('all' emits nothing).
- `hooks/useTimeline.ts` owns filter state; filters flow into both the live REST polling (`useGlobeActivity` refetch on filter change, 60s cadence) and the timeline replay fetch.
- `globe/FilterSearchPanel.tsx`: language/activity selects (UI_SPEC §9 lists) and location search over currently visible (plot-ready) locations — search only ever offers catalog-backed, plottable locations, never fabricated ones.
- `globe/CameraFlyTo.tsx`: smooth damped camera fly-to to the selected location (per-frame lerp toward a fixed camera distance above the location; shares the camera with OrbitControls, so user interaction is preserved).
- `App.tsx` wires panel + fly-to target state; `styles.css` gains the filter panel/search results styles.
- Tests: 3 new `filtersToQuery` tests (empty/all emission, serialization, combined). Backend unchanged — the Week 7 API already accepts language/activityType parameters (verified by `api.routes.unit.test.ts` filter parameterization test).
- Verification: frontend typecheck + 18/18 tests, build exit 0, backend typecheck + 102 tests (117 with live-DB suites via Docker Postgres), secrets sweep clean. One transient parallel-load test timeout in `api.routes.unit.test.ts` did not reproduce in isolation or on full re-run.

# 2026-09-11 — Week 10: 24-Hour Timeline

Implemented Milestone 3 / Week 10 (24-Hour Timeline) per ROADMAP.md and UI_SPEC §8:

- `api/timeline.ts`: fetches the stored 24-hour bucket window from `/api/activity` (replay reads stored aggregates — no new GitHub queries) and aligns buckets onto 96 grid-aligned 15-minute UTC slots (UI_SPEC §8: 96 buckets). Slots share the Week 6 absolute 15-minute grid (`floor(t/15min)`), so API buckets map exactly. Unknown location ids are dropped (never plotted, never given coordinates); missing slots stay empty; slots sort by descending count.
- `hooks/useTimeline.ts`: playback state machine — play/pause (one slot per 400ms tick, wraps at window end), scrub, current slot time, return-to-LIVE. LIVE mode renders the Weeks 8–9 live/poll view unchanged; replay renders the selected historical slot.
- `globe/TimelineControls.tsx`: timeline strip (play/pause, range scrubber, UTC slot clock, LIVE button, loading/delayed status) styled to match the dark shell; header indicator switches LIVE ↔ REPLAY (amber in replay).
- `GlobeCanvas` now receives locations via props from the app-level data layer (live view or replay slot); its internal REST/WS hooks moved up into `useTimeline`.
- Tests: 10 new timeline tests — 96-slot alignment and grid times, correct slot placement, same-slot merging, empty-missing-slot (no fabrication), unknown-id drop, count sort, out-of-window/future rejection, unparseable range, UTC formatting. Two initial fixture bugs (non-grid-aligned times; a "future" bucket that floored into the window) were fixed in the tests to match real API data.
- Verification: frontend typecheck + 15/15 tests, build exit 0, backend typecheck + 102 tests green (no backend changes required — the existing /api/activity contract already serves ranged reads).

# 2026-09-11 — Week 9: WebSocket + Live

Implemented Milestone 3 / Week 9 (WebSocket + Live) per ROADMAP.md:

- Backend `live/hub.ts`: `LiveHub` WebSocket server on `/api/live` using `ws` directly. Chosen over `@fastify/websocket` because its v11 type augmentation does not merge with fastify 5.12 under `skipLibCheck` (module augmentation silently dropped); `ws` was already in the dependency tree. Emits compact aggregated updates (`{ type: 'live', updates: [{ locationId, count }] }`) — never raw GitHub payloads, never individual events.
- Heartbeat every 30s; clients silent for 90s (3 missed pongs) are terminated; the frontend socket reconnects with capped exponential backoff (1s→8s) and resyncs from the periodic REST refresh.
- Backend `live/hotState.ts`: each poll's aggregated location counts are mirrored to Redis hot state (bounded list per the Week 9 design); Redis unavailability degrades to WS-only broadcast with a logged warning.
- `index.ts`: aggregation happens before broadcast (aggregated location counts from accepted events → `LiveHub.broadcast` + Redis mirror). The hub attaches after `app.listen` and starts the heartbeat.
- Frontend `hooks/useLiveSocket.ts`: WS connect with heartbeat-aware reconnect and backoff. `hooks/useGlobeActivity.ts` now accepts live updates and merges them between REST refreshes — a location absent from the REST view is held with a count and no coordinates until the next refresh (never fabricates geography).
- Tests: `live.hotState.test.ts` (Redis round-trip, trimming, connection-failure rejection), `live.hub.test.ts` (broadcast payload shape, snapshot delivery, heartbeat termination), `useLiveSocket.test.ts` (side-effect-free import guard). Fixed wrong import path in the socket test (`../src/hooks/...` → `./...`).
- Verification: 117/117 backend tests (21 files, incl. live-DB suites with Docker Postgres), 5/5 frontend tests, typecheck + build exit 0 in both workspaces, E2E smoke green (health postgres+redis up, all API endpoints 200, zero fabricated rows with no GitHub token), secrets sweep clean.

# 2026-09-10 — Week 8: Real Data → Globe

Implemented Milestone 3 / Week 8 (Real Data → Globe) per ROADMAP.md:

- Backend: `db/storage.ts` wires accepted pipeline events into PostgreSQL — persist (`insertActivityEvents`), 15-minute aggregation (`aggregateIntoBuckets` + `upsertBuckets`), and 24-hour retention — invoked from the poll scheduler callback in `index.ts`. Storage failures are logged and swallowed so a database outage never crashes ingestion.
- `startServer` now runs SQL migrations on boot after Postgres connects; migration failure is logged and non-fatal.
- Config default `DATABASE_URL` corrected to host port 5433 (docker-compose mapping); 5432 is occupied by a machine-local PostgreSQL service (known deviation from Week 1).
- Fixed a broken compiled-output import in `routes/api.ts` (`../../src/enrichment/...` → `../enrichment/...`) that crashed only from `dist`.
- Frontend: `api/globeActivity.ts` fetches `/api/activity` + `/api/locations`, joins buckets with the location catalog, aggregates counts across time buckets, sorts by intensity, and drops location ids without a catalog record (never fabricates coordinates). `hooks/useGlobeActivity.ts` polls every 60s with abortable requests and keeps last-known data on failure. `GlobeCanvas` consumes the hook; the Week 2 fake dataset remains only as an explicit dev preview prop, never the production source.
- Vite dev proxy added (`/api` → `http://localhost:3000`).
- Tests: backend storage-wiring suite (no-op on empty, survives DB outage without throwing, live-DB persist+aggregate correctness); frontend data-join suite (catalog join/sort, unknown-location drop, cross-bucket aggregation, API failure propagation). Frontend `vitest` pinned to `^3.2.7` matching backend (avoids workspace hoisting conflicts); frontend `test` script now runs vitest.
- E2E verified in-process (`scripts/e2e-check.mjs`): `/health`, `/api/stats`, `/api/locations`, `/api/activity` all 200; migrations auto-applied on the real database; zero fabricated rows with no GitHub token configured.
- Verification: 112/112 backend tests (19 files, incl. live-DB suites), 4/4 frontend tests, typecheck and build exit 0 in both workspaces.

No architectural or contract changes — DECISIONS.md unchanged. No WebSocket, timeline, filters, or later roadmap functionality was introduced.

---

# 2026-09-09 — Week 7: REST API

Implemented Milestone 3 / Week 7 (REST API) per ROADMAP.md and API_CONTRACT.md:

- `routes/api.ts` registers `GET /api/activity`, `GET /api/stats`, and `GET /api/locations`.
- `db/queries.ts` reads PostgreSQL activity buckets and shapes them into visualization-ready time/location/language responses; statistics are calculated from the 24-hour aggregate window.
- Activity requests validate ISO timestamps, ordering, the 24-hour maximum range, and supported activity types. Filters are normalized and passed through parameterized queries.
- Database failures return a documented-safe 503 error without exposing SQL errors or stack traces. Location responses use the authoritative static catalog and never fabricate coordinates.
- `api.routes.unit.test.ts` covers successful activity/stat/location responses, filter parameterization, invalid ranges, and non-leaking database failures.
- Live database suites are opt-in with `RUN_DB_INTEGRATION_TESTS=true` so the canonical test command remains deterministic when Docker/PostgreSQL is unavailable. The route unit suite covers the API boundary without bypassing the PostgreSQL read layer.
- Backend test tooling was pinned to Vitest `^3.2.7`; the root `npm test` command now produces an unambiguous passing result in the current environment.

No architectural or contract changes — DECISIONS.md unchanged. No WebSocket, frontend integration, or later roadmap functionality was introduced.

Verified: canonical `npm test` (95 backend tests passing / 14 database-dependent tests skipped, frontend typecheck passing), `RUN_DB_INTEGRATION_TESTS=true npm test` (109/109 backend tests across 18 files, including live PostgreSQL REST/API integration), `npm run lint`, `npm run typecheck`, `npm run build`, and secret scan. Docker Compose PostgreSQL and Redis were healthy during live verification.

---

# 2026-09-03 — Specification baseline

Locked:

- Git Pulse product name
- Watch the world build software tagline
- activity-event abstraction
- no individual commit tracking
- no commit/file/line analytics
- no developer identity interaction
- profile-location-based geography
- location-owned coordinates
- repository-language semantics
- 24-hour activity retention
- 15-minute initial buckets
- live terminology instead of real-time
- PostgreSQL + Redis V1
- REST + WebSocket
- aggregation before fan-out
- aggregation before rendering
- L0/L1/L2 visualization strategy
- V1/V2/V3 architecture
- layered implementation roadmap
- AI-agent repository workflow

---

# 2026-09-05 — Week 6: Database + Aggregation

Implemented Milestone 2 / Week 6 (Database + Aggregation) per ROADMAP.md — 24-hour activity history can be queried:

- `migrations/001_init.sql` — schema per SRS §10-11:
  - `activity_events`: id (TEXT PK, `github_<id>`), source, source_event_id, event_type, nullable event_action, `event_time` and `ingested_at` as distinct TIMESTAMPTZ, nullable user/repository/location/language ids (never fabricated), `UNIQUE(source, source_event_id)` as the durable dedup backstop, no latitude/longitude columns (ADR-005).
  - `activity_buckets`: composite PK (bucket_start, location_id, language_id, event_type) per SRS §10; null enrichment dims aggregate under an `unknown` sentinel in buckets while raw rows keep real NULLs.
  - SRS §11 indexes: event_time; (event_time, location_id); (event_time, language_id); (event_time, event_type).
  - `schema_migrations` bookkeeping table.
- `db/migrator.ts` — deterministic ordered SQL migrator, transactional per file, idempotent (re-run applies nothing), no external tooling (ADR-014).
- `db/activityEvents.ts` — transactional insert with `ON CONFLICT (source, source_event_id) DO NOTHING`: repeated polls/retries never duplicate rows.
- `db/aggregation.ts`:
  - 15-minute bucketing (ADR-008) floored in UTC, never local time; bucket key uses eventTime per contract — not ingestion time.
  - Aggregation excludes events older than 24h and future-skewed events; boundary events (exactly 24h) included.
  - Idempotent upserts: repeated aggregation converges to true totals (DO UPDATE SET event_count).
  - 24h retention (ADR-007): deletes events by ingested_at, buckets by bucket_start; reference metadata tables untouched and persist.
- Tests: 25 new. Static contract tests assert schema requirements (uniqueness, TIMESTAMPTZ separation, nullable enrichment, no lat/lon columns, composite PK, SRS indexes). Live-database integration tests (against docker-compose PostgreSQL) verify migration-from-clean-DB, idempotent re-run, duplicate rejection, NULL enrichment fields, eventTime vs ingestedAt persistence, idempotent repeated aggregation, and retention-boundary deletion.

No architectural or contract changes — DECISIONS.md unchanged. Storage is PostgreSQL-only; Redis untouched (still reserved for hot/live state per architecture).

Verified: typecheck (both workspaces), 95/95 backend tests / 16 files, build (both workspaces). Integration tests provision a dedicated `gitpulse_test` database and clean up after themselves.

---

# 2026-09-05 — Week 5: Enrichment

Implemented Milestone 2 / Week 5 (Enrichment) per ROADMAP.md — ActivityEvent → location + language:

- `enrichment/locationCatalog.ts` — static curated location catalog (12 cities) with coordinates; coordinates live only here (ADR-005), never on events.
- `enrichment/locationResolver.ts` — deterministic profile-location resolution with the documented states RESOLVED / AMBIGUOUS / MISSING / INVALID (SRS §8): exact city match, curated aliases (Bangalore → Bengaluru etc.), city+country form; unknown/blank/null never resolve and never fabricate coordinates; no nearby-city substitution.
- `enrichment/language.ts` — repository-language normalization (lowercase/trim); null passthrough for missing metadata; known-language set for filtering. Language remains repo-level metadata (ADR-006), never the exact event language.
- `enrichment/cache.ts` — bounded TTL cache: LRU eviction, TTL expiry, null-result caching, and single-flight concurrent lookups (no N+1 GitHub requests).
- `enrichment/enrichmentClient.ts` — GitHub user/repository metadata via public REST API, cache-first; reuses ingestion config (token, timeout, Accept headers); 404/rate-limit/network failures degrade to null metadata — never throws, never loses events.
- `enrichment/enrich.ts` — enrichment pipeline: profile location → resolve → locationId on the event (or null when unresolved; event retained, not plotted); repo language → normalized languageId; per-stage stats.

Semantics preserved: no coordinates on ActivityEvent; unresolved events retained for global stats; no fabricated data; PushEvent still one activity.

Tests: 27 new (location resolver: normalization/diacritics/alias/city+country/missing/invalid/no-substitution; language: normalization/null/unknown; cache: hit/miss/single-flight/TTL expiry/LRU eviction/null caching; enrich: resolved/missing/ambiguous/blank location, missing language, API failure retention, no coordinates on event, no duplicate metadata requests). Suite: 70 tests / 12 files, all passing.

Engineering note: fixed a vitest workspace version drift (backend had invalid vitest@3.2.7 vs ^5.0.0 spec; reinstalled to align).

Verified: typecheck (both workspaces), 70/70 tests, build (both workspaces), no secrets in source.

---

# 2026-09-04 — Week 4: Normalization hardening

ROADMAP Week 4 scope (event validator, event-type mapper, ActivityEvent, unknown event handling, deduplication) was delivered as part of the Week 3 foundation per direction; this pass hardens it and incorporates the Week 3 review findings:

- Fetch timeout: `requestTimeoutMs` (default 15s, `GITHUB_REQUEST_TIMEOUT_MS`) added to `GithubConfig`; `poll()` uses `AbortController` so a hung GitHub connection can no longer stall the polling loop (`fetcher.ts`).
- Network-error ETag consistency: a failed request now reports the retained ETag (`etag: this.etag`) instead of null, matching the internal state — no consumer-facing ambiguity.
- True-LRU deduplication: `EventDeduplicator` now refreshes recency on re-sight (`isDuplicate`) and `add`, evicting the least-recently-seen key at the cap (Map insertion-order LRU). Naming now matches semantics.
- Restored scheduler test assertions softened during Week 3 (`pollsStarted`, `pollsFailed`); added a dedup LRU eviction-order test.

No architectural or contract changes — DECISIONS.md unchanged.

Verified: typecheck (both workspaces), 43/43 backend tests, build (both workspaces), no secrets in source.

---

# 2026-09-04 — Week 3: GitHub Ingestion

Implemented Milestone 1 / Week 3 (GitHub Ingestion) per ROADMAP.md — real GitHub events now enter the backend:

- `github/config.ts` — env-based GitHub configuration (optional `GITHUB_TOKEN` server-side only, API URL, poll floor, retry settings). Never hard-coded.
- `github/fetcher.ts` — Events API client: conditional requests via `ETag` / `If-None-Match`, `304 Not Modified` handling, `X-Poll-Interval` capture, rate-limit header tracking (`x-ratelimit-remaining`/`-reset`), graceful `403` rate-limited state, network/error resilience. ETag preserved across failures.
- `github/validate.ts` — validation of required common fields (id, type, actor, repo, created_at) per SRS §4; invalid events rejected with reason and counted.
- `github/normalize.ts` — raw GitHub event → canonical Git Pulse ActivityEvent (DATA_CONTRACT §5). One GitHub event = one activity (ADR-002); PushEvent never expanded into commits. `eventTime` (GitHub) preserved separately from `ingestedAt` (arrival). Unknown event types map to UNKNOWN, never dropped. locationId/languageId remain null until Week 5 enrichment — never fabricated.
- `github/dedupe.ts` — in-memory deduplication on (source, source_event_id) with LRU-style cap (50k), in-flight filter ahead of the Week 6 DB UNIQUE constraint.
- `github/pipeline.ts` — poll → validate → deduplicate → normalize with ingestion metrics (polls, 304s, received/rejected/deduplicated/normalized counts, rate-limit state).
- `github/scheduler.ts` — polling loop honoring X-Poll-Interval (with 60s config floor per GitHub guidance), exponential backoff retries (base × 2^n, capped by maxRetries) on transient errors/rate limits.
- Wired into backend startup (`index.ts`); `.env.example` documents all GitHub env vars.
- Tests: 42 unit tests across 8 files — config defaults/overrides/empty-token, validation of all required fields, normalization contract (eventTime vs ingestedAt, no commit expansion, UNKNOWN mapping, null location/language), dedup identity + cap, fetcher ETag/304/X-Poll-Interval/rate-limit/error paths with mocked fetch, pipeline status propagation, scheduler start/stop/304/retry-backoff with fake timers. No live GitHub dependency.

Engineering notes:

- Fixed a vitest workspace version conflict (frontend had a stray vitest@5 devDependency hoisting over backend's runner); backend pinned to vitest@^5.
- Scheduler no longer depends on a stale header value; X-Poll-Interval flows through pipeline results per cycle.

Verified: typecheck, all 42 tests, build (both workspaces) pass. No secrets in source (grep-verified; `.env` gitignored).

---

# 2026-09-04 — Week 2: Globe Engine

Implemented Milestone 1 / Week 2 (Globe Engine) with fake activity data — no real GitHub data yet (per ROADMAP.md):

- `latLonToVector3` geographic coordinate conversion (`globe/coordinates.ts`)
- Earth sphere with controlled rotation and tuned standard material
- Fresnel-style additive atmosphere shader (back-side halo)
- Static 2000-point starfield (allocated once)
- Lighting: ambient + key directional + cool rim directional; ACES tone mapping
- Camera: OrbitControls with damping, pan disabled, min/max zoom limits, eased rotation
- Fake city activity dataset (12 major cities) for visualization development
- CityPulse effects: intensity levels (low/medium/high/surge) per UI_SPEC section 5, normalized so extreme cities cannot destroy visual hierarchy
- ActivityLayer capped at 500 simultaneous pulses (aggregate-driven, one pulse per location, never per raw event)
- App shell updated: globe fills main area, LIVE indicator, aggregate-semantics footer

Dependencies added (frontend): `three`, `@react-three/fiber`, `@react-three/drei` — the stack mandated by SRS section 2.

Verified: `npm run typecheck` (both workspaces), `npm run test` (3/3), `npm run build` (production bundle 1.1 MB / 309 kB gzip; code-splitting deferred to Week 12 — Performance + LOD), built app served via `vite preview` (HTTP 200).

---

# 2026-09-03 — Week 1: Foundation

Implemented Milestone 1 / Week 1 (Foundation):

- npm workspaces monorepo: `apps/backend`, `apps/frontend`
- Backend: TypeScript (NodeNext, strict) + Fastify 5, pino logging
  - `GET /health` reporting postgres/redis dependency status
  - PostgreSQL (pg) and Redis connection modules with graceful degradation
  - `loadConfig` from environment (`PORT`, `LOG_LEVEL`, `DATABASE_URL`, `REDIS_URL`)
  - vitest unit tests for configuration loading
- Frontend: Vite + React 19 + TypeScript application shell (globe arrives Week 2)
- Docker Compose for PostgreSQL 16 and Redis 7
- `.env.example` environment template
- Root scripts: `build`, `typecheck`, `lint`, `test` across workspaces

Verified (Week 1 completion gate):

- `npm run typecheck` — both workspaces pass
- `npm run test` — backend vitest 3/3 passed; frontend typecheck pass
- `npm run build` — both workspaces pass (vite production bundle 193 kB / 61 kB gzip)
- Docker Compose end-to-end: postgres 16 + redis 7 healthy; backend `/health` = `{status: ok, postgres: up, redis: up}`; frontend build served via `vite preview` (HTTP 200)

Notes:

- Compose postgres host port changed 5432 → 5433 (`docker-compose.yml`, `.env.example`): the machine runs a local PostgreSQL 17 service that already owns 5432. To avoid forcing a choice between services, Compose maps 5433; set `DATABASE_URL` accordingly (see `.env.example`).
- `docker-compose.yml` `version:` key is obsolete under Compose v5 (warning only); left in place, harmless.