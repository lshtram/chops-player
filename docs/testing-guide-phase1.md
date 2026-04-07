# chops-player — Phase I Testing Guide

> **Module:** Phase I (MIDI load + SpessaSynth playback + transport + mixer)
> **Date written:** 2026-04-07
> **Test count:** 107 automated tests passing (8 skipped stubs, 1 todo)

---

## Section 1 — Automated Tests

All automated tests run with:

```bash
pnpm test          # watch mode
pnpm test --run    # single run (CI)
pnpm typecheck     # TypeScript — must also be zero errors
```

Expected baseline: **107 passed | 8 skipped | 1 todo | 0 failures**

---

### 1.1 SoundFont Loader — `src/audio/__tests__/soundfont-loader.test.ts` (7 tests)

| Test name | Requirement | What it verifies |
|---|---|---|
| `P1-SF-001: fetchSoundFont(url) returns an ArrayBuffer when the server responds with ok:true` | P1-SF-001 | Successful fetch returns an `ArrayBuffer` |
| `P1-SF-001: fetchSoundFont(url) calls fetch with the correct URL` | P1-SF-001 | Correct URL is passed to `fetch` |
| `P1-SF-002: fetchSoundFont(url, onProgress) calls the callback with progress values` | P1-SF-002 | Progress callback receives values in range 0–100 |
| `P1-SF-003: fetchSoundFont(url) throws ChopsPlayerError on 404` | P1-SF-003 | Non-ok HTTP response throws `ChopsPlayerError` |
| `P1-SF-003: fetchSoundFont(url) throws ChopsPlayerError on network error` | P1-SF-003 | Rejected `fetch` promise throws `ChopsPlayerError` |
| `P1-SF-003: ChopsPlayerError has a meaningful error code on fetch failure` | P1-SF-003 | Error object has a non-empty `code` property |
| `P1-SF-004: fetchSoundFont() (no args) uses the default path /soundfonts/chops-instruments.sf2` | P1-SF-004 | Default SoundFont URL is used when no argument is given |

---

### 1.2 Synthesizer Wrapper — `src/audio/__tests__/synth.test.ts` (11 tests)

| Test name | Requirement | What it verifies |
|---|---|---|
| `P1-SY-003: isReady is false before initialize() is called` | P1-SY-006 | `isReady` starts `false` |
| `P1-SY-006: isReady is false before initialize() even if audioContext was somehow accessed` | P1-SY-006 | `isReady` guard works even before AudioContext exists |
| `P1-SY-001: initialize() creates an AudioContext when called` | P1-SY-001 | `AudioContext` constructor is called on `initialize()` |
| `P1-SY-002: initialize() registers the AudioWorklet processor via addModule before creating the synthesizer` | P1-SY-002 | `audioWorklet.addModule` is called before synth creation |
| `P1-SY-003: initialize() connects the synthesizer to audioContext.destination` | P1-SY-003 | `WorkletSynthesizer` is connected to `destination` |
| `P1-SY-002: initialize() is idempotent — calling it twice does not create a second AudioContext` | P1-SY-002 | Second `initialize()` call is a no-op |
| `P1-SY-004: isReady is true after initialize() resolves` | P1-SY-004 | `isReady` becomes `true` after `initialize()` resolves |
| `P1-SY-005: loadSoundFont(url) throws ChopsPlayerError if called before initialize()` | P1-SY-005 | Guard prevents use before init |
| `P1-SY-005: loadSoundFont(url) invokes the SpessaSynth synth with the correct URL` | P1-SY-005 | SoundFont is passed to SpessaSynth's `soundBankManager` |
| `P1-SY-007: dispose() closes the AudioContext` | P1-SY-007 | `audioContext.close()` is called on `dispose()` |
| `P1-SY-007: dispose() is safe to call before initialize() — does not throw` | P1-SY-007 | `dispose()` is a safe no-op before init |

---

### 1.3 Mixer Controller — `src/audio/__tests__/mixer.test.ts` (15 tests)

| Test name | Requirement | What it verifies |
|---|---|---|
| `P1-MX-001: getChannelState(n) returns default state { volume: 100, pan: 0, muted: false, solo: false }` | P1-MX-006 | Default channel state is correct |
| `P1-MX-006: getChannelState(n) returns state reflecting last setVolume/setPan/setMute/setSolo call` | P1-MX-006 | State is updated after each action |
| `P1-MX-001: setVolume(ch, 100) sends CC7 value 127` | P1-MX-001 | Max volume maps to CC7=127 |
| `P1-MX-001: setVolume(ch, 50) sends CC7 value 64` | P1-MX-001 | 50% volume maps to CC7=64 |
| `P1-MX-003: setVolume(n, 150) clamps to 100` | P1-MX-001 | Over-range volume is clamped |
| `P1-MX-004: setVolume(n, -10) clamps to 0` | P1-MX-001 | Under-range volume is clamped |
| `P1-MX-005: setVolume works for all MIDI channels 0–15` | P1-MX-005 | All 16 channels are addressable |
| `P1-MX-002: setPan(ch, 0) sends CC10 value 64 (center)` | P1-MX-002 | Center pan maps to CC10=64 |
| `P1-MX-002: setPan(ch, -100) sends CC10 value 0 (full left)` | P1-MX-002 | Full-left pan maps to CC10=0 |
| `P1-MX-002: setPan(ch, 100) sends CC10 value 127 (full right)` | P1-MX-002 | Full-right pan maps to CC10=127 |
| `P1-MX-003: setPan(n, 200) clamps to 100` | P1-MX-002 | Over-range pan is clamped |
| `P1-MX-004: setPan(n, -200) clamps to -100` | P1-MX-002 | Under-range pan is clamped |
| `P1-MX-003: setMute(n, true) calls muteChannel(n, true) on the synth` | P1-MX-003 | Mute delegates to SpessaSynth |
| `P1-MX-004: setSolo(n, true) marks the channel as soloed in channel state` | P1-MX-004 | Solo state is stored |
| `P1-MX-007: getAllChannelStates() returns a ReadonlyMap; after setting channel 0 and 9, both appear` | P1-MX-007 | Multi-channel state map is correct |

---

### 1.4 Sequencer Wrapper — `src/audio/__tests__/sequencer.test.ts` (13 tests, 1 skipped, 1 todo)

| Test name | Requirement | What it verifies |
|---|---|---|
| `P1-TR-001: initial state is 'stopped'` | P1-TR-007 | Initial `state` is `"stopped"` |
| `P1-TR-001: initial position is { tick: 0, seconds: 0, bar: 1, beat: 1 }` | P1-TR-008 | Initial position is at the start |
| `P1-TR-002: play() transitions state to 'playing'` | P1-TR-002 | `play()` sets state to `"playing"` |
| `P1-TR-007: play() from 'paused' state resumes — state becomes 'playing'` | P1-TR-002 | Resume from pause works |
| `P1-TR-003: pause() from 'playing' transitions state to 'paused'` | P1-TR-003 | `pause()` sets state to `"paused"` |
| `P1-TR-004: stop() from 'playing' transitions state to 'stopped' and resets position to zero` | P1-TR-004 | `stop()` halts and resets |
| `P1-TR-005: stop() from 'paused' transitions state to 'stopped' and resets position to zero` | P1-TR-004 | `stop()` works from paused state too |
| `P1-TR-008: seekToTick(n) updates position.tick to n when stopped` | P1-TR-005 | Seek updates tick position |
| `P1-TR-006: seekToBar(bar) jumps to the correct tick for that bar number (1-indexed)` | P1-TR-006 | Bar seek calculates correct tick |
| `P1-TR-001: load(song) accepts a Song object without throwing` | P1-TR-001 | `load()` does not throw on valid input |
| `P1-TR-009: onPositionChange callback is invoked during playback` | P1-TR-009 | Position callback fires during playback |
| `P1-TR-010: loop flag is readable and writable` | P1-TR-010 | `loop` property can be toggled |
| *(1 skipped)* `P1-TR-009: onPositionChange callback timing (~60fps)` | P1-TR-009 | Skipped — timing precision not testable in jsdom |
| *(1 todo)* `P1-TR-010: loop restarts playback automatically at end` | P1-TR-010 | Deferred to Phase II (requires full SpessaSynth event) |

---

### 1.5 MIDI Reader — `src/parsers/__tests__/midi-reader.test.ts` (10 tests)

| Test name | Requirement | What it verifies |
|---|---|---|
| `P1-MR-001: returns true for a buffer starting with MThd magic bytes` | P1-MR-009 | `isMidiFile()` positive case |
| `P1-MR-002: returns false for a buffer that does not start with MThd` | P1-MR-009 | `isMidiFile()` negative case |
| `P1-MR-003: returns false for an empty buffer` | P1-MR-009 | `isMidiFile()` handles empty input |
| `P1-MR-004: throws MidiParseError for an empty buffer` | P1-MR-008 | Parser rejects empty input with typed error |
| `P1-MR-005: throws MidiParseError for a buffer that is not a valid MIDI file` | P1-MR-008 | Parser rejects garbage bytes |
| `P1-MR-006: returns a Song with correct format (0) from a minimal valid Type 0 MIDI file` | P1-MR-001 | Type 0 MIDI is parsed to correct `Song.format` |
| `P1-MR-007: returns a Song with at least one track from a minimal Type 0 MIDI file` | P1-MR-001 | Parsed `Song` contains at least one track |
| `P1-MR-008: parses timeBase (ticks per quarter note = 480) from the MIDI header` | P1-MR-002 | `Song.ticksPerBeat` is extracted from header |
| `P1-MR-009: returns a Song with at least 2 tracks for a Type 1 MIDI file with 2 tracks` | P1-MR-001 | Type 1 multi-track MIDI is parsed correctly |
| `P1-MR-010: extracts at least one NoteEvent from a track with note-on/note-off pairs` | P1-MR-006 | Note events are extracted from track data |

---

### 1.6 Player Store — `src/stores/__tests__/player-store.test.ts` (26 tests, 7 skipped)

| Test name | Requirement | What it verifies |
|---|---|---|
| `P1-ST-001: store has playbackState, position, isReady, isLoading, error, and song properties` | P1-ST-001 | Store shape is correct |
| `P1-ST-001: initial playbackState is 'stopped'` | P1-ST-001 | Initial transport state |
| `P1-ST-001: initial position is at tick 0` | P1-ST-001 | Initial position |
| `P1-ST-001: initial isReady is false` | P1-ST-001 | Not ready before init |
| `P1-ST-001: initial isLoading is false` | P1-ST-001 | Not loading initially |
| `P1-ST-001: initial error is null` | P1-ST-001 | No error initially |
| `P1-ST-001: isReady becomes true after initialize() completes` | P1-ST-001 | Init sets `isReady` flag |
| `P1-ST-003: play() exists as an action` | P1-ST-003 | Action is present |
| `P1-ST-003: pause() exists as an action` | P1-ST-003 | Action is present |
| `P1-ST-003: stop() exists as an action` | P1-ST-003 | Action is present |
| `P1-ST-003: loadMidi(url) exists as an action` | P1-ST-003 | Action is present |
| `P1-ST-003: seekToTick(tick) exists as an action` | P1-ST-003 | Action is present |
| `P1-ST-003: seekToBar(bar) exists as an action` | P1-ST-003 | Action is present |
| `P1-ST-003: initialize() exists as an action` | P1-ST-003 | Action is present |
| `P1-ST-003: play() sets playbackState to 'playing' when called after initialize()` | P1-ST-003 | Play action updates state |
| `P1-ST-005: two usePlayerStore calls read the same state (singleton)` | P1-ST-007 | Store is a singleton |
| `P1-ST-006: position updates reactively when the sequencer reports position changes` | P1-ST-006 | Position is reactive |
| `P1-ST-007: player-store and mixer-store do not share state keys` | P1-ST-007 | No duplicate state keys |
| `P1-ST-007: loading a MIDI file updates player-store.song but not mixer-store.channels directly` | P1-ST-007 | Single source of truth |
| *(7 skipped)* `initialize/loadMidi/loadSoundFont integration` | P1-ST-003 | Skipped — require full audio stack integration |

---

### 1.7 Mixer Store — `src/stores/__tests__/mixer-store.test.ts` (7 tests)

| Test name | Requirement | What it verifies |
|---|---|---|
| `P1-ST-002: initial state has channels: {} (empty record)` | P1-ST-002 | Empty channel map on start |
| `P1-ST-004: setChannelVolume(0, 80) stores volume 80 for channel 0` | P1-ST-004 | Volume action updates store |
| `P1-ST-004: setChannelPan(0, -30) stores pan -30 for channel 0` | P1-ST-004 | Pan action updates store |
| `P1-ST-004: setChannelMute(0, true) stores muted: true for channel 0` | P1-ST-004 | Mute action updates store |
| `P1-ST-004: setChannelSolo(0, true) stores solo: true for channel 0` | P1-ST-004 | Solo action updates store |
| `P1-ST-002: setting channel 9 independently does not change channel 0` | P1-ST-002 | Channel isolation |
| `P1-ST-004: getChannelState(n) returns defaults for an unset channel` | P1-ST-004 | Unset channels return defaults |

---

### 1.8 UI Components

#### PlayerLayout — `src/components/__tests__/PlayerLayout.test.tsx` (9 tests)

| Test name | Requirement | What it verifies |
|---|---|---|
| `P1-UI-008: renders a loading indicator when isLoading is true` | P1-UI-008 | Loading indicator shown while loading |
| `P1-UI-008: does not render loading indicator when isLoading is false` | P1-UI-008 | Loading indicator hidden when not loading |
| `P1-UI-009: renders an error message when error is set in player-store` | P1-UI-009 | Error message displayed on failure |
| `P1-UI-009: does not render error message when error is null` | P1-UI-009 | Error area clean when no error |
| `P1-UI-001: renders without throwing when given a midiUrl prop` | P1-UI-001 | Entry point renders cleanly |
| `P1-UI-001: renders a Transport element` | P1-UI-001 | Transport component is mounted |
| `P1-UI-001: renders a MixerBoard element` | P1-UI-001 | MixerBoard component is mounted |
| `P1-UI-001: ChopsPlayer is the exported root component (renders without throwing)` | P1-UI-001 | Named export works |
| `P1-UI-001: ChopsPlayer renders the player layout` | P1-UI-001 | Root component renders full layout |

#### Mixer — `src/components/__tests__/Mixer.test.tsx` (8 tests)

| Test name | Requirement | What it verifies |
|---|---|---|
| `P1-UI-007: renders a volume slider with the correct value` | P1-UI-007 | Volume slider displays store value |
| `P1-UI-007: renders a pan slider with the correct value` | P1-UI-007 | Pan slider displays store value |
| `P1-UI-007: renders a Mute button` | P1-UI-007 | Mute button is present |
| `P1-UI-007: renders a Solo button` | P1-UI-007 | Solo button is present |
| `P1-UI-007: moving the volume slider calls setChannelVolume with the new value` | P1-UI-007 | Volume slider interaction dispatches action |
| `P1-UI-007: clicking Mute button calls setChannelMute with channel and toggled value` | P1-UI-007 | Mute button toggle works |
| `P1-UI-007: clicking Solo button calls setChannelSolo with channel and true` | P1-UI-007 | Solo button dispatches action |
| `P1-UI-006: renders one MixerChannel per active MIDI channel (4 channels)` | P1-UI-006 | MixerBoard renders correct channel count |

#### Transport — `src/components/__tests__/Transport.test.tsx` (10 tests, 1 skipped)

| Test name | Requirement | What it verifies |
|---|---|---|
| `P1-UI-001: renders a Play button when playbackState is 'stopped'` | P1-UI-002 | Play button shown when stopped |
| `P1-UI-003: renders a Pause button when playbackState is 'playing'` | P1-UI-003 | Pause button shown when playing |
| `P1-UI-002: position display shows elapsed time at zero position` | P1-UI-002 | Position display renders |
| `P1-UI-001: the Play button is disabled when isReady is false` | P1-UI-002 | Controls disabled before init |
| `P1-UI-003: clicking Play button calls the store's play action` | P1-UI-003 | Play button dispatches action |
| `P1-UI-003: clicking Pause button calls the store's pause action` | P1-UI-003 | Pause button dispatches action |
| `P1-UI-004: clicking Stop button calls the store's stop action` | P1-UI-004 | Stop button dispatches action |
| `P1-UI-010: component modules do not export AudioContext or SpessaSynth types` | P1-UI-010 | Layer isolation — UI cannot import from `audio/` |
| `P1-UI-010: Transport renders a play button that is enabled when the player is ready` | P1-UI-010 | Controls enabled once ready |
| *(1 skipped)* `P1-UI-005: seek slider renders and updates position` | P1-UI-005 | Seek slider — deferred (not yet implemented) |

---

## Section 2 — User Journey Tests

These tests describe end-to-end scenarios from a real user's perspective in a browser. Each scenario is self-contained and can be verified by a non-technical person.

---

### Journey 1 — Load and Play a MIDI File

**Precondition:** A web server is running with `chops-player` embedded on a page, and the SoundFont file (`chops-instruments.sf2`) is available at `/soundfonts/chops-instruments.sf2`. A valid `.mid` file is accessible at a known URL (e.g. `/demos/sample.mid`).

1. Open the page in a **desktop browser** (Chrome, Firefox, or Safari).
2. **Expected:** A player UI is visible with a Transport bar (Play, Stop buttons) and a mixer area. Both buttons are visually disabled (greyed out or non-interactive).
3. **Expected:** A loading indicator (spinner or progress text) is visible while the SoundFont loads.
4. Wait until the loading indicator disappears (typically 2–5 seconds on broadband).
5. **Expected:** The Play button is now enabled (not greyed out). No error message is visible.
6. Click the **Play** button.
7. **Expected:** Audio plays through the speakers. The Play button changes to a **Pause** button. The position display starts counting up (e.g. `1:1 | 0:00`, `1:2 | 0:01`, …).
8. Click the **Pause** button.
9. **Expected:** Audio stops. The Pause button changes back to **Play**. The position display is frozen at its last value.
10. Click **Play** again.
11. **Expected:** Audio resumes from the same position where it was paused (not from the beginning).
12. Click the **Stop** button.
13. **Expected:** Audio stops. The position display resets to `1:1 | 0:00`.

---

### Journey 2 — Error Handling for a Bad MIDI URL

**Precondition:** Same as Journey 1, but the `midiUrl` prop points to a URL that returns a 404 (e.g. `/demos/nonexistent.mid`).

1. Open the page in a desktop browser.
2. Wait for the SoundFont to load (loading indicator disappears).
3. **Expected:** An error message is visible in the player UI (e.g. "Failed to load MIDI file" or similar human-readable text).
4. **Expected:** The Play and Stop buttons remain disabled.
5. **Expected:** No audio plays.
6. **Expected:** The browser console may show an error, but the page does not crash or show a blank screen.

---

### Journey 3 — Mixer Volume and Mute

**Precondition:** The player is loaded and playing audio (Journey 1 steps 1–7 completed).

1. Locate the **Mixer** section — it shows one strip per MIDI channel.
2. Find a channel strip that is producing audio (e.g. Channel 1 — usually drums or bass).
3. Drag its **Volume slider** all the way to the left (0).
4. **Expected:** That channel becomes silent. Other channels continue playing.
5. Drag the slider back to the middle (approx. 50).
6. **Expected:** Audio from that channel returns at reduced volume.
7. Click the **Mute** button on the same channel.
8. **Expected:** The channel goes silent. The Mute button appears active/highlighted.
9. Click **Mute** again.
10. **Expected:** The channel audio returns. The Mute button is no longer highlighted.

---

### Journey 4 — Solo a Channel

**Precondition:** The player is loaded and playing a MIDI file with at least 2 active channels.

1. Click the **Solo** button on Channel 1.
2. **Expected:** Only Channel 1 is audible. All other channels are silenced. The Solo button is highlighted.
3. Click **Solo** on a second channel (e.g. Channel 2).
4. **Expected:** Both Channel 1 and Channel 2 are audible. All other channels remain silent.
5. Click **Solo** on Channel 1 again (to un-solo it).
6. **Expected:** Only Channel 2 remains soloed and audible.
7. Click **Solo** on Channel 2 to deactivate it.
8. **Expected:** All channels return to their normal (non-soloed) state and all channels are audible.

---

### Journey 5 — Pan a Channel

**Precondition:** The player is loaded and playing. You are using headphones or stereo speakers.

1. Find a channel strip in the Mixer.
2. Drag the **Pan slider** all the way to the left (−100).
3. **Expected:** Audio from that channel is heard only in the left ear/speaker.
4. Drag the **Pan slider** all the way to the right (+100).
5. **Expected:** Audio from that channel is heard only in the right ear/speaker.
6. Drag the slider back to the center (0).
7. **Expected:** Audio from that channel is balanced equally between left and right.

---

### Journey 6 — Embedded in a React App (Developer Journey)

**Precondition:** A developer has added `chops-player` as a dependency and imported `<ChopsPlayer />`.

1. Add `<ChopsPlayer midiUrl="/demos/sample.mid" />` to any React component.
2. Run the app (`pnpm dev` or `npm start`).
3. **Expected:** The player renders without console errors about missing CSS or conflicting globals.
4. **Expected:** No external stylesheets are required — the player is self-contained.
5. **Expected:** The player does not break the surrounding page layout.
6. Resize the browser window.
7. **Expected:** The player layout adapts (does not overflow or collapse in an unusable way).

---

*End of testing guide.*
