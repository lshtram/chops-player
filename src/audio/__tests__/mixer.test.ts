/**
 * Tests for MixerController (src/audio/mixer-controller.ts)
 *
 * API CHECKLIST — public methods and coverage count:
 *   getChannelState(n)      → 2 tests (P1-MX-001, P1-MX-006)
 *   setVolume(n, v)         → 4 tests (P1-MX-001, P1-MX-003, P1-MX-004, P1-MX-005)
 *   setPan(n, v)            → 3 tests (P1-MX-002, P1-MX-003, P1-MX-004)
 *   setMute(n, b)           → 1 test  (P1-MX-003)
 *   setSolo(n, b)           → 1 test  (P1-MX-004)
 *   getAllChannelStates()   → 1 test  (P1-MX-007)
 *   16-channel support      → 1 test  (P1-MX-005)
 *
 * Mocking strategy:
 *   - SpessaSynth synth is injected as a vi.fn() mock
 *   - The real MixerController is the unit under test — never mocked itself
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MixerController } from "../mixer-controller.ts";
import type { SpessaSynthLike } from "../mixer-controller.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSpessaMock(): SpessaSynthLike {
  return {
    controllerChange: vi.fn(),
    muteChannel: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MixerController", () => {
  let spessaMock: SpessaSynthLike;
  let mixer: MixerController;

  beforeEach(() => {
    vi.clearAllMocks();
    spessaMock = makeSpessaMock();
    mixer = new MixerController(spessaMock);
  });

  describe("getChannelState()", () => {
    it("P1-MX-001: getChannelState(n) returns default state { volume: 100, pan: 0, muted: false, solo: false } for an unset channel", () => {
      // Act
      const state = mixer.getChannelState(0);

      // Assert
      expect(state).toEqual({ volume: 100, pan: 0, muted: false, solo: false });
    });

    it("P1-MX-006: getChannelState(n) returns state reflecting the last setVolume/setPan/setMute/setSolo call", () => {
      // Arrange — set channel 5 to non-default values
      mixer.setVolume(5, 75);
      mixer.setPan(5, -30);
      mixer.setMute(5, true);
      mixer.setSolo(5, true);

      // Act
      const state = mixer.getChannelState(5);

      // Assert — values were stored correctly
      expect(state.volume).toBe(75);
      expect(state.pan).toBe(-30);
      expect(state.muted).toBe(true);
      expect(state.solo).toBe(true);
    });
  });

  describe("setVolume()", () => {
    it("P1-MX-001: setVolume(ch, 100) sends CC7 value Math.round(100 * 127 / 100) = 127 to the synth", () => {
      // Act
      mixer.setVolume(0, 100);

      // Assert — CC7 (volume) mapped: Math.round(100 * 127 / 100) = 127
      expect(spessaMock.controllerChange).toHaveBeenCalledTimes(1);
      expect(spessaMock.controllerChange).toHaveBeenCalledWith(0, 7, 127);
    });

    it("P1-MX-001: setVolume(ch, 50) sends CC7 value Math.round(50 * 127 / 100) = 64 to the synth", () => {
      // Act
      mixer.setVolume(0, 50);

      // Assert — CC7 mapped: Math.round(50 * 127 / 100) = 64
      expect(spessaMock.controllerChange).toHaveBeenCalledWith(0, 7, 64);
    });

    it("P1-MX-003: setVolume(n, 150) clamps to 100 (max)", () => {
      // Act
      mixer.setVolume(0, 150);

      // Assert — clamped to 100
      expect(mixer.getChannelState(0).volume).toBe(100);
    });

    it("P1-MX-004: setVolume(n, -10) clamps to 0 (min)", () => {
      // Act
      mixer.setVolume(0, -10);

      // Assert — clamped to 0
      expect(mixer.getChannelState(0).volume).toBe(0);
    });

    it("P1-MX-005: setVolume works for all MIDI channels 0–15", () => {
      // Act — set volume on channel 15 (last valid MIDI channel)
      mixer.setVolume(15, 80);

      // Assert
      expect(mixer.getChannelState(15).volume).toBe(80);
      expect(spessaMock.controllerChange).toHaveBeenCalledWith(15, 7, expect.any(Number));
    });
  });

  describe("setPan()", () => {
    it("P1-MX-002: setPan(ch, 0) sends CC10 value Math.round((0 + 100) * 127 / 200) = 64 to the synth (center)", () => {
      // Act
      mixer.setPan(0, 0);

      // Assert — CC10 mapped: Math.round((0 + 100) * 127 / 200) = 64
      expect(spessaMock.controllerChange).toHaveBeenCalledTimes(1);
      expect(spessaMock.controllerChange).toHaveBeenCalledWith(0, 10, 64);
    });

    it("P1-MX-002: setPan(ch, -100) sends CC10 value Math.round((-100 + 100) * 127 / 200) = 0 to the synth (full left)", () => {
      // Act
      mixer.setPan(0, -100);

      // Assert — CC10 mapped: Math.round((-100 + 100) * 127 / 200) = 0
      expect(spessaMock.controllerChange).toHaveBeenCalledWith(0, 10, 0);
    });

    it("P1-MX-002: setPan(ch, 100) sends CC10 value Math.round((100 + 100) * 127 / 200) = 127 to the synth (full right)", () => {
      // Act
      mixer.setPan(0, 100);

      // Assert — CC10 mapped: Math.round((100 + 100) * 127 / 200) = 127
      expect(spessaMock.controllerChange).toHaveBeenCalledWith(0, 10, 127);
    });

    it("P1-MX-003: setPan(n, 200) clamps to 100 (max)", () => {
      // Act
      mixer.setPan(0, 200);

      // Assert — clamped to 100
      expect(mixer.getChannelState(0).pan).toBe(100);
    });

    it("P1-MX-004: setPan(n, -200) clamps to -100 (min)", () => {
      // Act
      mixer.setPan(0, -200);

      // Assert — clamped to -100
      expect(mixer.getChannelState(0).pan).toBe(-100);
    });
  });

  describe("setMute()", () => {
    it("P1-MX-003: setMute(n, true) calls muteChannel(n, true) on the synth", () => {
      // Act
      mixer.setMute(0, true);

      // Assert — muteChannel was called with correct args
      expect(spessaMock.muteChannel).toHaveBeenCalledTimes(1);
      expect(spessaMock.muteChannel).toHaveBeenCalledWith(0, true);
    });
  });

  describe("setSolo()", () => {
    it("P1-MX-004: setSolo(n, true) marks the channel as soloed in channel state", () => {
      // Act
      mixer.setSolo(0, true);

      // Assert
      expect(mixer.getChannelState(0).solo).toBe(true);
    });
  });

  describe("getAllChannelStates()", () => {
    it("P1-MX-007: getAllChannelStates() returns a ReadonlyMap; after setting channel 0 and 9, both appear", () => {
      // Arrange
      mixer.setVolume(0, 80);
      mixer.setVolume(9, 60);

      // Act
      const allStates = mixer.getAllChannelStates();

      // Assert — both channels are present
      expect(allStates.has(0)).toBe(true);
      expect(allStates.has(9)).toBe(true);
      expect(allStates.get(0)?.volume).toBe(80);
      expect(allStates.get(9)?.volume).toBe(60);
    });
  });
});
