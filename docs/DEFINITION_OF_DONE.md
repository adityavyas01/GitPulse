# Git Pulse — Definition of Done

A task is complete only when applicable requirements below are satisfied.

---

## Product

- behavior matches PRD
- no accidental scope expansion
- terminology is accurate

---

## Architecture

- respects SRS
- respects data contract
- respects API contract
- respects UI specification
- does not bypass architectural boundaries

---

## Code

- TypeScript types are correct
- readable implementation
- no unnecessary duplication
- appropriate error handling
- useful logging/metrics

---

## Data

- no N+1 enrichment
- cache-first metadata lookup
- no fabricated data
- eventTime and ingestedAt preserved
- 24-hour retention respected

---

## Performance

- no unbounded object creation
- no unnecessary raw payload transfer
- aggregation before rendering
- appropriate LOD
- controlled effects

---

## Tests

- relevant unit tests
- integration tests where applicable
- failure tests for critical paths
- rendering/performance verification where applicable

---

## Documentation

Update:

- PROJECT_STATE.md
- CHANGELOG.md

If architecture or semantics changed:

- DECISIONS.md
- relevant contract

---

## Verification

Run where applicable:

- lint
- typecheck
- tests
- build

---

## Agent report

Include:

1. What changed
2. Files changed
3. Tests/checks
4. Architectural impact
5. Known limitations
6. Next roadmap step