# chops-player — Active Workplan (Open Items Only)

**Date:** 2026-04-07
**Status:** Phase I COMPLETE. Phase II is next.
**Purpose:** This file tracks only pending work. Completed work moves to `docs/00-workplan/accomplished-tasks.md`.

---

## 1) Current Operating Priorities

### Priority A — Phase II: JJazzLab `.sng` Parsing + Backing Track Generators (NEXT)

**Scope:** Parse JJazzLab `.sng` XML format into the `Song` model. Implement simple algorithmic generators for bass, drums, and piano backing tracks from chord charts.

**Status:** Not started. Phase A (architect) has NOT run yet.

**Planned modules (TDD order):**

| # | Module | Req source | Status |
|---|--------|-----------|--------|
| 2.1 | `parsers/sng-reader` — parse JJazzLab `.sng` XML → `Song` model | requirements-phase2.md §1 | ⬜ Phase A |
| 2.2 | `engine/chord-parser` — chord symbol → `Chord` model | requirements-phase2.md §2 | ⬜ Phase A |
| 2.3 | `engine/bass-generator` — simple walking/pedal bass from chord chart | requirements-phase2.md §3 | ⬜ Phase A |
| 2.4 | `engine/drums-generator` — simple drum pattern from style | requirements-phase2.md §3 | ⬜ Phase A |
| 2.5 | `engine/piano-generator` — simple comping from chord chart | requirements-phase2.md §3 | ⬜ Phase A |

---

## 2) Product Roadmap (5-Phase Plan)

| Phase | Scope | Status |
|---|---|---|
| **I** | MIDI file load + SpessaSynth playback + transport + per-channel mixer | ✅ DONE (2026-04-07 · 107 tests) |
| **II** | JJazzLab `.sng` XML parsing + simple bass/drums/piano generators | 🔜 Next |
| **III** | Styled UI — chord grid with playback marker, openDAW-style mixer | ⬜ Pending |
| **IV** | Styles/rhythms library, song structure, walking bass algorithm | ⬜ Pending |
| **V** | Effects, custom SoundFont loading, iReal Pro, mobile support, audio export | ⬜ Pending |

---

## 3) Guardrails

- Keep TDD phase gates and reviewer checkpoints mandatory.
- Keep this file forward-looking only; move completed items to `accomplished-tasks.md`.
- For each new module, attach requirement IDs + test evidence + review artifact.
- Architecture constraints (from `AGENTS.md`) must be upheld by the reviewer at every Phase A gate:
  - `model/` and `engine/` are pure — no React, no Web Audio API
  - `audio/` is the exclusive owner of Web Audio API
  - `stores/` bridge React ↔ audio only; no business logic
  - No `any`, named exports only, strict TypeScript throughout

---

## 4) Key Reference Documents

| Document | Purpose |
|---|---|
| `docs/10-architecture/architecture.md` | System design, layer boundaries, data flow |
| `docs/20-requirements/requirements-phase1.md` | Phase I functional requirements (complete) |
| `docs/30-development/coding-guidelines.md` | Code style, banned patterns, review checklist |
| `docs/30-development/patterns.md` | Agent tool patterns accumulated over sessions |
| `docs/testing-guide-phase1.md` | Phase I automated test list + 6 user journey tests |
| `AGENTS.md` | Agent operating guide, architecture constraints |
