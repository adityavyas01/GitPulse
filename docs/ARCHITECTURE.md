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