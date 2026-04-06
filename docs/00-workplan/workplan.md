# chops-player — Active Workplan (Open Items Only)

**Date:** 2026-04-06
**Status:** Pre-Phase-I. Project scaffolded. @architect has not yet run. No modules implemented.
**Purpose:** This file tracks only pending work. Completed work moves to `docs/00-workplan/accomplished-tasks.md`.

---

## 1) Current Operating Priorities

### Priority A — Phase I Foundation: MIDI Playback + Mixer (ACTIVE NEXT)

**Scope:** Load a MIDI file, play it back through SpessaSynth, control transport (play/pause/stop), per-channel volume/pan/mute in an openDAW-inspired mixer UI.

**Status:** Pre-TDD. Phase A (architect) has NOT run yet. Starting next.

**Planned modules (TDD order):**

| # | Module | Req source | Status |
|---|--------|-----------|--------|
| 1.1 | `audio/synth` — SpessaSynth wrapper (init, load SF2, dispose) | requirements-phase1.md §2 | ⬜ Phase A |
| 1.2 | `audio/sequencer` — playback control (play, pause, stop, seek, position events) | requirements-phase1.md §3 | ⬜ Phase A |
| 1.3 | `audio/mixer` — per-channel volume, pan, mute | requirements-phase1.md §4 | ⬜ Phase A |
| 1.4 | `stores/player-store` — transport state + Zustand | requirements-phase1.md §5 | ⬜ Phase A |
| 1.5 | `stores/mixer-store` — channel state + Zustand | requirements-phase1.md §5 | ⬜ Phase A |
| 1.6 | `parsers/midi-reader` — parse MIDI file → Song model | requirements-phase1.md §6 | ⬜ Phase A |
| 1.7 | `components/Transport` — play/pause/stop/seek controls | requirements-phase1.md §7 | ⬜ Phase A |
| 1.8 | `components/Mixer` — per-channel mixer UI | requirements-phase1.md §7 | ⬜ Phase A |
| 1.9 | `components/PlayerLayout` — root `<ChopsPlayer />` assembly | requirements-phase1.md §7 | ⬜ Phase A |

**Architect checkpoint:** Phase A must produce:
- `docs/10-architecture/architecture.md` (full, not stub)
- `docs/20-requirements/requirements-phase1.md` (full requirements)
- TypeScript interface stubs in `src/model/`, `src/engine/`, `src/audio/`, `src/parsers/`
- User approves before Phase B starts

---

## 2) Product Roadmap (5-Phase Plan)

| Phase | Scope | Status |
|---|---|---|
| **I** | MIDI file load + SpessaSynth playback + transport + per-channel mixer | 🔜 Next |
| **II** | JJazzLab `.sng` XML parsing + simple bass/drums/piano generators | ⬜ Pending |
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
| `docs/20-requirements/requirements-phase1.md` | Phase I functional requirements |
| `docs/30-development/coding-guidelines.md` | Code style, banned patterns, review checklist |
| `docs/30-development/patterns.md` | Agent tool patterns accumulated over sessions |
| `AGENTS.md` | Agent operating guide, architecture constraints |
