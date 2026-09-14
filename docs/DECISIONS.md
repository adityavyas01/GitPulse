# Git Pulse — Architecture Decisions

Do not delete previous decisions.

If a decision changes, add a new ADR that supersedes the old one.

---

# ADR-001 — Product name

Decision:

Git Pulse.

Reason:

Final product naming decision.

---

# ADR-002 — Activity events instead of commits

Decision:

ActivityEvent is the product's fundamental visualization unit.

Reason:

The product is about global software activity, not commit forensics.

Consequences:

- PushEvent remains one activity.
- Commit counts are unnecessary.
- Files are unnecessary.
- Lines are unnecessary.

---

# ADR-003 — No identity interaction

Decision:

Activity visualization is not clickable for developer identification.

Reason:

Identity is unnecessary to the product experience.

---

# ADR-004 — Profile location

Decision:

Use public GitHub profile location.

Reason:

GitHub exposes a location string rather than verified physical coordinates.

Consequence:

Never imply exact physical location.

---

# ADR-005 — Coordinates belong to locations

Decision:

Latitude/longitude belong to location records.

Reason:

The same city is reused by many activities.

This reduces duplication and prevents false event-level precision.

---

# ADR-006 — Repository language

Decision:

Language means repository language metadata.

Reason:

The event itself does not reliably tell us the exact language changed.

---

# ADR-007 — 24-hour retention

Decision:

Maximum activity retention is 24 hours.

Reason:

The product only requires current activity and 24-hour replay.

---

# ADR-008 — 15-minute buckets

Decision:

Initial aggregation uses 15-minute buckets.

Reason:

24 hours produces 96 buckets, providing useful temporal resolution without excessive data.

---

# ADR-009 — Live terminology

Decision:

Use "live", not "real-time", in product-facing language.

Reason:

GitHub public Events API is a polling source with possible delivery delay.

---

# ADR-010 — PostgreSQL

Decision:

PostgreSQL for V1 activity storage and aggregates.

Reason:

24-hour retention and expected V1 scale do not justify distributed storage.

---

# ADR-011 — Redis

Decision:

Redis for cache and hot/live state.

Reason:

Fast access to frequently changing data.

---

# ADR-012 — Aggregate before fan-out

Decision:

WebSocket messages contain aggregate updates.

Reason:

Raw event × client fan-out is unnecessary and scales poorly.

---

# ADR-013 — Aggregate before rendering

Decision:

Frontend renders aggregate geographic state.

Reason:

Backend event volume and GPU object count are different problems.

---

# ADR-014 — Simple V1

Decision:

Single backend deployment.

Reason:

Build the product before solving hypothetical scale.

---

# ADR-015 — V2 scaling

Decision:

Add horizontal scaling only when measurements justify it.

Potential additions:

- load balancing
- multiple API instances
- multiple WebSocket instances
- workers
- Redis pub/sub

---

# ADR-016 — V3 distributed architecture

Decision:

Kafka and multi-region architecture are reserved for genuine large-scale requirements.

Reason:

Premature distributed architecture adds complexity without improving the V1 product.