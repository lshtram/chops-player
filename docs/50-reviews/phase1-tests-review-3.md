# Phase I — Test Suite Review (Round 3)

> **Reviewer:** `@reviewer`  
> **Phase:** B (final test suite review attempt)  
> **Date:** 2026-04-06  
> **Verdict:** **FAIL — BLOCKING ISSUES REMAIN**

---

## Summary

Most prior issues are now fixed: no phantom IDs remain, component tests no longer import from `audio/engine/parsers`, `P1-ST-007` and `P1-UI-010` coverage is present, and `P1-UI-005` is explicitly deferred via `it.skip` with rationale. However, the suite still fails the Phase B gate on the “tests must fail meaningfully against stubs” criterion for key behaviors.

---

## Blocking issues

1. **`P1-TR-010` loop test still masks stub failure instead of failing against not-implemented behavior**  
   - File: `src/audio/__tests__/sequencer.test.ts:224-243`  
   - Problem: The test wraps `sequencer.play()` in `try/catch` and then asserts `loop === true` in the `catch`. This allows the test to pass even when `play()` throws “not implemented”.  
   - Why blocking: This directly violates the B2 requirement that key tests fail at assertion level against stubs (and specifically contradicts the intended round-2 fix #6).  
   - Required fix: Remove the swallow/catch pass path and assert behavior that must fail on stubs (e.g., call `play()` without catch and assert restart semantics via observable state transitions/mocked sequencer callbacks).

2. **`P1-ST-006` reactivity test is tautological and cannot fail on stub regressions**  
   - File: `src/stores/__tests__/player-store.test.ts:173-193`  
   - Problem: Assertion is `expect(positionUpdates.length).toBeGreaterThanOrEqual(0)`, which is always true.  
   - Why blocking: This does not validate reactive position updates and will pass regardless of implementation quality, so it does not satisfy meaningful failing-test criteria for a key requirement.  
   - Required fix: Assert at least one concrete update for a triggered position change path (or explicit expected throw/failure on stub with a strict assertion path), e.g. `> 0` with deterministic action/setup.

---

## Round-2 fix verification status

1. Phantom `P1-UI-014` replaced with real IDs — ✅ Verified  
2. `P1-ST-007` test added — ✅ Verified  
3. `P1-UI-010` test added — ✅ Verified  
4. Cross-layer import removed from `Transport.test.tsx` — ✅ Verified  
5. `player-store.test.ts` uses `seekToTick()` instead of internal setter — ✅ Verified  
6. `P1-TR-010` loop test should fail on stub via `play()` throw — ❌ **Not resolved** (`try/catch` currently swallows failure)  
7. `P1-UI-005` explicit `it.skip` with deferral note — ✅ Verified  
8. `soundfont-loader.test.ts` error code assertion strengthened — ✅ Verified

---

## Gate decision

**FAIL** — return to test-builder for the two blocking fixes above, then re-submit for review.
