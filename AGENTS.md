# Git Pulse — AI Coding Agent Constitution

You are working on Git Pulse, a portfolio-grade software system.

The repository documentation is the persistent memory of the project.

Do not rely on conversation history when repository documentation can answer the question.

---

## 1. Mandatory reading

Before implementing or modifying anything, read:

1. `docs/PROJECT_STATE.md`
2. `docs/PRD.md`
3. `docs/SRS.md`
4. `docs/DATA_CONTRACT.md`
5. `docs/ARCHITECTURE.md`
6. `docs/ROADMAP.md`
7. `docs/DECISIONS.md`

When working in a specific area, also read:

- Backend/API → `docs/API_CONTRACT.md`
- Frontend/globe → `docs/UI_SPEC.md`
- Testing/reliability → `docs/TESTING.md`
- AI workflow → `docs/AI_WORKFLOW.md`

---

## 2. Product identity

Product name:

Git Pulse

Tagline:

Watch the world build software.

Product definition:

Git Pulse is a live visualization of public GitHub activity happening around the world.

---

## 3. Non-negotiable product constraints

Do NOT:

1. Rename the product.
2. Turn the product into generic GitHub analytics.
3. Track individual commits as a product feature.
4. Track files changed.
5. Track lines changed.
6. Track individual commit language.
7. Expose individual developers through the globe.
8. Make activity effects clickable for developer identity.
9. Claim exact physical developer locations.
10. Claim repository language is necessarily the language changed by an event.
11. Call GitHub Events API a true real-time stream.
12. Promise second-by-second updates.
13. Promise complete GitHub coverage.
14. Retain activity history beyond 24 hours.
15. Send raw GitHub JSON to the browser.
16. Store latitude/longitude redundantly on every event when a location record can provide them.
17. Add Kafka, Kubernetes, multi-region infrastructure, or similar distributed infrastructure to V1 without an explicit architectural decision.
18. Create unnecessary GitHub API requests.
19. Invent missing location, coordinates, language, or event information.
20. Render every raw event as a permanent Three.js object.

---

## 4. Product terminology

Use:

- LIVE
- Activity updates continuously
- Activities
- Active locations
- Busiest city
- Top language

Avoid:

- real-time
- zero latency
- programmers currently coding
- exact developer location
- exact commit language

---

## 5. Data principles

GitHub is the first external producer.

The stable internal boundary is the normalized Git Pulse ActivityEvent.

GitHub-specific JSON must remain inside the ingestion/source-adapter boundary.

Downstream systems consume normalized Git Pulse data.

Future sources such as GitLab must adapt into the same normalized model instead of forcing GitHub-specific assumptions throughout the system.

---

## 6. Geography

GitHub profile location is a public, self-reported location string.

It is not verified GPS.

Location processing:

profile location string
→ normalization
→ known location resolution
→ locationId

Latitude/longitude belong to the location record.

Do not attach independently generated coordinates to every activity event.

Never fabricate coordinates.

---

## 7. Language

Language means repository language metadata.

It does NOT mean:

- exact language of the push
- exact language of a commit
- exact language changed by the developer

---

## 8. Activity semantics

One GitHub event becomes one normalized activity unit.

A PushEvent remains one activity event.

Do not expand PushEvents into:

- commits
- files
- lines
- individual commit languages

unless V1 scope is explicitly changed.

---

## 9. Visualization

The globe visualizes aggregate geographic activity.

The visual system may use:

- city pulses
- glow
- intensity
- short-lived particles
- animated effects

These are representations of activity intensity.

They must not imply:

- one particle = one commit
- one particle = one developer
- a physical route taken by a developer
- an exact movement of source code

---

## 10. Retention

Maximum activity retention:

24 hours.

Older activity must be deleted.

Reference metadata such as cities and languages may remain.

Activity history may not become a long-term archive unless the product scope is explicitly changed.

---

## 11. Engineering workflow

For every task:

1. Identify the current roadmap week.
2. Read the relevant documentation.
3. Inspect existing implementation.
4. Identify dependencies.
5. Make the smallest coherent change.
6. Preserve existing contracts.
7. Add/update tests.
8. Run verification.
9. Update `PROJECT_STATE.md`.
10. Update `CHANGELOG.md`.
11. Update ADR/contracts if a decision changed.

---

## 12. Never silently change architecture

If implementation reveals a real problem:

1. identify it
2. determine whether it is implementation-level or architectural
3. fix implementation-level problems normally
4. document architectural changes
5. update affected contracts
6. continue only after documentation and implementation agree

---

## 13. Final agent report

Every completed task must report:

- What changed
- Why
- Files changed
- Tests/checks run
- Architectural impact
- Known limitations
- Next roadmap step

---

## 14. Visual quality

The globe must feel like a polished professional product.

It must NOT look like:

- a Three.js tutorial
- a Minecraft globe
- a generic dashboard
- a developer experiment

Prioritize:

- smooth camera movement
- good materials
- controlled lighting
- atmosphere
- restrained effects
- aggregation
- LOD
- object reuse
- performance

---

## 15. Scope discipline

If something is not required by V1:

Do not implement it just because it is easy.

Put it into `docs/FUTURE_WORK.md`.

The roadmap is dependency-driven.

Do not skip ahead because a later feature appears interesting.