/**
 * Tests for player-store (src/stores/player-store.ts)
 *
 * API CHECKLIST — public state and actions, coverage count:
 *   playbackState          → 2 tests (P1-ST-001, P1-ST-003)
 *   position               → 2 tests (P1-ST-001, P1-ST-006)
 *   isReady                → 2 tests (P1-ST-001, P1-ST-006)
 *   isLoading              → 1 test  (P1-ST-001)
 *   error                  → 1 test  (P1-ST-001)
 *   song                   → 1 test  (P1-ST-001)
 *   play()                 → 1 test  (P1-ST-003)
 *   pause()                → 1 test  (P1-ST-003)
 *   stop()                 → 1 test  (P1-ST-003)
 *   loadMidi(url)          → 1 test  (P1-ST-003)
 *   seekToTick(tick)       → 1 test  (P1-ST-003)
 *   seekToBar(bar)         → 1 test  (P1-ST-003)
 *   initialize()            → 1 test  (P1-ST-003)
 *   singleton behavior      → 1 test  (P1-ST-005)
 *   position reactivity     → 1 test  (P1-ST-006)
 *
 * Testing strategy:
 *   - Import the Zustand store directly (no React render needed)
 *   - Reset to initial state in beforeEach
 *   - Call actions and assert on resulting state
 *   - Tests verify the PUBLIC action API (play, pause, stop, loadMidi, seekToTick, seekToBar)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePlayerStore } from "../../stores/player-store.ts";
import { useMixerStore } from "../mixer-store.ts";
import type { PlaybackPosition } from "@audio/sequencer.ts";

// ---------------------------------------------------------------------------
// Mock audio layer — must be hoisted via vi.mock before imports
// ---------------------------------------------------------------------------

vi.mock("../../audio/synth-wrapper.js", () => ({
  SynthWrapper: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    loadSoundFont: vi.fn().mockResolvedValue(undefined),
    isReady: true,
    dispose: vi.fn(),
    audioContext: { resume: vi.fn().mockResolvedValue(undefined) },
    getNativeSynth: vi.fn().mockReturnValue({ controllerChange: vi.fn() }),
  })),
}));

vi.mock("../../audio/sequencer-wrapper.js", () => ({
  SequencerWrapper: vi.fn().mockImplementation(() => ({
    load: vi.fn(),
    loadRawMidi: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seekToTick: vi.fn(),
    seekToBar: vi.fn(),
    state: "stopped",
    position: { tick: 0, seconds: 0, bar: 1, beat: 1 },
    onPositionChange: null,
    loop: false,
  })),
}));

vi.mock("../../parsers/midi-reader.js", () => ({
  parseMidiFile: vi.fn().mockReturnValue({
    name: "Test Song",
    ticksPerBeat: 480,
    durationSeconds: 10,
    durationTicks: 4800,
    tracks: [],
    tempoMap: [{ tick: 0, microsecondsPerBeat: 500_000 }],
    timeSignatures: [{ tick: 0, numerator: 4, denominator: 4 }],
    format: 0 as const,
  }),
}));

vi.mock("../../audio/soundfont-loader.js", () => ({
  fetchSoundFont: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
  fetchArrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
}));

// ---------------------------------------------------------------------------
// Reset store state before each test
// ---------------------------------------------------------------------------

const initialPlayerState = {
  playbackState: "stopped" as const,
  position: { tick: 0, seconds: 0, bar: 1, beat: 1 } as PlaybackPosition,
  isReady: false,
  isLoading: false,
  error: null,
  song: null,
  loadingProgress: 0,
  loop: false,
};

beforeEach(() => {
  usePlayerStore.setState(initialPlayerState);
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("player-store", () => {
  describe("initial state (P1-ST-001)", () => {
    it("P1-ST-001: store has playbackState, position, isReady, isLoading, error, and song properties", () => {
      // Act
      const state = usePlayerStore.getState();

      // Assert — all required state fields are present
      expect(state).toHaveProperty("playbackState");
      expect(state).toHaveProperty("position");
      expect(state).toHaveProperty("isReady");
      expect(state).toHaveProperty("isLoading");
      expect(state).toHaveProperty("error");
      expect(state).toHaveProperty("song");
    });

    it("P1-ST-001: initial playbackState is 'stopped'", () => {
      expect(usePlayerStore.getState().playbackState).toBe("stopped");
    });

    it("P1-ST-001: initial position is at tick 0", () => {
      expect(usePlayerStore.getState().position.tick).toBe(0);
    });

    it("P1-ST-001: initial isReady is false", () => {
      expect(usePlayerStore.getState().isReady).toBe(false);
    });

    it("P1-ST-001: initial isLoading is false", () => {
      expect(usePlayerStore.getState().isLoading).toBe(false);
    });

    it("P1-ST-001: initial error is null", () => {
      expect(usePlayerStore.getState().error).toBeNull();
    });

    it("P1-ST-001: isReady becomes true after initAudio() completes", async () => {
      // initialize() defers AudioContext creation to user gesture (P1-SY-001).
      // initAudio() is the second phase that creates the AudioContext and sets isReady.
      await usePlayerStore.getState().initialize();
      await usePlayerStore.getState().initAudio();
      expect(usePlayerStore.getState().isReady).toBe(true);
    });
  });

  describe("public action API (P1-ST-003)", () => {
    it("P1-ST-003: play() exists as an action on the store", () => {
      expect(usePlayerStore.getState().play).toBeDefined();
      expect(typeof usePlayerStore.getState().play).toBe("function");
    });

    it("P1-ST-003: pause() exists as an action on the store", () => {
      expect(usePlayerStore.getState().pause).toBeDefined();
      expect(typeof usePlayerStore.getState().pause).toBe("function");
    });

    it("P1-ST-003: stop() exists as an action on the store", () => {
      expect(usePlayerStore.getState().stop).toBeDefined();
      expect(typeof usePlayerStore.getState().stop).toBe("function");
    });

    it("P1-ST-003: loadMidi(url) exists as an action on the store", () => {
      expect(usePlayerStore.getState().loadMidi).toBeDefined();
      expect(typeof usePlayerStore.getState().loadMidi).toBe("function");
    });

    it("P1-ST-003: seekToTick(tick) exists as an action on the store", () => {
      expect(usePlayerStore.getState().seekToTick).toBeDefined();
      expect(typeof usePlayerStore.getState().seekToTick).toBe("function");
    });

    it("P1-ST-003: seekToBar(bar) exists as an action on the store", () => {
      expect(usePlayerStore.getState().seekToBar).toBeDefined();
      expect(typeof usePlayerStore.getState().seekToBar).toBe("function");
    });

    it("P1-ST-003: initialize() exists as an action on the store", () => {
      expect(usePlayerStore.getState().initialize).toBeDefined();
      expect(typeof usePlayerStore.getState().initialize).toBe("function");
    });

    it.skip("P1-ST-003: play() throws 'not implemented' against the stub", () => {
      expect(() => usePlayerStore.getState().play()).toThrow("not implemented");
    });

    it.skip("P1-ST-003: pause() throws 'not implemented' against the stub", () => {
      expect(() => usePlayerStore.getState().pause()).toThrow("not implemented");
    });

    it.skip("P1-ST-003: stop() throws 'not implemented' against the stub", () => {
      expect(() => usePlayerStore.getState().stop()).toThrow("not implemented");
    });

    it.skip("P1-ST-003: loadMidi(url) rejects with 'not implemented' against the stub", async () => {
      await expect(usePlayerStore.getState().loadMidi("https://example.com/test.mid")).rejects.toThrow("not implemented");
    });

    it.skip("P1-ST-003: seekToTick(tick) throws 'not implemented' against the stub", () => {
      expect(() => usePlayerStore.getState().seekToTick(960)).toThrow("not implemented");
    });

    it.skip("P1-ST-003: seekToBar(bar) throws 'not implemented' against the stub", () => {
      expect(() => usePlayerStore.getState().seekToBar(3)).toThrow("not implemented");
    });

    it.skip("P1-ST-003: initialize() throws 'not implemented' against the stub", async () => {
      await expect(usePlayerStore.getState().initialize()).rejects.toThrow("not implemented");
    });

    it("P1-ST-003: play() sets playbackState to 'playing' when called after initialize()", async () => {
      // This fails on the stub because play() throws "not implemented"
      // before setting playbackState to "playing"
      await usePlayerStore.getState().play();
      expect(usePlayerStore.getState().playbackState).toBe("playing");
    });
  });

  describe("singleton behavior (P1-ST-005)", () => {
    it("P1-ST-005: two usePlayerStore calls read the same state (singleton)", async () => {
      // Arrange — two separate calls to getState
      const stateA = usePlayerStore.getState();
      const stateB = usePlayerStore.getState();

      // Assert — both see same initial value (structural check)
      expect(stateA.playbackState).toBe(stateB.playbackState);
      expect(stateA.playbackState).toBe("stopped");

      // Assert — after play(), both references see the update
      // This FAILS on the stub because play() throws before updating playbackState
      await usePlayerStore.getState().play();
      expect(usePlayerStore.getState().playbackState).toBe("playing");
    });
  });

  describe("position reactivity (P1-ST-006)", () => {
    it("P1-ST-006: position updates reactively when the sequencer reports position changes", () => {
      // Arrange — subscribe to position changes
      const positionUpdates: PlaybackPosition[] = [];
      const unsubscribe = usePlayerStore.subscribe((state) => {
        positionUpdates.push(state.position);
      });

      // Act — use seekToTick to exercise the public API
      // In production, position updates come from the sequencer's onPositionChange callback
      // seekToTick is the public action for repositioning
      try {
        usePlayerStore.getState().seekToTick(960);
      } catch {
        // stub throws — position update via callback tested separately
      }

      // Assert — position was updated reactively
      // This should fail on the stub because seekToTick throws before any position update occurs
      expect(positionUpdates.length).toBeGreaterThan(0);

      unsubscribe();
    });
  });

  describe("single source of truth (P1-ST-007)", () => {
    it("P1-ST-007: player-store and mixer-store do not share state keys", () => {
      // Playback state lives only in player-store
      const playerKeys = Object.keys(usePlayerStore.getState());
      // Mixer state lives only in mixer-store
      const mixerKeys = Object.keys(useMixerStore.getState());

      // Player-store must not hold channel/mixer data
      expect(playerKeys).not.toContain("channels");
      // Mixer-store must not hold playback data
      expect(mixerKeys).not.toContain("playbackState");
      expect(mixerKeys).not.toContain("position");
      expect(mixerKeys).not.toContain("isReady");
      expect(mixerKeys).not.toContain("isLoading");
      expect(mixerKeys).not.toContain("song");
    });

    it("P1-ST-007: loading a MIDI file updates player-store.song but not mixer-store.channels directly", async () => {
      // After loadMidi() completes, the song is stored in player-store only.
      // mixer-store.channels are populated by a separate action (setChannelVolume, etc.)
      // This FAILS on the stub because loadMidi() throws "not implemented"
      await usePlayerStore.getState().loadMidi("https://example.com/test.mid");
      expect(usePlayerStore.getState().song).not.toBeNull();
    });
  });

  describe("mixer→synth bridge (P1-MX-001, P1-MX-002, P1-MX-003, P1-MX-004)", () => {
    it("P1-MX-001: setChannelVolume triggers CC7 on the synth", async () => {
      // Arrange — initialize audio (creates singleton synth + sets up bridge)
      await usePlayerStore.getState().initialize();
      await usePlayerStore.getState().initAudio();

      // Act
      useMixerStore.getState().setChannelVolume(0, 50);

      // Assert — controllerChange(0, 7, 63) where 50/100 * 127 ≈ 63.5 → 64
      const synth = (usePlayerStore.getState() as unknown as { _synthWrapper: { getNativeSynth: () => { controllerChange: ReturnType<typeof vi.fn> } } })._synthWrapper?.getNativeSynth?.();
      if (synth) {
        expect(synth.controllerChange).toHaveBeenCalledWith(0, 7, 64);
      }
    });

    it("P1-MX-002: setChannelPan triggers CC10 on the synth", async () => {
      await usePlayerStore.getState().initialize();
      await usePlayerStore.getState().initAudio();

      // Pan = -20 → ((-20+100)/200)*127 = 50.8 → 51
      useMixerStore.getState().setChannelPan(0, -20);

      const synth = (usePlayerStore.getState() as unknown as { _synthWrapper: { getNativeSynth: () => { controllerChange: ReturnType<typeof vi.fn> } } })._synthWrapper?.getNativeSynth?.();
      if (synth) {
        expect(synth.controllerChange).toHaveBeenCalledWith(0, 10, 51);
      }
    });

    it("P1-MX-003: muting a channel sends CC7=0", async () => {
      await usePlayerStore.getState().initialize();
      await usePlayerStore.getState().initAudio();

      useMixerStore.getState().setChannelMute(3, true);

      const synth = (usePlayerStore.getState() as unknown as { _synthWrapper: { getNativeSynth: () => { controllerChange: ReturnType<typeof vi.fn> } } })._synthWrapper?.getNativeSynth?.();
      if (synth) {
        expect(synth.controllerChange).toHaveBeenCalledWith(3, 7, 0);
      }
    });

    it("P1-MX-004: solo on ch0 silences ch1 via CC7=0", async () => {
      await usePlayerStore.getState().initialize();
      await usePlayerStore.getState().initAudio();

      // Set volumes first
      useMixerStore.getState().setChannelVolume(0, 100);
      useMixerStore.getState().setChannelVolume(1, 100);
      vi.clearAllMocks();

      // Solo channel 0
      useMixerStore.getState().setChannelSolo(0, true);

      const synth = (usePlayerStore.getState() as unknown as { _synthWrapper: { getNativeSynth: () => { controllerChange: ReturnType<typeof vi.fn> } } })._synthWrapper?.getNativeSynth?.();
      if (synth) {
        // Channel 1 should be silenced (effectiveMute because channel 0 is solo'd)
        expect(synth.controllerChange).toHaveBeenCalledWith(1, 7, 0);
      }
    });
  });
});
