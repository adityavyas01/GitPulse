# Git Pulse — UI / Visualization Specification

# 1. Product feeling

The target is a polished professional interactive globe.

Characteristics:

- smooth
- cinematic
- atmospheric
- clean
- technically impressive
- information-rich without clutter

It must not look like a Three.js demo.

---

# 2. Main screen

The globe dominates the screen.

UI includes:

- location search
- LIVE indicator
- statistics
- filters
- timeline
- minimal navigation

---

# 3. Globe

Requirements:

- Earth
- atmosphere
- stars
- lighting
- smooth orbit
- smooth zoom
- camera easing
- controlled rotation
- city activity
- subtle pulses
- controlled particles

---

# 4. LOD

## L0

Global/country/region activity.

## L1

City activity.

## L2

More detailed city activity while still aggregate-based.

Do not render every raw event.

---

# 5. Activity intensity

Activity count controls visual intensity.

Possible levels:

Low:
subtle pulse.

Medium:
stronger pulse.

High:
strong glow.

Surge:
prominent visual effect.

Scaling should be normalized so one extreme city does not destroy the visual hierarchy.

---

# 6. Particles

Particles are decorative.

Requirements:

- short-lived
- pooled
- reused
- capped
- aggregate-driven
- identity-free

Particles must not imply:

- one commit
- one developer
- exact physical movement

---

# 7. Search

Flow:

search
→ location
→ location ID
→ coordinates
→ camera target
→ smooth fly-to

---

# 8. Timeline

Controls:

- play
- pause
- scrub
- current time
- return to LIVE
- playback speed if useful

Range:

24 hours.

Initial resolution:

15-minute buckets.

96 buckets total.

---

# 9. Filters

## Language

- All
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
- other available languages

## Activity

Potential categories:

- All
- Push
- Pull Request
- Issue
- Review
- Release
- Discussion
- other supported types

The backend event model may support more types than the initial UI.

---

# 10. Statistics

Use:

- Activities
- Active locations
- Top language
- Busiest city

Avoid:

- Developers coding
- programmers currently coding
- exact number of programmers

---

# 11. UX

Requirements:

- readable typography
- keyboard-accessible controls
- visible focus states
- loading states
- error states
- delayed-feed state
- no critical information conveyed only by color

---

# 12. Responsive

V1 is desktop-first.

The globe must remain usable on smaller screens.

Mobile-first optimization is not a V1 priority.