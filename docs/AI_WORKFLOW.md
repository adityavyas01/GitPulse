# Git Pulse — AI Coding Workflow

This project is intentionally being built with AI coding agents.

The repository therefore acts as persistent project memory.

---

# Before every session

Read:

1. AGENTS.md
2. PROJECT_STATE.md
3. current ROADMAP.md section
4. relevant contracts
5. relevant architecture

---

# During implementation

The agent must:

1. inspect existing code
2. understand dependencies
3. identify the current layer
4. avoid unrelated refactoring
5. preserve contracts
6. add tests
7. run verification

---

# After implementation

Update:

- PROJECT_STATE.md
- CHANGELOG.md

If decisions changed:

- DECISIONS.md

If contracts changed:

- relevant contract document

---

# Contradictions

Never silently choose between conflicting requirements.

Determine whether the issue is:

- implementation-level
- architectural
- product-level

Implementation issue:

Fix it.

Architectural/product issue:

Document the change before proceeding.

---

# New dependencies

Before adding a dependency, document:

- why it is required
- what problem it solves
- alternatives
- impact on V1
- maintenance implications

Avoid dependency sprawl.

---

# New features

Check V1 scope first.

If feature is outside V1:

Do not implement it.

Add it to FUTURE_WORK.md.

---

# Context preservation

Important knowledge must not exist only in chat.

Put important decisions into:

- PRD
- SRS
- architecture
- data contract
- API contract
- UI spec
- ADR
- roadmap
- project state
- changelog