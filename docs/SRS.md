# Git Pulse — Software Requirements Specification

**Version:** 1.0  
**Status:** Final baseline

---

# 1. Architecture

V1:

GitHub Events API
→ Event Fetcher
→ Validation
→ Deduplication
→ Enrichment
→ Normalization
→ Aggregation
→ Redis + PostgreSQL
→ REST + WebSocket
→ React + R3F + Three.js

---

# 2. Technology stack

## Frontend

- React
- TypeScript
- React Three Fiber
- Three.js
- Zustand

## Backend

- Node.js
- TypeScript
- Fastify

## Storage

- PostgreSQL
- Redis

## External API

- GitHub REST API

## Communication

- REST
- WebSocket

---

# 3. GitHub ingestion

The Event Fetcher:

1. polls the public GitHub Events API
2. uses authentication
3. supports ETag
4. sends If-None-Match
5. respects X-Poll-Interval
6. handles 304 responses
7. retries transient failures
8. applies backoff
9. records metrics
10. keeps GitHub credentials server-side

The Events API is not a true real-time stream.

---

# 4. Event validation

Required common fields:

- id
- type
- actor
- repo
- created_at

Invalid events are rejected and counted.

---

# 5. Deduplication

Unique identity:

`source + source_event_id`

Database constraint:

`UNIQUE(source, source_event_id)`

Rolling GitHub polling may return an event multiple times.

Duplicates must not create duplicate activity records.

---

# 6. User enrichment

For each event actor:

- obtain GitHub user ID
- obtain username
- obtain public profile location

Use cache-first access.

Do not request user metadata for every event.

The cache must significantly reduce repeated GitHub API requests.

---

# 7. Repository enrichment

For each repository:

- repository ID
- repository name
- language metadata

Use cache-first access.

Do not request repository metadata for every event.

---

# 8. Location resolution

Pipeline:

profile location string
→ normalize
→ resolve known location
→ locationId

Resolution states:

- RESOLVED
- AMBIGUOUS
- MISSING
- INVALID

If unresolved:

- retain activity
- allow global statistics
- do not plot geographic activity for that event

Never invent coordinates.

---

# 9. Canonical ActivityEvent

```json
{
  "id": "github_22249084964",
  "source": "github",
  "eventType": "PUSH",
  "eventAction": null,
  "eventTime": "2026-09-03T10:15:20Z",
  "ingestedAt": "2026-09-03T10:15:45Z",
  "userId": 583231,
  "repositoryId": 1296269,
  "locationId": "blr",
  "languageId": "python"
}

eventTime:

Time supplied by GitHub for the event.

ingestedAt:

Time Git Pulse received the event.

# 10. Database schema
users
id
github_user_id
username
location_id
created_at
updated_at
repositories
id
github_repo_id
name
primary_language_id
created_at
updated_at
locations
id
city
country
latitude
longitude
languages
id
name
normalized_name
activity_events
id
source
source_event_id
event_type
event_action
event_time
ingested_at
user_id
repository_id
location_id
language_id
activity_buckets
bucket_start
location_id
language_id
event_type
event_count

Primary key:

bucket_start + location_id + language_id + event_type

11. Database indexes

Initial indexes:

activity_events(event_time)
activity_events(event_time, location_id)
activity_events(event_time, language_id)
activity_events(event_time, event_type)
UNIQUE(source, source_event_id)

Do not introduce partitioning prematurely.

12. Retention

Delete:

activity_events older than 24 hours
activity_buckets older than 24 hours

V1 may use indexed cleanup.

Partitioning may be introduced only if cleanup becomes a measured bottleneck.

13. Redis

Redis stores:

user cache
repository cache
hot activity aggregates
live city counters
current global statistics

Redis is not the permanent activity archive.

Activity-related keys should have appropriate TTLs.

14. Aggregation

Initial bucket:

15 minutes.

Dimensions:

time
location
language
event type

Example:

Bengaluru × Python × Push × 10:00–10:15 = 42

15. REST API
GET /api/activity

Parameters:

from
to
language
activityType
location

Maximum range:

24 hours.

Response must be visualization-ready.

It must not contain raw GitHub JSON.

GET /api/stats

Returns:

activities
active locations
top language
busiest city
activity breakdown
GET /api/locations

Returns:

locationId
city
country
latitude
longitude
16. WebSocket

Endpoint:

WS /api/live

The WebSocket sends compact aggregate updates.

Example:

{
  "timestamp": 1756890000,
  "updates": [
    {
      "locationId": "blr",
      "count": 12
    },
    {
      "locationId": "sfo",
      "count": 8
    }
  ]
}

Do not broadcast raw GitHub events.

Do not expose developer identity.

17. Frontend state

Separate:

UI state
filters
timeline
playback
search
camera target
Globe state
visible locations
activity intensity
LOD
active effects
camera/rendering state

Zustand may manage application state.

18. LOD
L0

Global/region/country.

L1

City.

L2

Local aggregate activity.

Never render all historical raw events as permanent objects.

19. Failure handling
GitHub unavailable
preserve recent Redis state
serve cached data
show delayed status
Location unavailable
retain activity
omit geographic rendering
Language unavailable
retain activity
use UNKNOWN
Redis unavailable
degrade hot/live behavior
use database for critical reads
PostgreSQL unavailable
continue from Redis where possible
recover persistence when DB returns
20. Security
GitHub secrets remain server-side
CORS restrictions
request validation
API rate limits
WebSocket controls
request size limits
HTTPS in deployment
no secrets in frontend
21. Observability

Track:

poll success/failure
rate-limit remaining
events received
events deduplicated
events rejected
events processed
user-cache hit rate
repository-cache hit rate
location resolution rate
Redis latency
PostgreSQL latency
WebSocket connections
WebSocket messages
outbound bandwidth
frontend FPS
active visual objects
22. Testing

Unit tests:

normalization
event mapping
validation
location resolution
language normalization
deduplication
aggregation
retention

Integration:

GitHub JSON
→ processor
→ DB
→ aggregate
→ API

WebSocket:

connect
reconnect
heartbeat
updates
multiple clients
burst handling

Rendering:

globe
camera
LOD
high activity
filters
timeline
search

Load:

ingestion bursts
API concurrency
WebSocket concurrency
Redis
PostgreSQL

---

# 10. `docs/DATA_CONTRACT.md`

```md

---

# 12. `docs/API_CONTRACT.md`

```md


---

# 13. `docs/UI_SPEC.md`

```md
