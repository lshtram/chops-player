# Phase I — Test Suite Review

> **Reviewer:** `@reviewer`
> **Phase:** B (test suite review)
> **Date:** 2026-04-06
> **Verdict: FAIL — SEND BACK TO TEST-BUILDER**

---

## Summary

The test suite has 70 tests across 9 files. The structure is sound and the stubs are in place. However, several blocking issues prevent a PASS: requirement-ID drift (phantom IDs in tests that don't exist in the spec), an entire requirement section with zero coverage (P1-SF), weak assertions that pass before any real implementation exists, store contract mismatches, and inconsistent requirement-ID labelling in `it()` descriptions.

---

## Blocking Issues

### 1. Entire P1-SF section has zero tests

`src/parsers/__tests__/midi-reader.test.ts` covers P1-MR. There is **no test file at all** for SoundFont loading (P1-SF). All four requirements — `P1-SF-001`, `P1-SF-002`, `P1-SF-003`, `P1-SF-004` — have zero coverage.

**Required action:** Create `src/audio/__tests__/soundfont-loader.test.ts` (or equivalent) with tests for every P1-SF requirement.

---

### 2. Phantom requirement IDs (in tests but NOT in requirements-phase1.md)

The following IDs appear in test descriptions but do not exist in `requirements-phase1.md`. They must be removed, replaced with real IDs, or the requirements doc must be updated first (by the architect, not the test-builder).

| File | Phantom IDs |
|---|---|
| `synth.test.ts` | `P1-SY-008` |
| `mixer.test.ts` | `P1-MX-008`, `P1-MX-009`, `P1-MX-010`, `P1-MX-011` |
| `player-store.test.ts` | `P1-ST-008`, `P1-ST-009`, `P1-ST-010`, `P1-ST-011`, `P1-ST-012` |
| `Transport.test.tsx` | `P1-UI-011`, `P1-UI-012`, `P1-UI-013`, `P1-UI-014` |
| `Mixer.test.tsx` | `P1-UI-015`, `P1-UI-016`, `P1-UI-017` |

**Required action:** Each phantom test must be re-mapped to a real requirement ID. If the tested behaviour is real but unlabelled, map it to the closest real ID. If the tested behaviour is out-of-scope for Phase I, remove the test.

---

### 3. Missing requirement coverage (real IDs with no tests)

The following real requirement IDs have no corresponding test:

| Section | Missing IDs |
|---|---|
| P1-SY | `P1-SY-002` (worklet registration), `P1-SY-003` (WorkletSynthesizer connect), `P1-SY-006` (isReady only after all 3 steps) |
| P1-TR | `P1-TR-006` (seekToBar), `P1-TR-009` (onPositionChange callback at ~60fps), `P1-TR-010` (loop flag) |
| P1-MX | `P1-MX-001` CC7 mapping assertion, `P1-MX-002` CC10 mapping assertion, `P1-MX-005` (16-channel support) |
| P1-ST | `P1-ST-003` requires `seekToBar(bar)` in player-store actions — not present in tests |
| P1-UI | `P1-UI-008` (loading indicator), `P1-UI-009` (error display) |

---

### 4. Weak / pass-early assertions

Tests that only assert "does not throw" or check the stub's initial value — they will pass even without implementation.

- `synth.test.ts` — `P1-SY-001`: only checks `new SynthWrapper()` does not throw. Must assert AudioContext is NOT created until `initialize()` is called.
- `sequencer.test.ts` — state assertions only check the stub's default value, not post-call state.
- `player-store.test.ts` — `P1-ST-005` (singleton): calls `setPlaybackState` which throws "not implemented" from the stub, so the test itself fails — this is correct. But some state-shape tests merely check that the initial value equals the default from the stub, which is a tautology.

---

### 5. Store contract mismatch

`requirements-phase1.md` §5 specifies:

- `player-store` shape: `PlaybackState`, `PlaybackPosition`, `isReady`, `isLoading`, `error`, `Song` metadata
- `player-store` actions: `initialize()`, `loadMidi(url)`, `play()`, `pause()`, `stop()`, `seekToTick(tick)`, `seekToBar(bar)`

The tests in `player-store.test.ts` use `setPlaybackState`, `setReady`, `setLoading` — these are internal setters, not the public action API specified in the requirements. Tests must cover the **public action API** (`play()`, `pause()`, `stop()`, `loadMidi()`, `seekToBar()`) and verify they delegate to the audio layer.

---

### 6. Requirement ID missing from individual `it()` descriptions (guideline §4.1)

Some tests put the requirement ID only in the outer `describe()` block but not in each `it()` string. Every `it()` must include the requirement ID it covers, e.g.:

```ts
it("P1-TR-002: play() transitions state to 'playing'", ...)
```

Not:
```ts
describe("P1-TR-002 play()", () => {
  it("transitions state to 'playing'", ...)
})
```

---

### 7. Cross-boundary import in component tests

`PlayerLayout.test.tsx` mocks `@audio/synth` (the audio layer). Component tests must only test through the store boundary. Import the store mock instead.

---

## Non-Blocking Observations

- `midi-reader.test.ts` is thorough and well-structured. Minor: `P1-MR-010` test should also assert that the resulting `Song.tracks` has more entries than the original single track.
- `Mixer.test.tsx` needs CC7/CC10 MIDI value assertions, not just "slider renders".

---

## Required Actions for PASS

1. Create `src/audio/__tests__/soundfont-loader.test.ts` covering all P1-SF requirements.
2. Replace all phantom IDs with real IDs from `requirements-phase1.md`.
3. Add missing tests for `P1-SY-002`, `P1-SY-003`, `P1-SY-006`, `P1-TR-006`, `P1-TR-009`, `P1-TR-010`, `P1-MX-001` (CC7), `P1-MX-002` (CC10), `P1-MX-005`, `P1-ST-003` (seekToBar), `P1-UI-008`, `P1-UI-009`.
4. Fix `player-store.test.ts` to test the public action API (`play()`, `pause()`, `stop()`, `loadMidi()`, `seekToBar()`).
5. Strengthen weak assertions so they fail against the stub.
6. Add requirement ID to every individual `it()` description.
7. Fix `PlayerLayout.test.tsx` to mock the store, not the audio layer.
8. After fixes: `pnpm test --run` must show ≥ 90% of tests failing at assertion level (not import/type errors), and `pnpm typecheck` must be clean.
