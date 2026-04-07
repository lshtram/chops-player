# Phase I Architecture Review

**Date:** 2026-04-06
**Reviewer:** reviewer agent
**Status:** FAIL

## Summary
The Phase A package is strong overall: layering is clearly documented, Phase I boundaries are mostly explicit, and the requirements are broadly complete and testable. However, there are a few coherence and contract issues that should be fixed before Phase B test writing starts, especially a direct contradiction around AudioContext initialization timing and a missing typed error contract.

## Findings

### Critical (blocks Phase B)
- **Initialization flow contradicts user-gesture requirement/ADR**
  - `docs/10-architecture/architecture.md:126-127` describes initialization as occurring on mount via store initialization.
  - This conflicts with `docs/10-architecture/architecture.md:258-265` (ADR-005) and `docs/20-requirements/requirements-phase1.md:37` (P1-SY-001), which require AudioContext creation only on user gesture.
  - **Fix:** Update section 4.1 flow so mount prepares state only, and AudioContext/worklet/synth creation happens on first user gesture (`play()` or explicit initialize action triggered by user input).

- **Typed error contract referenced but not defined in delivered interfaces/models**
  - Requirement `P1-SF-003` requires `ChopsPlayerError` (`docs/20-requirements/requirements-phase1.md:28`), but no corresponding exported type/class is present in the reviewed stubs (`src/model/*`, `src/audio/*`, `src/parsers/*`).
  - **Fix:** Add an exported `ChopsPlayerError` contract in an agreed location (e.g., `src/model/errors.ts` or `src/audio/errors.ts`) and reference it from relevant interface docs/signatures.

### Major (should fix before Phase B)
- **Interface naming violates coding guideline convention**
  - `docs/30-development/coding-guidelines.md:37` specifies interface names should be PascalCase with **no `I` prefix**.
  - Current stubs use `ISynth` (`src/audio/synth.ts:51`), `ISequencer` (`src/audio/sequencer.ts:50`), `IMixer` (`src/audio/mixer.ts:43`).
  - **Fix:** Rename to `Synth`, `Sequencer`, `Mixer` (or another non-`I` naming scheme) consistently across architecture/requirements/stubs.

- **Requirement-to-architecture traceability is weak**
  - Architecture document has almost no explicit requirement ID mapping in data flow/sections (except one parser `@see` in code, not in architecture narrative).
  - This makes B/B2 test planning harder and increases risk of coverage gaps.
  - **Fix:** Add a short traceability table in architecture mapping major design elements/interfaces to requirement groups (P1-SF, P1-SY, P1-TR, P1-MX, P1-ST, P1-MR, P1-UI, P1-NF).

- **Parser stub throw type does not match documented contract**
  - `src/parsers/midi-reader.ts:48-53` documents `MidiParseError`, but stub currently throws generic `Error`.
  - **Fix:** Throw `MidiParseError` in stubs now to keep failure mode contract aligned for Phase B tests.

### Minor (fix at Phase D or later)
- `src/audio/synth.ts:78` defines `dispose(): void` though `AudioContext.close()` is async in practice. Not strictly wrong for Phase A, but likely cleaner as `Promise<void>` in final implementation contract.
- `docs/10-architecture/architecture.md:185` lists Safari desktop support in scope while mobile is deferred (fine), but consider explicitly stating "desktop Safari only" in scope sentence for clarity.

## Specific File Notes
- **`docs/10-architecture/architecture.md`**
  - Strong layering and useful ADR set.
  - Needs correction of initialization sequence (mount vs user gesture).
  - Add explicit requirement ID traceability section.

- **`docs/20-requirements/requirements-phase1.md`**
  - IDs are unique and formatted correctly (`P1-XX-NNN`).
  - Coverage is broad and largely testable.
  - Ensure required typed error (`ChopsPlayerError`) is concretely defined in delivered contracts.

- **`src/model/song.ts`**
  - Good pure model design; no layer violations.
  - Types appear sufficient for parser + transport baseline.

- **`src/model/constants.ts`**
  - Good constant coverage for Phase I defaults and MIDI conventions.

- **`src/audio/synth.ts`**, **`src/audio/sequencer.ts`**, **`src/audio/mixer.ts`**
  - Signatures are coherent with requirements and architecture intent.
  - Rename `I*` interfaces to comply with coding guidelines.

- **`src/parsers/midi-reader.ts`**
  - Layering/import purity is correct.
  - Stub exception type should match documented parser error contract.

## Verdict
SEND BACK TO ARCHITECT

Must-change list before Phase B:
1. Fix architecture initialization flow to be fully user-gesture driven (remove mount-time AudioContext creation ambiguity).
2. Define and export `ChopsPlayerError` to satisfy P1-SF-003 contract.
3. Rename `ISynth` / `ISequencer` / `IMixer` (or update coding rule explicitly if the project decides to allow `I` prefix).
4. Add requirement traceability mapping in architecture (requirements → interfaces/components/layers).
5. Align parser stub throw type with documented `MidiParseError` contract.

---

## Re-Review (Targeted) — 2026-04-06

### Finding Status

1. **AudioContext creation timing** — **RESOLVED**  
   - `docs/10-architecture/architecture.md` §4.1 now explicitly states no audio resources are created at mount and that `AudioContext` creation happens on first user gesture (`play`/initialize action).  
   - ADR-005 remains consistent with this flow.

2. **`ChopsPlayerError` contract** — **RESOLVED**  
   - `src/model/errors.ts` now defines `ChopsPlayerError extends Error` with `code: string`.  
   - `src/model/index.ts` exports `ChopsPlayerError`, making it available for parser/audio/store usage.

3. **Interface naming (`I*` prefixes)** — **RESOLVED**  
   - `src/audio/synth.ts`, `src/audio/sequencer.ts`, and `src/audio/mixer.ts` now use `Synth`, `Sequencer`, and `Mixer`.  
   - References are updated in `architecture.md` and `requirements-phase1.md`.

4. **Requirement traceability in architecture** — **RESOLVED**  
   - `docs/10-architecture/architecture.md` now includes §5a “Requirement Traceability” mapping requirement groups to interfaces/components/methods.

5. **Parser stub error type** — **RESOLVED**  
   - `src/parsers/midi-reader.ts` stubs now throw `MidiParseError` instead of generic `Error`.

### Additional Coherence Check

- **Type check:** `pnpm typecheck` passes (`tsc --noEmit` clean).  
- **Renaming consistency:** no remaining `ISynth`/`ISequencer`/`IMixer` references outside historical text in this review document.

### Overall Re-Review Verdict

**PASS**

All 5 previously blocking findings are resolved. Phase A architecture gate is now clear for Phase B test writing.
