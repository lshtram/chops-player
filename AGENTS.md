# AGENTS.md — Guide for AI Agents

This file tells any AI agent how to operate in this repository.
Read this file **first** whenever you open this workspace.

---

## 1. What This Project Is

**chops-player** is a browser-based jazz backing track player — part of the larger **chops-workshop** platform.

It loads jazz standards (initially in JJazzLab `.sng` format, later iReal Pro), generates a full backing band from chord charts, and plays it back through a high-quality SoundFont synthesizer with a real-time chord chart display and an openDAW-style mixer.

**It is built to be embedded** as a React component in the chops-workshop website.

### Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 + TypeScript 5.x |
| Build Tool | Vite 6 |
| State Management | Zustand 5 |
| CSS | Tailwind CSS v4 |
| UI Primitives | Radix UI (via shadcn/ui conventions) |
| Audio Engine | SpessaSynth (Apache-2.0) — `spessasynth_lib` |
| Schema Validation | Zod |
| Testing | Vitest 3 + jsdom |
| Package Manager | pnpm |

**The always-authoritative starting point for any coding task is:**
→ [`docs/00-workplan/workplan.md`](docs/00-workplan/workplan.md) — current status, active phase, next module

---

## 2. Five-Phase Product Plan

| Phase | Scope |
|---|---|
| **Phase I** | MIDI file load + SpessaSynth playback + transport controls + per-channel mixer |
| **Phase II** | JJazzLab `.sng` parsing + simple bass/drums/piano MIDI generators |
| **Phase III** | Styled UI — chord grid with playback marker, openDAW-style mixer strips |
| **Phase IV** | Full features: styles/rhythms library, song structure, walking bass algorithm |
| **Phase V** | Effects, custom SoundFont loading, iReal Pro support, mobile, audio export |

---

## 3. Modes of Work

### 3.1 TDD Mode — required for all new feature modules

When the user says **"TDD"**, or the task is implementing a module from the workplan, follow the full process in the global `dev-process.md` (loaded by the project-manager) without skipping any phase or checkpoint.

**Project-specific tooling:**
- Test framework: `vitest`
- Test command: `pnpm test` (runs `vitest run`)
- Type checker: `pnpm typecheck` (runs `tsc --noEmit`)
- Linter: `pnpm lint` (runs `eslint src`)
- Package manager: `pnpm`
- Test location: `src/**/__tests__/<module>.test.ts` or `.test.tsx`

**Key TDD rules:**
- Phases A → B → B2 → C → D → D2 → D3 → E → F — in order, no skipping
- User checkpoints at A, B2, and E are **blocking**
- Never write implementation before tests are approved by the user
- Every requirement gets a test; tests reference requirement IDs (e.g. `P1-01`)
- Audio/Web Audio code must be tested with mocks — never rely on real AudioContext in tests

### 3.2 Quick Fix Mode

For small bug fixes, typos, or scoped corrections:
- Make the minimal change
- Run `pnpm test` in the affected area
- Commit with `fix(<scope>): <description>`

### 3.3 Exploration / Investigation Mode

Read and report — no changes unless asked.

### 3.4 Debug Mode

Load `skills/debugging/skill.md` before touching code.
Follow: OBSERVE → INSTRUMENT → HYPOTHESIZE → VERIFY → FIX & CONFIRM

---

## 4. Architecture Constraints

These override generic advice and must never be violated:

1. **Model layer is pure.** `src/model/` contains only data types and pure functions — no React, no Zustand, no Web Audio API. It must be importable in a Node.js test environment with zero dependencies.

2. **Engine layer is pure.** `src/engine/` generates music data (Phrase, Note, MIDI bytes) from chord/song models. No side effects, no audio, no UI. Every generator function must be unit-testable without mocking.

3. **Audio layer owns the Web Audio API.** `src/audio/` is the only place that creates AudioContext, AudioWorklet, or GainNode. All audio state flows through `src/stores/player-store.ts` and `src/stores/mixer-store.ts`. Never create audio nodes inside React components.

4. **Stores are the bridge.** React components read from Zustand stores; they never reach into `src/audio/` directly. Audio layer reads from stores via subscriptions.

5. **No `any`.** Use `unknown` and narrow it. Zero exceptions.

6. **Named exports only.** No default exports. Easier tree-shaking and refactoring.

7. **SoundFont files are never committed** (too large). The extracted compact font (`chops-instruments.sf2`) is the only exception if kept under 10 MB. Large fonts live in `/data/projects/SoundFonts/` locally and on a CDN for production.

8. **SpessaSynth AudioWorklet processor** (`spessasynth_processor.min.js`) must be copied to `public/workers/` at build time. Use a Vite plugin or `vite.config.ts` copy hook — never commit it.

9. **Mobile is deferred.** iOS Safari AudioWorklet/autoplay restrictions are a Phase V concern. Do not add complexity for mobile in Phases I–IV.

10. **Embeddable-first design.** The player will eventually be published as an npm package. Keep the root `<ChopsPlayer />` component self-contained with no assumptions about the surrounding DOM or global CSS.

---

## 5. Always-On Rules

1. **Follow [`docs/30-development/coding-guidelines.md`](docs/30-development/coding-guidelines.md).** TypeScript style, React patterns, banned patterns, and the D2 checklist all live there.
2. **Run `pnpm test` before committing.** Zero failures required.
3. **Conventional commits.** `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`.
4. **Scope = layer or component name.** e.g. `feat(audio): implement synth wrapper`, `fix(parser): handle empty chord bar`.
5. **Scan [`docs/30-development/patterns.md`](docs/30-development/patterns.md) before any non-trivial task.** Add entries when you hit new friction.
6. **Commit when a task/phase is done; push only when the user explicitly says "push".**
7. **Use web search for anything time-sensitive** (library APIs, versions, browser support). Never rely on model memory for facts that change.

---

## 6. Key Documents

| Document | Purpose |
|---|---|
| [`docs/00-workplan/workplan.md`](docs/00-workplan/workplan.md) | Current status, active phase, module list, DONE history |
| [`docs/10-architecture/architecture.md`](docs/10-architecture/architecture.md) | System design, component boundaries, data flow, ADRs |
| [`docs/20-requirements/requirements-phase1.md`](docs/20-requirements/requirements-phase1.md) | Phase I functional requirements with IDs |
| [`docs/30-development/coding-guidelines.md`](docs/30-development/coding-guidelines.md) | TypeScript style, React rules, banned patterns |
| [`docs/30-development/patterns.md`](docs/30-development/patterns.md) | Accumulated agent tool patterns and solutions |

---

## 7. Picking Up Mid-Project

1. Open [`docs/00-workplan/workplan.md`](docs/00-workplan/workplan.md) — read **Current Status**
2. Check `git log --oneline -10` to see what was last committed
3. Run `pnpm test` to verify baseline is green
4. Identify which TDD phase the active module is in
5. If joining mid-module, resume from the current phase forward — never skip backwards
