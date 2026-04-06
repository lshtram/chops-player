# chops-player Phase I — Functional Requirements

> **Status: STUB — awaiting @architect Phase A**
>
> This file will be fully authored by the `@architect` agent before Phase I TDD begins.
> The section headers below define what must be covered. Requirement IDs (`P1-XXX-NNN`) must be assigned by the architect.

---

## Phase I Scope

**Goal:** Given a MIDI file, play back a full multi-channel backing track through SpessaSynth with:
- Transport controls (play, pause, stop, seek)
- Per-channel mixer (volume, pan, mute) with openDAW-inspired UI
- SpessaSynth initialized with `chops-instruments.sf2`
- Embeddable as `<ChopsPlayer midiUrl="..." />` in any React app

**Out of scope for Phase I:** chord chart parsing (Phase II), algorithmic generation (Phase II), styled chord grid (Phase III), effects (Phase V), iReal Pro (Phase V), mobile (Phase V).

---

## 1. SoundFont Loading (P1-SF)

_[Requirements to be written by @architect]_

---

## 2. Synthesizer Initialization (P1-SY)

_[Requirements to be written by @architect]_

---

## 3. Sequencer / Transport (P1-TR)

_[Requirements to be written by @architect]_

---

## 4. Mixer (P1-MX)

_[Requirements to be written by @architect]_

---

## 5. State Management (P1-ST)

_[Requirements to be written by @architect]_

---

## 6. MIDI Reader (P1-MR)

_[Requirements to be written by @architect]_

---

## 7. UI Components (P1-UI)

_[Requirements to be written by @architect]_

---

## 8. Non-Functional Requirements

| ID | Requirement |
|---|---|
| P1-NF-001 | The component must load and produce audio in a desktop browser (Chrome, Firefox, Safari) without any server-side component |
| P1-NF-002 | No `any` in TypeScript — strict mode throughout |
| P1-NF-003 | The `model/` and `engine/` layers must be unit-testable without mocking the Web Audio API |
| P1-NF-004 | The `audio/` layer integration tests must mock SpessaSynth at its public API boundary only |
| P1-NF-005 | The `<ChopsPlayer />` component must be self-contained — no global CSS side effects |
