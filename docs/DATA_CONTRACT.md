# Git Pulse — Data Contract

## Core principle

GitHub raw JSON ends at the source adapter.

Everything downstream uses Git Pulse normalized data.

---

# 1. Raw event boundary

The GitHub adapter may consume:

- id
- type
- actor
- repo
- payload
- public
- created_at

Event-specific payload fields may be interpreted when required for normalization.

Raw payloads must not leak into frontend contracts.

---

# 2. User data

Source:

GitHub public user API.

Relevant:

`location`

Meaning:

Public self-reported profile location.

It is not verified GPS.

---

# 3. Repository data

Source:

GitHub repository metadata.

Relevant:

- repository ID
- name
- language metadata

Meaning:

Repository language metadata.

It is not guaranteed to describe the exact event.

---

# 4. Location

```text
Location
---------
id
city
country
latitude
longitude

Coordinates are stored once.

Events reference:

locationId

5. ActivityEvent
{
  "id": "github_<source_event_id>",
  "source": "github",
  "eventType": "PUSH",
  "eventAction": null,
  "eventTime": "ISO-8601",
  "ingestedAt": "ISO-8601",
  "userId": 123,
  "repositoryId": 456,
  "locationId": "blr",
  "languageId": "python"
}
6. Activity semantics

One GitHub event = one Git Pulse activity unit.

PushEvent is not expanded into:

commits
files
lines
individual commit languages
7. Aggregated data

Example:

{
  "bucketStart": "2026-09-03T10:00:00Z",
  "locationId": "blr",
  "count": 42,
  "languages": {
    "python": 20,
    "javascript": 12
  }
}

Exact transport shape can evolve.

Semantics cannot silently change.

8. Frontend data

Frontend needs:

location IDs
counts
language dimensions
activity dimensions
timestamps/buckets

Coordinates may be loaded from the location catalog.

Raw GitHub JSON is unnecessary.

9. Missing data

Never fabricate:

location
coordinate
language
event metadata

Use:

NULL
UNKNOWN
AMBIGUOUS
MISSING

as appropriate.

10. Time

Always preserve:

eventTime

and:

ingestedAt

Replay uses:

eventTime

Live display is driven by arrival/processing.

11. Retention

Activity records and aggregates have a maximum lifetime of 24 hours.


---

# 11. `docs/ARCHITECTURE.md`

```md
# Git Pulse — Architecture

# V1

```text
GitHub
  |
  v
Public Events API
  |
  v
Event Fetcher
  |
  v
Validation
  |
  v
Deduplication
  |
  +------------------+
  |                  |
  v                  v
User Cache       Repository Cache
  |                  |
location           language
  |                  |
  +--------+---------+
           |
           v
Location Resolver
           |
           v
Normalization
           |
           v
Aggregation
      /          \
     v            v
  Redis       PostgreSQL
     |            |
     v            v
WebSocket       REST
     \            /
      \          /
       v        v
       React + R3F
           |
           v
        Three.js
           |
           v
        3D Globe
Architectural boundaries
Source adapter

Understands GitHub JSON.

Normalized event layer

Understands Git Pulse ActivityEvent.

Enrichment

Resolves:

user location
repository language
Aggregation

Transforms activity into:

time × location × language × activity type

Storage

Redis:

hot/live data and cache.

PostgreSQL:

recent activity and aggregates.

Delivery

REST and WebSocket.

Frontend

Consumes visualization-ready data.

It does not need GitHub-specific schemas.

V1 deployment
one backend deployment
PostgreSQL
Redis
frontend deployment
Docker
managed database/cache where practical

Do not introduce distributed infrastructure merely for architectural theater.

V2

When measured bottlenecks require scaling:

load balancer
multiple API instances
multiple WebSocket instances
independent workers
Redis pub/sub/backplane
independently scaled ingestion/processing
V3

Only when genuinely required:

Kafka/event streaming
multi-region processing
regional caches
multiple WebSocket clusters
distributed/replicated storage
global routing/failover
Important scaling principle

Backend event volume is not the same as frontend rendering load.

A million backend events do not mean a million GPU objects.

Aggregate before visualization.

Rendering

The browser should render:

geographic states
city markers
controlled pulses
capped short-lived effects

It should not render every raw event.

Engineering test scenarios

Use:

10k events/day
100k events/day
1M events/day

These are engineering scenarios, not claims about total GitHub traffic.

At approximately 500 bytes per normalized event before database overhead:

10k/day ≈ 5 MB
100k/day ≈ 50 MB
1M/day ≈ 500 MB

24-hour retention keeps V1 storage manageable under these scenarios.

WebSocket principle

Never broadcast raw activity independently to every browser.

Aggregate first.

Fan out compact state changes.

Rendering principle

Use:

LOD
instancing
object pooling
capped particles
visibility control
aggregation
