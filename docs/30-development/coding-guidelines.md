# chops-player — Coding Style & Code Review Guidelines

**Applies to:** All source code in `chops-player`
**Technologies:** TypeScript 5.x, React 19, Vite 6, Vitest 3, Zustand 5, Tailwind CSS v4, SpessaSynth
**Sources:**
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/) (Basarat Ali Syed)
- [Effective TypeScript](https://effectivetypescript.com/) (Dan Vanderkam)
- [React docs — Thinking in React](https://react.dev/learn/thinking-in-react)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 1. TypeScript Style

### 1.1 Type Safety — Non-Negotiable

| Rule | Rationale |
|------|-----------|
| `strict: true` in every tsconfig | Enables `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, etc. Non-negotiable. |
| **Never use `any`** | Use `unknown` when the type is genuinely unknown. Narrow it before use. `any` defeats TypeScript entirely. |
| **Never use non-null assertion `!`** without a comment | Every `!` requires a one-line comment explaining why null is impossible here. |
| **No type cast `as X` without narrowing** | Use type guards (`isX(v)`) instead. `as X` suppresses the compiler and hides bugs. |
| All exported functions must have explicit return types | Prevents accidental `any` inference and makes API contracts visible. |
| Prefer `interface` for object shapes, `type` for unions/intersections | Interfaces are extensible and produce clearer error messages. |
| Use `readonly` for arrays/objects that should not be mutated | `readonly string[]`, `Readonly<SongModel>`. Signal intent and catch bugs at compile time. |
| Prefer union types over enums | TypeScript `enum` has runtime overhead and surprising behaviour. Use `type Foo = "a" \| "b" \| "c"`. |

### 1.2 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Variables, parameters | `camelCase` | `currentBeat`, `channelVolume` |
| Functions | `camelCase` | `parseMidi()`, `generateBassLine()` |
| React components | `PascalCase` | `Transport`, `MixerChannel` |
| Classes | `PascalCase` | `SpessaSynthWrapper` |
| Interfaces | `PascalCase` (no `I` prefix) | `Song`, `MixerState`, `ChordEvent` |
| Type aliases | `PascalCase` | `NoteValue`, `TimeSignature` |
| Constants (truly constant) | `UPPER_SNAKE_CASE` | `DEFAULT_TEMPO`, `GM_DRUMS_CHANNEL` |
| Files | `kebab-case` | `synth-wrapper.ts`, `chord-grid.tsx` |
| Test files | `<module>.test.ts` | `synth-wrapper.test.ts` |
| React component files | `PascalCase.tsx` | `Transport.tsx`, `MixerChannel.tsx` |

### 1.3 Functions & Modules

- **Pure functions over classes when there is no state.** `music-utils.ts` exports plain functions. A SpessaSynth wrapper uses a class because it holds the AudioContext reference.
- **Avoid default exports.** Named exports make refactoring and tree-shaking easier.
- **Keep functions short.** If a function doesn't fit on a screen (> ~40 lines), split it.
- **No commented-out code.** Dead code lives in git history, not in the source.
- **Async/await over raw Promises.** Only use `.then()/.catch()` when working with Promise combinators.
- **Never throw inside async functions without catching at the boundary.**

### 1.4 Error Handling

- **Use typed error classes** for expected scenarios:
  ```typescript
  class ChopsPlayerError extends Error {
    constructor(message: string, public readonly code: string) {
      super(message);
      this.name = 'ChopsPlayerError';
    }
  }
  ```
- **Always use `Error` objects**, never throw strings.
- **Validate all external input** at boundaries (file uploads, URL params). After the boundary, trust the types.
- **All `catch (e)` blocks must type-narrow `e`** before using it: `if (e instanceof Error)`.

### 1.5 Imports

- Use `type` imports for types: `import type { Song } from "@model/song"`.
- Group imports: 1) External (`react`, `zustand`, `spessasynth_lib`), 2) Internal path aliases (`@model/*`, `@engine/*`), 3) Relative.
- Never import from `audio/` or `engine/` directly in components — go through `stores/`.

---

## 2. React Guidelines

### 2.1 Component Rules

- **No logic in components.** Components read from stores and render. Business logic belongs in `engine/`, audio logic in `audio/`, state in `stores/`.
- **Prefer functional components.** No class components.
- **`useCallback` and `useMemo` only when measured.** Premature memoization obscures intent.
- **Avoid `useEffect` for derived state.** Derive in the render function or in the store selector.
- **Props must be typed with interfaces**, not inline object types.
- **No prop drilling past 2 levels.** Use Zustand stores.

### 2.2 Store Rules (Zustand)

- One store file per concern: `player-store.ts`, `mixer-store.ts`, `song-store.ts`.
- Stores expose **actions** (functions) and **state** (data). No async side effects directly on the audio layer — use action functions that call into `audio/`.
- No two stores should hold the same data. Single source of truth.

---

## 3. Layer Architecture Rules (Non-Negotiable)

These enforce the constraint that layers can only depend downward:

| Layer | May import | Must NOT import |
|---|---|---|
| `model/` | Nothing | Everything |
| `engine/` | `model/` | React, Zustand, Web Audio API, SpessaSynth |
| `audio/` | `model/`, `engine/`, SpessaSynth | React, Zustand |
| `parsers/` | `model/` | React, Zustand, Web Audio API, SpessaSynth |
| `stores/` | `model/`, `audio/`, `parsers/`, React, Zustand | `engine/` direct calls |
| `components/` | `stores/`, `model/`, React, Tailwind | `audio/`, `engine/`, `parsers/` direct |
| `utils/` | Nothing | Everything |

Violation of these rules is a **hard block** at Phase D reviewer gate.

---

## 4. Testing Guidelines (Vitest)

### 4.1 Test Structure

```typescript
// Pattern: describe('<module>') → describe('<exported unit>') → it('<REQ-ID>: <description>')
describe('BassGenerator', () => {
  describe('generate', () => {
    it('P1-MR-001: returns root note on beat 1 of each bar', () => { ... });
    it('P1-MR-002: uses correct duration for quarter-note walking bass', () => { ... });
  });
});
```

- **One `describe` per exported unit** (function or class).
- **Test descriptions are sentences** a PM could read.
- **Every requirement ID in the test name** where one exists.
- **Arrange-Act-Assert (AAA)** with blank lines between sections.

### 4.2 Test Quality Rules

| Rule | Why |
|------|-----|
| Tests must be **deterministic** | No `Math.random()`, no `Date.now()` without mocking |
| **Mock external dependencies**, not the unit under test | Mock SpessaSynth, never mock `BassGenerator` when testing `BassGenerator` |
| **No `toBeTruthy()` when an exact value is expected** | `expect(result).toBe(true)` not `expect(result).toBeTruthy()` |
| **No `any` in tests** | Tests are code. Same rules apply. |
| Test **error paths** as rigorously as happy paths | Every `throw` should have a corresponding test |
| **Isolation** — each test sets up and tears down its own state | Use `beforeEach` to reset |
| **Test the contract, not the implementation** | Assert on observable outcomes, not private internals |

### 4.3 What We Do NOT Test

- TypeScript types (the compiler tests those)
- Private implementation details
- SpessaSynth internals

### 4.4 Web Audio API in Tests

The Web Audio API is not available in jsdom. Rules:
- `model/` and `engine/` tests: no mocking needed (pure functions, no Web Audio)
- `audio/` tests: mock SpessaSynth at its public constructor/method boundary
- Component tests: mock `stores/` — never import `audio/` directly in component tests

---

## 5. Code Review Checklist (Phase D2)

### 5.1 Correctness

- [ ] All tests pass (`pnpm test` — zero failures, zero skipped)
- [ ] TypeScript compiles with zero errors (`pnpm typecheck`)
- [ ] Every requirement from the spec has a test — cross-reference the requirements doc
- [ ] No `TODO` or `FIXME` that wasn't pre-existing
- [ ] No `console.log` in production code paths

### 5.2 Type Safety

- [ ] Zero `any` (search: `grep -r ": any" src/`)
- [ ] Zero non-null assertions without explaining comment
- [ ] Zero unsafe `as X` casts without a type guard function
- [ ] All exported function return types are explicit
- [ ] All `catch (e)` blocks type-narrow `e` before using it

### 5.3 Layer Architecture Compliance

- [ ] `model/` contains no React, no Web Audio API, no SpessaSynth imports
- [ ] `engine/` contains no React, no Web Audio API, no SpessaSynth imports
- [ ] `audio/` contains no React, no Zustand imports
- [ ] Components import only from `stores/` and `model/` (never from `audio/` or `engine/`)
- [ ] No circular imports between layers

### 5.4 React Quality

- [ ] No logic in components — only store reads + JSX
- [ ] No class components
- [ ] No prop drilling past 2 levels
- [ ] `useEffect` only for lifecycle/subscriptions, not derived state

### 5.5 Code Quality

- [ ] No function exceeds ~40 lines
- [ ] No file exceeds ~200 lines of implementation
- [ ] No duplication — logic that appears twice is extracted
- [ ] Error messages are human-readable and include context

### 5.6 Test Quality

- [ ] No `toBeTruthy()` or `toBeFalsy()` where an exact value is expected
- [ ] Test file covers all code paths (not just happy path)
- [ ] Mocks reset in `beforeEach` / `afterEach`
- [ ] At least one integration test per module exercises the real module boundary

### 5.7 Commit Readiness

- [ ] Commit message follows conventional commits format
- [ ] No unrelated changes in the same commit
- [ ] No leftover debug files or generated files

---

## 6. Git Conventions

### 6.1 Commit Messages

Format: `<type>(<scope>): <description>`

| Type | Use for |
|------|---------|
| `feat` | New functionality |
| `fix` | Bug fix |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `refactor` | Code change that doesn't add features or fix bugs |
| `chore` | Build process, dependency updates, CI |
| `perf` | Performance improvement |

Scope = module name: `synth`, `sequencer`, `mixer`, `player-store`, `midi-reader`, `transport`, `chord-grid`

Example:
```
feat(synth): implement SpessaSynth wrapper with SF2 loading

- Implements P1-SY-001 through P1-SY-004
- Tests: 8 passing
```

### 6.2 Branch Names

`<type>/<scope>-<description>` — e.g. `feat/phase1-synth`, `fix/sequencer-seek`

---

## 7. Performance Guidelines

- **Never block the main thread** in audio code — all SpessaSynth calls go to the AudioWorklet.
- **No synchronous file reads** — always use `fetch` or File API async methods.
- **Avoid re-renders on audio position updates** — use Zustand subscriptions with selectors, not full store subscriptions.
- **MIDI/SF2 parsing happens once**, result cached in store. Never re-parse on re-render.
