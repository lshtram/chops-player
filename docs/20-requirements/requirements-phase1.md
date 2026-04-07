# chops-player Phase I — Functional Requirements

> **Status: AUTHORED — Phase A complete**
>
> Authored by `@architect`. Replaces the Phase A stub.
> Last updated: 2026-04-06

---

## Phase I Scope

**Goal:** Given a MIDI file, play back a full multi-channel backing track through SpessaSynth with:
- Transport controls (play, pause, stop, seek)
- Per-channel mixer (volume, pan, mute, solo) with openDAW-inspired UI
- SpessaSynth initialized with `chops-instruments.sf2`
- Embeddable as `<ChopsPlayer midiUrl="..." />` in any React app

**Out of scope for Phase I:** chord chart parsing (Phase II), algorithmic generation (Phase II), styled chord grid (Phase III), effects (Phase V), iReal Pro (Phase V), mobile (Phase V).

---

## 1. SoundFont Loading (P1-SF)

| ID | Priority | Requirement |
|---|---|---|
| P1-SF-001 | MUST | The system SHALL fetch a SoundFont file from a URL as an `ArrayBuffer`. |
| P1-SF-002 | MUST | The system SHALL report SoundFont loading progress as a percentage (0–100) via a callback. |
| P1-SF-003 | MUST | The system SHALL throw a typed error (`ChopsPlayerError`) if the SoundFont fetch fails (network error, 404, invalid format). |
| P1-SF-004 | SHOULD | The system SHALL use the default SoundFont path (`/soundfonts/chops-instruments.sf2`) when no custom SoundFont URL is provided. |

---

## 2. Synthesizer Initialization (P1-SY)

| ID | Priority | Requirement |
|---|---|---|
| P1-SY-001 | MUST | The system SHALL create an `AudioContext` only in response to a user gesture (click/tap), not on component mount. |
| P1-SY-002 | MUST | The system SHALL register the SpessaSynth AudioWorklet processor (`spessasynth_processor.min.js`) from the configured worker URL before creating the synthesizer. |
| P1-SY-003 | MUST | The system SHALL create a `WorkletSynthesizer` instance and connect it to `audioContext.destination`. |
| P1-SY-004 | MUST | The system SHALL await `synth.isReady` before allowing any playback or mixer operations. |
| P1-SY-005 | MUST | The system SHALL load the SoundFont into the synthesizer via `soundBankManager.addSoundBank()` after the synth is ready. |
| P1-SY-006 | MUST | The `Synth` interface SHALL expose an `isReady: boolean` property that is `true` only after the worklet is registered, the synthesizer is created, and the SoundFont is loaded. |
| P1-SY-007 | MUST | The `Synth.dispose()` method SHALL close the `AudioContext` and release all audio resources. |

---

## 3. Sequencer / Transport (P1-TR)

| ID | Priority | Requirement |
|---|---|---|
| P1-TR-001 | MUST | The sequencer SHALL load a `Song` model and prepare it for playback by converting it to SpessaSynth-compatible MIDI data. |
| P1-TR-002 | MUST | The sequencer SHALL support `play()` to start or resume playback from the current position. |
| P1-TR-003 | MUST | The sequencer SHALL support `pause()` to suspend playback at the current position, allowing resume. |
| P1-TR-004 | MUST | The sequencer SHALL support `stop()` to halt playback and reset the position to tick 0 / second 0. |
| P1-TR-005 | MUST | The sequencer SHALL support `seekToTick(tick)` to jump to an arbitrary tick position during playback or while stopped. |
| P1-TR-006 | SHOULD | The sequencer SHALL support `seekToBar(bar)` to jump to the beginning of a specific bar number (1-indexed). |
| P1-TR-007 | MUST | The sequencer SHALL expose a `state` property of type `PlaybackState` (`"stopped" | "playing" | "paused"`). |
| P1-TR-008 | MUST | The sequencer SHALL expose a `position` property of type `PlaybackPosition` (`{ tick, seconds, bar, beat }`). |
| P1-TR-009 | MUST | The sequencer SHALL invoke an `onPositionChange` callback at approximately display refresh rate (~60fps) during playback with the current `PlaybackPosition`. |
| P1-TR-010 | SHOULD | The sequencer SHALL support a `loop` flag: when enabled, playback restarts from the beginning when the end is reached. |

---

## 4. Mixer (P1-MX)

| ID | Priority | Requirement |
|---|---|---|
| P1-MX-001 | MUST | The mixer SHALL support setting volume per channel in the range 0–100 (integer), mapped internally to MIDI CC7 (0–127). |
| P1-MX-002 | MUST | The mixer SHALL support setting pan per channel in the range -100 to +100 (integer), mapped internally to MIDI CC10 (0–127, where 64 = center). |
| P1-MX-003 | MUST | The mixer SHALL support muting a channel. A muted channel produces no audio output. |
| P1-MX-004 | MUST | The mixer SHALL support soloing a channel. When one or more channels are soloed, only soloed channels produce audio; all others are muted. |
| P1-MX-005 | MUST | The mixer SHALL support at least 16 MIDI channels (0–15). |
| P1-MX-006 | MUST | The mixer SHALL expose `getChannelState(channel)` returning a `ChannelState` object (`{ volume, pan, muted, solo }`). |
| P1-MX-007 | MUST | The mixer SHALL expose `getAllChannelStates()` returning a `ReadonlyMap<number, ChannelState>` for all active channels. |

---

## 5. State Management (P1-ST)

| ID | Priority | Requirement |
|---|---|---|
| P1-ST-001 | MUST | A `player-store` (Zustand) SHALL hold the transport state: `PlaybackState`, `PlaybackPosition`, `isReady`, `isLoading`, `error`, and the loaded `Song` metadata. |
| P1-ST-002 | MUST | A `mixer-store` (Zustand) SHALL hold the per-channel mixer state: a `Map<number, ChannelState>` for all active channels. |
| P1-ST-003 | MUST | The `player-store` SHALL expose actions: `initialize()`, `loadMidi(url)`, `play()`, `pause()`, `stop()`, `seekToTick(tick)`, `seekToBar(bar)`. |
| P1-ST-004 | MUST | The `mixer-store` SHALL expose actions: `setVolume(channel, value)`, `setPan(channel, value)`, `setMute(channel, muted)`, `setSolo(channel, solo)`. |
| P1-ST-005 | MUST | Store actions SHALL delegate to the audio layer — stores contain NO audio/MIDI business logic. |
| P1-ST-006 | MUST | The `player-store` SHALL update `position` reactively when the sequencer reports position changes. |
| P1-ST-007 | MUST | No two stores SHALL hold the same data. Single source of truth for each piece of state. |

---

## 6. MIDI Reader (P1-MR)

| ID | Priority | Requirement |
|---|---|---|
| P1-MR-001 | MUST | `parseMidiFile(buffer: ArrayBuffer)` SHALL parse a Standard MIDI File (Type 0 or Type 1) into a `Song` model. |
| P1-MR-002 | MUST | The parser SHALL extract the MIDI time division (ticks per beat) and store it in `Song.ticksPerBeat`. |
| P1-MR-003 | MUST | The parser SHALL extract all tempo change events and store them as `TempoEvent[]` in `Song.tempoMap`. |
| P1-MR-004 | MUST | The parser SHALL extract all time signature events and store them as `TimeSignatureEvent[]` in `Song.timeSignatures`. |
| P1-MR-005 | MUST | The parser SHALL extract track names from MIDI meta events (FF 03) and store them in `Track.name`. |
| P1-MR-006 | MUST | The parser SHALL extract note-on/note-off pairs and store them as `NoteEvent[]` in each `Track`. |
| P1-MR-007 | MUST | The parser SHALL determine the MIDI channel and program number for each track. |
| P1-MR-008 | MUST | The parser SHALL throw a `MidiParseError` if the input is not a valid MIDI file (bad header, truncated data). |
| P1-MR-009 | MUST | `isMidiFile(buffer: ArrayBuffer)` SHALL return `true` if the buffer starts with the MIDI header magic bytes (`MThd`), `false` otherwise. |
| P1-MR-010 | SHOULD | For Type 0 MIDI files, the parser SHALL split the single track into logical per-channel tracks in the `Song` model. |

---

## 7. UI Components (P1-UI)

| ID | Priority | Requirement |
|---|---|---|
| P1-UI-001 | MUST | The `<ChopsPlayer midiUrl="..." />` component SHALL be the single entry point. It accepts a `midiUrl` prop (string) and renders the full player UI. |
| P1-UI-002 | MUST | The Transport bar SHALL display play/pause (toggle), stop, and a position display showing `bar:beat` and elapsed time (`mm:ss`). |
| P1-UI-003 | MUST | The Transport play/pause button SHALL toggle between play and pause states. |
| P1-UI-004 | MUST | The Transport stop button SHALL stop playback and reset position to the beginning. |
| P1-UI-005 | SHOULD | The Transport bar SHALL include a seek slider (or clickable progress bar) showing the current position within the song duration. |
| P1-UI-006 | MUST | The MixerBoard SHALL display one `MixerChannel` strip per active MIDI channel. |
| P1-UI-007 | MUST | Each MixerChannel strip SHALL display: channel name/number, a volume slider (0–100), a pan knob or slider (-100 to +100), a mute button, and a solo button. |
| P1-UI-008 | MUST | The PlayerLayout SHALL display a loading indicator while the SoundFont and MIDI file are loading. |
| P1-UI-009 | MUST | The PlayerLayout SHALL display error messages when initialization, SoundFont loading, or MIDI loading fails. |
| P1-UI-010 | MUST | Components SHALL read state exclusively from Zustand stores and never import from `audio/`, `engine/`, or `parsers/` directly. |

---

## 8. Non-Functional Requirements (P1-NF)

| ID | Priority | Requirement |
|---|---|---|
| P1-NF-001 | MUST | The component SHALL load and produce audio in desktop browsers (Chrome ≥ 90, Firefox ≥ 90, Safari ≥ 15) without any server-side component. |
| P1-NF-002 | MUST | No `any` in TypeScript — `strict: true` mode throughout. Use `unknown` and narrow. |
| P1-NF-003 | MUST | The `model/` and `parsers/` layers SHALL be unit-testable without mocking the Web Audio API. |
| P1-NF-004 | MUST | The `audio/` layer integration tests SHALL mock SpessaSynth at its public API boundary only. |
| P1-NF-005 | MUST | The `<ChopsPlayer />` component SHALL be self-contained — no global CSS side effects, no assumptions about surrounding DOM. |
| P1-NF-006 | MUST | Named exports only throughout the codebase. No default exports. |
| P1-NF-007 | SHOULD | SoundFont + MIDI file loading SHALL complete within 5 seconds on a broadband connection for the default SF2 (~3-5 MB). |
| P1-NF-008 | MUST | Audio processing SHALL not block the main thread — all synthesis runs in the AudioWorklet thread. |
| P1-NF-009 | SHOULD | Position updates to the UI SHALL NOT cause unnecessary re-renders — use Zustand selectors with shallow comparison. |
