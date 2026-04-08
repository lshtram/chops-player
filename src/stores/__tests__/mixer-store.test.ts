/**
 * Tests for mixer-store (src/stores/mixer-store.ts)
 *
 * API CHECKLIST — public state and actions, coverage count:
 *   channels (initial)     → 1 test  (P1-ST-002)
 *   setChannelVolume()     → 1 test  (P1-ST-004)
 *   setChannelPan()        → 1 test  (P1-ST-004)
 *   setChannelMute()       → 1 test  (P1-ST-004)
 *   setChannelSolo()       → 1 test  (P1-ST-004)
 *   cross-channel isolation→ 1 test  (P1-ST-002)
 *   getChannelState()      → 1 test  (P1-ST-004)
 *
 * Testing strategy:
 *   - Import the Zustand store directly (no React render needed)
 *   - Reset to initial state in beforeEach
 *   - Call actions and assert on resulting state
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useMixerStore } from "../../stores/mixer-store.ts";
import type { ChannelState } from "@audio/mixer.ts";

// ---------------------------------------------------------------------------
// Reset store state before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  useMixerStore.setState({ channels: {} });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("mixer-store", () => {
  describe("initial state (P1-ST-002)", () => {
    it("P1-ST-002: initial state has channels: {} (empty record)", () => {
      // Act
      const { channels } = useMixerStore.getState();

      // Assert
      expect(Object.keys(channels)).toHaveLength(0);
    });
  });

  describe("setChannelVolume() (P1-ST-004)", () => {
    it("P1-ST-004: setChannelVolume(0, 80) stores volume 80 for channel 0", () => {
      // Arrange
      const { setChannelVolume } = useMixerStore.getState();

      // Act
      setChannelVolume(0, 80);

      // Assert
      expect(useMixerStore.getState().channels[0]?.volume).toBe(80);
    });
  });

  describe("setChannelPan() (P1-ST-004)", () => {
    it("P1-ST-004: setChannelPan(0, -30) stores pan -30 for channel 0", () => {
      // Arrange
      const { setChannelPan } = useMixerStore.getState();

      // Act
      setChannelPan(0, -30);

      // Assert
      expect(useMixerStore.getState().channels[0]?.pan).toBe(-30);
    });
  });

  describe("setChannelMute() (P1-ST-004)", () => {
    it("P1-ST-004: setChannelMute(0, true) stores muted: true for channel 0", () => {
      // Arrange
      const { setChannelMute } = useMixerStore.getState();

      // Act
      setChannelMute(0, true);

      // Assert
      expect(useMixerStore.getState().channels[0]?.muted).toBe(true);
    });
  });

  describe("setChannelSolo() (P1-ST-004)", () => {
    it("P1-ST-004: setChannelSolo(0, true) stores solo: true for channel 0", () => {
      // Arrange
      const { setChannelSolo } = useMixerStore.getState();

      // Act
      setChannelSolo(0, true);

      // Assert
      expect(useMixerStore.getState().channels[0]?.solo).toBe(true);
    });
  });

  describe("channel isolation (P1-ST-002)", () => {
    it("P1-ST-002: setting channel 9 independently does not change channel 0", () => {
      // Arrange
      const { setChannelVolume } = useMixerStore.getState();

      // Act
      setChannelVolume(9, 50);

      // Assert — channel 0 is untouched
      const ch0 = useMixerStore.getState().channels[0];
      expect(ch0).toBeUndefined(); // never set — confirm isolation
    });
  });

  describe("getChannelState() (P1-ST-004)", () => {
    it("P1-ST-004: getChannelState(n) returns defaults for an unset channel", () => {
      // Arrange — channel 5 was never set
      const { getChannelState } = useMixerStore.getState();

      // Act
      const state: ChannelState = getChannelState(5);

      // Assert — should return default values
      expect(state).toEqual({ volume: 100, pan: 0, muted: false, solo: false });
    });
  });

  describe("getAllChannelStates() (P1-MX-007)", () => {
    it("P1-MX-007: getAllChannelStates() returns a ReadonlyMap of all active channels", () => {
      // Arrange — set up some channels
      const { setChannelVolume, setChannelPan, setChannelMute } = useMixerStore.getState();
      setChannelVolume(0, 80);
      setChannelPan(3, -20);
      setChannelMute(7, true);

      // Act
      const allStates = useMixerStore.getState().getAllChannelStates();

      // Assert
      expect(allStates.constructor.name).toBe("Map");
      expect(allStates.size).toBe(3);
      expect(allStates.get(0)?.volume).toBe(80);
      expect(allStates.get(3)?.pan).toBe(-20);
      expect(allStates.get(7)?.muted).toBe(true);
    });

    it("P1-MX-007: getAllChannelStates() returns empty map when no channels set", () => {
      const allStates = useMixerStore.getState().getAllChannelStates();
      expect(allStates.size).toBe(0);
    });
  });
});
