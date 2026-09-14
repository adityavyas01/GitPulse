# Git Pulse — Layered Implementation Roadmap

Expected AI-assisted development:

12–16 weeks at approximately 15–20 hours/week.

Full-time alternative:

Approximately 8–10 weeks.

The roadmap is dependency-driven.

Each layer must produce a stable foundation for the next layer.

---

# MILESTONE 0 — BLUEPRINT

## Week 0 — Specification

Finalize:

- PRD
- SRS
- architecture
- data contract
- API contract
- UI specification
- ADRs
- project state
- AI workflow

Definition of done:

The complete system can be explained consistently from:

GitHub source → globe.

---

# MILESTONE 1 — THE MACHINE EXISTS

## Week 1 — Foundation

Build:

- repository structure
- frontend
- backend
- TypeScript
- Fastify
- PostgreSQL
- Redis
- Docker
- environment configuration
- logging
- health endpoint

Output:

Frontend → backend → database/cache works locally.

---

## Week 2 — Globe Engine

Build:

- Earth
- atmosphere
- stars
- lighting
- camera
- orbit
- zoom
- geographic coordinate conversion
- fake city locations
- activity pulses

Output:

A beautiful globe with fake activity.

Do not connect real GitHub data yet.

---

## Week 3 — GitHub Ingestion

Build:

- GitHub authentication
- Events API fetcher
- ETag
- If-None-Match
- X-Poll-Interval
- retry
- backoff
- rate-limit metrics

Output:

Real GitHub events enter the backend.

---

## Week 4 — Normalization

Build:

- event validator
- event-type mapper
- ActivityEvent
- unknown event handling
- deduplication

Output:

GitHub JSON → canonical ActivityEvent.

---

# MILESTONE 2 — THE DATA WORKS

## Week 5 — Enrichment

Build:

- user cache
- repository cache
- public profile location extraction
- location normalization
- location resolver
- location catalog
- repository language resolver

Output:

ActivityEvent → location + language.

---

## Week 6 — Database + Aggregation

Build:

- database migrations
- activity_events
- activity_buckets
- indexes
- 15-minute aggregation
- 24-hour cleanup

Output:

24-hour activity history can be queried.

---

## Week 7 — REST API

Build:

- GET /api/activity
- GET /api/stats
- GET /api/locations
- validation
- response shaping

Output:

Frontend can consume real visualization-ready data.

---

# MILESTONE 3 — THE PRODUCT WORKS

## Week 8 — Real Data → Globe

Replace fake data.

Connect:

API → visualization model → globe.

Output:

Real GitHub activity appears geographically.

---

## Week 9 — WebSocket + Live

Build:

- Redis hot state
- WebSocket
- heartbeat
- reconnect
- aggregated updates

Output:

Globe updates without browser refresh.

---

## Week 10 — 24-Hour Timeline

Build:

- play
- pause
- scrub
- current time
- 24-hour replay
- return to LIVE

Output:

The previous 24 hours can be replayed.

---

## Week 11 — Filters + Search

Build:

- language filter
- activity filter
- combined filters
- location search
- camera fly-to

Output:

User can meaningfully explore the globe.

---

# MILESTONE 4 — THE PRODUCT IS GOOD

## Week 12 — Performance + LOD

Build:

- global LOD
- regional LOD
- city LOD
- instancing
- object pooling
- capped particles
- visibility control
- performance instrumentation

Target:

Approximately 60 FPS on a modern desktop under normal conditions.

---

## Week 13 — Visual Polish

Polish:

- Earth material
- atmosphere
- lighting
- city pulses
- particles
- camera easing
- typography
- spacing
- cards
- filters
- timeline
- transitions
- loading states
- error states

---

## Week 14 — Reliability + Testing

Test:

- GitHub outage
- 304 responses
- rate limits
- duplicates
- delayed events
- malformed events
- location failures
- language failures
- PostgreSQL load
- Redis failure
- WebSocket reconnect
- high activity
- timeline
- filters
- search
- frontend performance

---

## Week 15 — Deployment

Build:

- Docker deployment
- frontend hosting
- backend hosting
- PostgreSQL
- Redis
- HTTPS
- secrets
- CORS
- health checks
- logs
- monitoring

Output:

Another person can open the deployed product.

---

## Week 16 — Buffer + Portfolio

Use for:

- bugs
- performance
- UX
- documentation
- screenshots
- architecture diagram
- README
- demo preparation
- portfolio presentation

---

# Weekly completion rule

A week is NOT complete merely because code exists.

A week is complete when:

1. functionality works
2. relevant tests pass
3. documentation matches implementation
4. PROJECT_STATE.md is updated
5. CHANGELOG.md is updated
6. next layer has a stable input

---

# Vertical checkpoints

Week 4:

GitHub JSON → ActivityEvent.

Week 6:

ActivityEvent → 24-hour aggregates.

Week 8:

Aggregates → globe.

Week 9:

New activity → globe without refresh.

Week 10:

24-hour replay.

Week 11:

Filters + search + timeline.

Week 12:

Measured performance + LOD.

Week 15:

Deployed product.