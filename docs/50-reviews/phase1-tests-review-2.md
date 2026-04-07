# Phase I — Test Suite Review (Round 2)

> **Reviewer:** `@reviewer`  
> **Phase:** B (test suite review)  
> **Date:** 2026-04-06  
> **Verdict:** **FAIL — SEND BACK TO TEST-BUILDER**

---

## Summary

The suite improved substantially versus the previous review: `soundfont-loader.test.ts` was added, most earlier phantom IDs were removed, and broad requirement labeling is now present in `it()` titles. However, this still cannot pass gate B2 due to remaining blockers: one phantom requirement ID family in UI tests, missing coverage for MUST IDs (`P1-ST-007`, `P1-UI-010`), a component test importing from `@audio/*`, and several tests that are too weak/trivial to enforce the requirement contract.

---

## Blocking issues

1. **Phantom requirement IDs still present (`P1-UI-014`)**  
   - `src/components/__tests__/PlayerLayout.test.tsx:5`  
   - `src/components/__tests__/PlayerLayout.test.tsx:133`  
   - `src/components/__tests__/PlayerLayout.test.tsx:134`  
   - `src/components/__tests__/PlayerLayout.test.tsx:141`  
   - `src/components/__tests__/PlayerLayout.test.tsx:150`  
   - `src/components/__tests__/PlayerLayout.test.tsx:167`  
   - `src/components/__tests__/PlayerLayout.test.tsx:168`  
   Requirement IDs in `requirements-phase1.md` for UI are `P1-UI-001` through `P1-UI-010` only (`docs/20-requirements/requirements-phase1.md:113-123`).

2. **Missing MUST requirement coverage: `P1-ST-007` (single source of truth between stores)**  
   - Requirement exists at `docs/20-requirements/requirements-phase1.md:88`  
   - No corresponding `it("P1-ST-007: ...")` found in:
     - `src/stores/__tests__/player-store.test.ts`
     - `src/stores/__tests__/mixer-store.test.ts`

3. **Missing MUST requirement coverage: `P1-UI-010` (components must read state from stores only; no direct audio/engine/parsers imports)**  
   - Requirement exists at `docs/20-requirements/requirements-phase1.md:122`  
   - No corresponding `it("P1-UI-010: ...")` found across:
     - `src/components/__tests__/Transport.test.tsx`
     - `src/components/__tests__/Mixer.test.tsx`
     - `src/components/__tests__/PlayerLayout.test.tsx`

4. **Cross-layer boundary violation in a component test (imports from audio layer)**  
   - `src/components/__tests__/Transport.test.tsx:23` imports `PlaybackPosition` from `@audio/sequencer.ts`.
   - This violates architecture/testing rules that component tests should stay at the component/store boundary (`docs/10-architecture/architecture.md:31,36-40` and `docs/30-development/coding-guidelines.md:72,155`).

5. **Store test uses internal setter instead of public action API for requirement behavior**  
   - `src/stores/__tests__/player-store.test.ts:179-182` calls internal `setPosition` directly.
   - The review checklist requires store tests to validate public actions/delegation behavior, not internal setter shortcuts.

6. **Weak/trivial assertions remain (insufficient to catch real implementation bugs)**  
   - `src/audio/__tests__/sequencer.test.ts:224-238` (`P1-TR-010`) only asserts `sequencer.loop === true`; it does not verify restart-on-end behavior.
   - `src/audio/__tests__/soundfont-loader.test.ts:139` uses `toBeTruthy()` for error code rather than asserting a specific expected code.
   - `src/components/__tests__/PlayerLayout.test.tsx:96-105` and `121-130` are negative checks that can pass against placeholder stubs without validating required rendering behavior.

7. **SHOULD requirement skipped without explanatory note (`P1-UI-005`)**  
   - `P1-UI-005` exists in requirements (`docs/20-requirements/requirements-phase1.md:117`).
   - No test and no explicit documented skip rationale in the reviewed test files.

---

## Coverage table (Phase I requirements sections 1–7)

| Requirement ID | Status |
|---|---|
| P1-SF-001 | ✅ |
| P1-SF-002 | ✅ |
| P1-SF-003 | ✅ |
| P1-SF-004 | ✅ |
| P1-SY-001 | ✅ |
| P1-SY-002 | ✅ |
| P1-SY-003 | ✅ |
| P1-SY-004 | ✅ |
| P1-SY-005 | ✅ |
| P1-SY-006 | ✅ |
| P1-SY-007 | ✅ |
| P1-TR-001 | ✅ |
| P1-TR-002 | ✅ |
| P1-TR-003 | ✅ |
| P1-TR-004 | ✅ |
| P1-TR-005 | ✅ |
| P1-TR-006 | ✅ |
| P1-TR-007 | ✅ |
| P1-TR-008 | ✅ |
| P1-TR-009 | ✅ |
| P1-TR-010 | ✅ |
| P1-MX-001 | ✅ |
| P1-MX-002 | ✅ |
| P1-MX-003 | ✅ |
| P1-MX-004 | ✅ |
| P1-MX-005 | ✅ |
| P1-MX-006 | ✅ |
| P1-MX-007 | ✅ |
| P1-ST-001 | ✅ |
| P1-ST-002 | ✅ |
| P1-ST-003 | ✅ |
| P1-ST-004 | ✅ |
| P1-ST-005 | ✅ |
| P1-ST-006 | ✅ |
| P1-ST-007 | ❌ |
| P1-MR-001 | ✅ |
| P1-MR-002 | ✅ |
| P1-MR-003 | ✅ |
| P1-MR-004 | ✅ |
| P1-MR-005 | ✅ |
| P1-MR-006 | ✅ |
| P1-MR-007 | ✅ |
| P1-MR-008 | ✅ |
| P1-MR-009 | ✅ |
| P1-MR-010 | ✅ |
| P1-UI-001 | ✅ |
| P1-UI-002 | ✅ |
| P1-UI-003 | ✅ |
| P1-UI-004 | ✅ |
| P1-UI-005 | ❌ (SHOULD; no skip note) |
| P1-UI-006 | ✅ |
| P1-UI-007 | ✅ |
| P1-UI-008 | ✅ |
| P1-UI-009 | ✅ |
| P1-UI-010 | ❌ |

---

## Prior blocking issues from `phase1-tests-review.md` — status

- ✅ `P1-SF` section coverage added (`src/audio/__tests__/soundfont-loader.test.ts`).
- ✅ Most phantom IDs from audio/store/component tests were corrected.
- ✅ Missing IDs previously called out for SY/TR/MX/UI loading/error are now present.
- ❌ Not fully resolved: remaining phantom UI IDs, missing MUST coverage (`P1-ST-007`, `P1-UI-010`), and layer-boundary / weak-assertion issues above.
