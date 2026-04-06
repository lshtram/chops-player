# chops-player — Architecture

> **Status: STUB — awaiting @architect Phase A**
>
> This file will be fully authored by the `@architect` agent before Phase I TDD begins.
> The sections below define the structure that must be filled in.

---

## 1. System Overview

_[To be written by @architect]_

chops-player is a browser-based jazz backing track player built as an embeddable React component. It parses chord charts, generates multi-instrument MIDI backing tracks algorithmically, and plays them back through SpessaSynth (Web Audio API / AudioWorklet).

---

## 2. Layer Boundaries (Mandatory Constraints)

These constraints are locked and must not be violated by the architect or any implementing agent:

| Layer | Allowed dependencies | Forbidden |
|---|---|---|
| `model/` | None (pure data types) | React, Web Audio API, SpessaSynth, Zustand |
| `engine/` | `model/` only | React, Web Audio API, SpessaSynth, Zustand |
| `audio/` | `model/`, `engine/`, SpessaSynth, Web Audio API | React, Zustand |
| `parsers/` | `model/` only | React, Web Audio API, SpessaSynth, Zustand |
| `stores/` | `model/`, `audio/`, Zustand, React | `engine/` directly (via audio layer) |
| `components/` | `stores/`, `model/`, React, Tailwind | `audio/`, `engine/`, `parsers/` directly |
| `utils/` | None (pure helpers) | Everything else |

---

## 3. Component Diagram

_[To be drawn by @architect — Mermaid diagram showing layer interactions]_

---

## 4. Data Flow: Chord Chart → Audio

_[To be written by @architect]_

High-level flow:
1. User loads a file → `parsers/` → `Song` model
2. `engine/` generates MIDI events from `Song` chords
3. `audio/sequencer` feeds events to SpessaSynth
4. SpessaSynth AudioWorklet renders audio
5. `stores/` expose playback position → `components/ChordGrid` updates in real-time

---

## 5. Key Interfaces (Stubs)

_[To be written by @architect and placed in `src/model/`, `src/engine/`, `src/audio/`]_

---

## 6. Phase I Scope Boundary

_[To be specified by @architect — exactly what is in scope for Phase I vs deferred]_

---

## 7. Architecture Decision Records

_[ADRs to be added by @architect for each non-obvious choice]_

### ADR-001: SpessaSynth as audio engine (LOCKED)

**Decision:** Use `spessasynth_lib` (Apache-2.0) as the SoundFont synthesizer.

**Context:** Browser-based jazz playback requires a SoundFont synthesizer that runs entirely in the browser. Options evaluated: SpessaSynth, openDAW, Tone.js, WebAudioFont.

**Rationale:**
- Full TypeScript, AudioWorklet-based, no COOP/COEP headers required
- Apache-2.0 license (compatible with MIT project)
- Built-in sequencer, SoundFont 2/3 support, active maintenance
- openDAW rejected: AGPL-3.0 viral, deeply coupled to custom JSX/Box reactive system
- Tone.js rejected: no SoundFont support
- WebAudioFont rejected: GPL-3.0, dated

**Status:** LOCKED — do not revisit unless SpessaSynth becomes unmaintained.

### ADR-002: Extracted trimmed SF2 for Phase I (LOCKED)

**Decision:** Use a custom-extracted `chops-instruments.sf2` (~3-5 MB) containing only the 4 instruments needed for Phase I backing tracks. No CDN, no server required.

**Instruments (Phase I):** Acoustic Grand Piano (GM 0), Jazz Guitar (GM 26), Acoustic Bass (GM 32), Standard Drums (Bank 128/Preset 0).

**Status:** LOCKED for Phase I. Full instrument selection revisited in Phase V.

### ADR-003: Embeddable widget architecture (LOCKED)

**Decision:** Build as an embeddable React component (`<ChopsPlayer />`). No global CSS assumptions. Publishable as an npm package.

**Status:** LOCKED.
