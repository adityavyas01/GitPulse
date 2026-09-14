# Git Pulse — Testing Strategy

# Unit tests

## GitHub adapter

Test:

- common event parsing
- event type mapping
- missing fields
- unknown event types

## Normalization

Test:

- PushEvent
- PullRequestEvent
- IssuesEvent
- ReleaseEvent
- other supported events
- invalid events

## Deduplication

Test:

- same source + same event ID
- different source + same event ID
- repeated rolling polls

## Location

Test:

- known city
- country-only location
- ambiguous location
- missing location
- invalid location

## Language

Test:

- known language
- missing language
- normalization

## Aggregation

Test:

- bucket boundaries
- multiple events
- locations
- languages
- activity types

## Retention

Test:

- exactly 24 hours
- older than 24 hours
- future/skewed timestamps

---

# Integration

Test:

GitHub JSON
→ fetch
→ validate
→ deduplicate
→ enrich
→ normalize
→ PostgreSQL
→ aggregate
→ REST

The PostgreSQL-backed integration suites run when `RUN_DB_INTEGRATION_TESTS=true`. They use `TEST_DATABASE_URL` when set, otherwise the Docker Compose PostgreSQL test connection. The API route unit suite remains deterministic and covers response shaping and database failure behavior without requiring a live database.

---

# WebSocket

Test:

- connection
- heartbeat
- reconnect
- updates
- multiple clients
- burst handling
- backpressure

---

# Frontend

Test:

- initial API state
- WebSocket updates
- filters
- timeline
- search
- camera targets

---

# Rendering

Measure:

- FPS
- draw calls
- visible city count
- active effects
- memory
- camera smoothness

---

# Failure testing

Simulate:

- GitHub unavailable
- 304
- rate limit
- slow GitHub response
- malformed event
- duplicate
- missing location
- Redis unavailable
- PostgreSQL unavailable
- WebSocket disconnect

---

# Load testing

Engineering scenarios:

- 10k events/day
- 100k events/day
- 1M events/day
- increasing WebSocket clients
- API concurrency
- ingestion bursts
- aggregation bursts

These are design scenarios, not claims about total GitHub activity.

---

# Technical quality

A feature is not complete because it "works".

Verify:

- correctness
- contract compliance
- performance
- failure behavior
- observability
- maintainability