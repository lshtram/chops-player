# chops-player

A browser-based jazz backing track player. Load a chord chart, hear a full backing band.

Built as an embeddable React component (`<ChopsPlayer />`) for the **chops-workshop** learning platform.

---

## What It Does

- Parses jazz chord charts (JJazzLab `.sng`, iReal Pro — Phase V)
- Generates bass, drums, and piano parts algorithmically from chord symbols
- Plays back through [SpessaSynth](https://github.com/spessasus/SpessaSynth) — a pure-browser SoundFont synthesizer (no server required)
- Displays a real-time scrolling chord grid synchronized to playback
- Provides a professional mixer (openDAW-inspired) with per-channel volume, pan, and mute

---

## Tech Stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript 5.x |
| Build | Vite 6 |
| State | Zustand 5 |
| Styles | Tailwind CSS v4 |
| Audio | SpessaSynth (`spessasynth_lib`) via AudioWorklet |
| Tests | Vitest 3 |
| Package manager | pnpm |

---

## Project Structure

```
src/
├── model/        Pure data types — Song, Chord, Note, constants (no React, no audio)
├── engine/       Pure music generators — bass, drums, piano, MIDI builder (no React, no audio)
├── audio/        SpessaSynth wrapper — synth, sequencer, mixer (owns Web Audio API)
├── parsers/      File format parsers — JJazzLab .sng (Phase II), MIDI, iReal Pro (Phase V)
├── stores/       Zustand stores — bridge React ↔ audio layer
├── components/   React UI components — Transport, ChordGrid, Mixer, PlayerLayout
└── utils/        Shared helpers — midi-utils, music-utils

public/
├── soundfonts/   chops-instruments.sf2 (~3-5 MB, extracted from FluidR3_GM)
└── workers/      spessasynth_processor.min.js (copied from node_modules at build time)

docs/
├── 00-workplan/  workplan.md — current status, active module, DONE history
├── 10-architecture/ architecture.md — system design, layer boundaries, data flow
├── 20-requirements/ requirements-phase*.md — per-phase functional requirements
├── 30-development/  coding-guidelines.md, patterns.md
├── 40-testing/   testing guides
├── 50-reviews/   review documents from TDD process
└── 90-archive/   resolved/completed documents
```

---

## Development Setup

```bash
pnpm install

# Copy SpessaSynth AudioWorklet processor to public/workers/
bash scripts/copy-worker.sh

# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck
```

> **SoundFont:** The repo does not include the SF2 file. Run `node scripts/extract-soundfont.js` (Phase I) to extract `chops-instruments.sf2` from a local FluidR3_GM copy, or place your own `chops-instruments.sf2` in `public/soundfonts/`.

---

## 5-Phase Product Plan

| Phase | Scope |
|---|---|
| **I** | MIDI file load + SpessaSynth playback + transport + per-channel mixer |
| **II** | JJazzLab `.sng` XML parsing + simple bass/drums/piano generators |
| **III** | Styled UI — chord grid with playback marker, openDAW-style mixer |
| **IV** | Styles/rhythms library, song structure, walking bass algorithm |
| **V** | Effects, custom SoundFont loading, iReal Pro, mobile support, audio export |

---

## License

MIT — see [LICENSE](LICENSE)
