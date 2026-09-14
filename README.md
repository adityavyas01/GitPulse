# Git Pulse

## Watch the world build software.

Git Pulse is a live visualization of public GitHub activity happening around the world.

It uses a 3D globe to visualize geographic activity intensity through cities, regions, languages, activity types, and a 24-hour timeline.

---

## Product philosophy

Git Pulse is not GitHub Analytics.

The goal is not to inspect individual commits.

The goal is to make global software activity visually understandable.

The user should open the application and immediately understand:

> The world is building software.

---

## Core experience

Open Git Pulse.

See the Earth.

See activity appearing around cities.

Zoom toward a region.

See more geographic detail.

Filter by language.

Filter by activity type.

Scrub through the previous 24 hours.

Return to LIVE.

---

## V1 boundaries

Git Pulse does not:

- expose individual developers
- expose individual commits
- expose changed files
- expose lines changed
- identify exact developer locations
- provide private GitHub information
- provide long-term historical analytics

---

## Core architecture

GitHub
→ Event Fetcher
→ Validation
→ Deduplication
→ Enrichment
→ Normalization
→ Aggregation
→ Redis/PostgreSQL
→ REST/WebSocket
→ React/R3F/Three.js
→ 3D Globe

---

## Repository documentation

Read `AGENTS.md` before working on the project.

Important documentation:

- `docs/PRD.md` — product requirements
- `docs/SRS.md` — technical requirements
- `docs/DATA_CONTRACT.md` — data semantics
- `docs/ARCHITECTURE.md` — system architecture
- `docs/API_CONTRACT.md` — frontend/backend boundary
- `docs/UI_SPEC.md` — visual specification
- `docs/ROADMAP.md` — implementation plan
- `docs/DECISIONS.md` — architectural decisions
- `docs/PROJECT_STATE.md` — current implementation state
- `docs/TESTING.md` — testing strategy

---

## AI-assisted development

This project is intentionally built using AI coding agents.

Repository documentation is therefore treated as persistent project memory.

Important decisions must never exist only inside a chat conversation.

If an architectural or product decision changes, update the appropriate documentation.