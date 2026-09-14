# Git Pulse — Product Requirements Document

**Version:** 1.0  
**Status:** Final baseline

# 1. Product

## Name

Git Pulse

## Tagline

Watch the world build software.

## Definition

Git Pulse is a live visualization of public GitHub activity happening around the world.

---

# 2. Problem

GitHub contains an enormous amount of public software-development activity.

Traditional GitHub interfaces are optimized for repositories, users, pull requests, issues, and code.

They do not provide an intuitive geographic view of global software activity.

Git Pulse turns this activity into a visual geographic experience.

---

# 3. Core experience

The user:

1. Opens Git Pulse.
2. Sees a 3D Earth.
3. Sees activity distributed geographically.
4. Zooms toward a region.
5. Sees city-level activity.
6. Filters by language/activity type.
7. Scrubs the previous 24 hours.
8. Returns to LIVE.

---

# 4. Product feeling

The product should feel:

- smooth
- polished
- cinematic
- atmospheric
- professional
- technically impressive
- information-dense without clutter

The globe should feel like a serious interactive visualization rather than a Three.js experiment.

---

# 5. V1 features

## Globe

- interactive 3D Earth
- smooth orbit
- smooth zoom
- camera easing
- atmosphere
- stars
- lighting
- activity visualization

## Activity

- public GitHub activity
- geographic activity intensity
- city activity
- animated pulses
- optional short-lived particles

## Filters

- programming language
- activity type

## Timeline

- previous 24 hours
- play
- pause
- scrub
- current time
- return to LIVE

## Live layer

- continuous updates
- WebSocket delivery
- LIVE indicator

## Search

Search known locations such as:

- Bengaluru
- San Francisco
- London
- Tokyo
- New York

Selecting a location smoothly moves the camera.

## Statistics

Examples:

- Activities
- Active locations
- Top language
- Busiest city
- activity breakdown

---

# 6. Activity semantics

Git Pulse uses GitHub activity events as the normalized activity unit.

A PushEvent is one activity.

Git Pulse does not need to know:

- how many commits are inside it
- how many files changed
- how many lines changed

---

# 7. Geography

GitHub public profiles may contain a location string.

Example:

`Bengaluru, India`

This is resolved to a known location.

A location record contains:

- location ID
- city
- country
- latitude
- longitude

Coordinates are properties of locations.

They are not fetched as per-event coordinates.

The application must never imply that the displayed city is the exact physical location of the developer.

---

# 8. Language

Language filtering uses repository language metadata.

It does not guarantee that the particular activity changed code in that language.

Potential languages include:

- Python
- JavaScript
- TypeScript
- Java
- C
- C++
- Go
- Rust
- Ruby
- PHP
- Kotlin
- Swift
- others available from repository metadata

---

# 9. Visualization model

The globe displays aggregate activity.

Activity intensity may control:

- pulse size
- glow intensity
- animation frequency
- particle density

Particles are decorative representations.

They do not correspond one-to-one with commits or developers.

---

# 10. Geographic LOD

L0:

Global/region/country activity.

L1:

City activity.

L2:

More detailed local activity while remaining aggregate-based.

The application must not permanently render every raw event.

---

# 11. Timeline

Maximum timeline:

24 hours.

Initial bucket:

15 minutes.

Therefore:

24 × 4 = 96 buckets.

Replay is powered by Git Pulse stored activity data.

The application must not depend on querying GitHub in real time to reconstruct historical timeline state.

---

# 12. Live terminology

The product uses:

`LIVE`

and:

`Activity updates continuously`

The product must not promise:

- second-by-second updates
- zero-latency updates
- complete GitHub coverage

The technical system may internally be described as near-real-time ingestion.

---

# 13. Retention

Activity history is retained for a maximum of 24 hours.

Older activity is discarded.

Reference metadata may persist.

---

# 14. Target users

- developers
- software engineers
- CS students
- technology enthusiasts
- recruiters
- engineering teams
- technical communities

---

# 15. Privacy

Use public GitHub information only.

Do not expose individual developer identity through the visualization.

Do not imply verified physical location.

---

# 16. Explicit V1 exclusions

- individual commit tracking
- commit counts
- files changed
- lines changed
- individual commit language
- developer profile pages
- clicking effects to identify developers
- exact developer GPS
- private GitHub data
- accounts
- social features
- AI summaries
- GitLab
- Stack Overflow
- package registries
- long-term historical archive
- repository analytics
- collaboration features
- mobile-first optimization

These may be future work but are not V1.

---

# 17. Performance

Target:

Approximately 60 FPS on a modern desktop during normal interaction.

Use:

- LOD
- instancing
- object reuse
- capped effects
- aggregation
- visibility control
- efficient state updates

---

# 18. Failure behavior

If GitHub becomes unavailable:

- preserve recent cached activity
- continue showing recent state where possible
- show delayed-feed status
- do not unnecessarily blank the globe