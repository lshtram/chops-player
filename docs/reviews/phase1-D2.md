## Review — phase1 — Phase D2 (Coding Guidelines)

### Verdict: **FAIL**

This review checks the listed Phase I implementation files against `docs/30-development/coding-guidelines.md` (TypeScript safety, module/export conventions, layer rules, React/store rules, and code quality checklist).

---

### File-by-file notes

#### `src/audio/soundfont-loader.ts`
- ✅ Named exports only; no default export.
- ✅ No `any`; catch block narrows error correctly.
- ⚠️ `fetchSoundFont()` is long for the "~40 lines" guideline (non-blocking suggestion to split streaming/progress path).

#### `src/audio/synth-wrapper.ts`
- ✅ Named exports only; no default export.
- ✅ No `any`; exported methods include explicit return types.
- ⚠️ `dispose()` calls `AudioContext.close()` without awaiting completion (non-blocking robustness suggestion).

#### `src/audio/sequencer-wrapper.ts`
- ✅ No `any`; no default export.
- ❌ Uses unsafe casts without narrowing:
  - `this._synth as unknown as BasicSynthesizer`
  - `uint8Array.buffer as ArrayBuffer`
  These violate "No type cast `as X` without narrowing".

#### `src/audio/mixer-controller.ts`
- ✅ Named exports only; no default export.
- ✅ No `any`; explicit return types present.
- ⚠️ `getAllChannelStates()` returns internal mutable map reference (non-blocking encapsulation suggestion).

#### `src/parsers/midi-reader.ts`
- ✅ No `any`; no default export.
- ❌ Unsafe cast without narrowing: `view.getUint16(offset) as 0 | 1`.
- ❌ Violates code-size/complexity guidance:
  - file is far above "~200 lines" implementation guidance,
  - `parseMidiFile()` is far above "~40 lines" function guidance.

#### `src/stores/player-store.ts`
- ✅ No `any`; named exports only.
- ❌ Layer architecture violation (hard block per guidelines):
  - store imports parser directly: `import { parseMidiFile } from "@parsers/midi-reader.js"`
  - Components/stores should not depend across forbidden layer boundaries; stores are constrained to model/audio/react/zustand in the layer matrix.

#### `src/stores/mixer-store.ts`
- ✅ No `any`; named exports only.
- ✅ Store actions are immutable state updates.
- ⚠️ Exposes `DEFAULT_CHANNEL_STATE` from store module; acceptable, but consider keeping defaulting behind accessor to reduce duplication in components.

#### `src/components/Transport.tsx`
- ✅ Component reads from store and renders UI only.
- ✅ No direct imports from `audio/`, `engine/`, or `parsers/`.
- ✅ No hook misuse detected.

#### `src/components/Mixer.tsx`
- ✅ Components import only from store layer.
- ✅ No hook misuse; props typed via interfaces.
- ⚠️ Duplicated default channel state inline in `MixerBoard` (non-blocking duplication suggestion).

#### `src/components/PlayerLayout.tsx`
- ✅ Components import only from stores/components.
- ⚠️ `midiUrl` prop is currently unused in `PlayerLayout` path (non-blocking in this coding-style pass, but likely a functional gap).
- ⚠️ Repeated literal channel list in two branches (non-blocking duplication suggestion).

---

### Required fixes (blocking before Phase D3)

1. **Unsafe cast in sequencer wrapper**
   - `src/audio/sequencer-wrapper.ts:46`
   - Replace `as unknown as BasicSynthesizer` with a typed abstraction or runtime type guard.

2. **Unsafe cast in sequencer MIDI load**
   - `src/audio/sequencer-wrapper.ts:88`
   - Remove `as ArrayBuffer` cast; pass a correctly typed buffer/view without unsafe assertion.

3. **Unsafe cast in parser header format**
   - `src/parsers/midi-reader.ts:80`
   - Replace `as 0 | 1` with explicit runtime validation + narrowed type.

4. **Layer architecture violation in store**
   - `src/stores/player-store.ts:13`
   - Remove direct parser import from store; move parsing boundary to an allowed layer/adapter and consume through permitted dependency direction.

5. **Code quality hard-gap in parser module**
   - `src/parsers/midi-reader.ts` (overall)
   - Refactor oversized `parseMidiFile()` and file into smaller units to meet the project's maintainability thresholds (~40-line functions, ~200-line file guidance).

---

### Suggestions (non-blocking)

- Extract shared constants:
  - 16-channel array in `PlayerLayout.tsx`
  - default channel fallback in `Mixer.tsx`
- Consider awaiting/handling `AudioContext.close()` completion in `SynthWrapper.dispose()`.
- Consider returning a defensive copy or readonly facade from `MixerController.getAllChannelStates()`.
- Split `fetchSoundFont()` into smaller helpers (streaming read vs fallback read) for readability.
