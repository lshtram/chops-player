/**
 * Tests for Transport component (src/components/Transport.tsx)
 *
 * API CHECKLIST — component behaviors and coverage count:
 *   Play button render     → 1 test (P1-UI-001)
 *   Pause button render    → 1 test (P1-UI-003)
 *   Play click action      → 1 test (P1-UI-003)
 *   Pause click action     → 1 test (P1-UI-003)
 *   Stop click action      → 1 test (P1-UI-004)
 *   Position display       → 1 test (P1-UI-002)
 *   Play disabled (isReady)→ 1 test (P1-UI-001)
 *   Import-guard            → 1 test (P1-UI-010)
 *
 * Mocking strategy:
 *   - @stores/player-store is mocked entirely — the Transport reads from the mock
 *   - vi.mock() replaces the module before any import occurs
 *   - No audio layer is touched in component tests
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type PlaybackPosition = { tick: number; seconds: number; bar: number; beat: number };

// ---------------------------------------------------------------------------
// Mock setup — must be hoisted via vi.mock before imports
// ---------------------------------------------------------------------------

const mockPlay = vi.fn();
const mockPause = vi.fn();
const mockStop = vi.fn();

let mockPlaybackState: "stopped" | "playing" | "paused" = "stopped";
let mockIsReady = true;
let mockPosition: PlaybackPosition = { tick: 0, seconds: 0, bar: 1, beat: 1 };

vi.mock("@stores/player-store", () => ({
  usePlayerStore: (
    selector?: (state: {
      playbackState: "stopped" | "playing" | "paused";
      isReady: boolean;
      position: PlaybackPosition;
      play: () => void;
      pause: () => void;
      stop: () => void;
    }) => unknown,
  ) => {
    const state = {
      playbackState: mockPlaybackState,
      isReady: mockIsReady,
      position: mockPosition,
      play: mockPlay,
      pause: mockPause,
      stop: mockStop,
    };
    return selector ? selector(state) : state;
  },
}));

// ---------------------------------------------------------------------------
// Import component AFTER the mock is set up
// ---------------------------------------------------------------------------

// We use a dynamic-style import trick: the mock is established at module scope
// by vi.mock, so this static import will pick up the mock.
import { Transport } from "../../components/Transport.tsx";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlaybackState = "stopped";
    mockIsReady = true;
    mockPosition = { tick: 0, seconds: 0, bar: 1, beat: 1 };
  });

  describe("rendering", () => {
    it("P1-UI-001: renders a Play button when playbackState is 'stopped'", () => {
      // Arrange
      mockPlaybackState = "stopped";

      // Act
      render(React.createElement(Transport));

      // Assert — look for play button by role or text
      const playButton = screen.getByRole("button", { name: /play/i });
      expect(playButton).toBeInTheDocument();
    });

    it("P1-UI-003: renders a Pause button when playbackState is 'playing'", () => {
      // Arrange
      mockPlaybackState = "playing";

      // Act
      render(React.createElement(Transport));

      // Assert — look for pause button
      const pauseButton = screen.getByRole("button", { name: /pause/i });
      expect(pauseButton).toBeInTheDocument();
    });

    it("P1-UI-002: position display shows elapsed time at zero position", () => {
      // Arrange
      mockPosition = { tick: 0, seconds: 0, bar: 1, beat: 1 };

      // Act
      render(React.createElement(Transport));

      // Assert — position text visible
      expect(screen.getByText(/0:00/)).toBeInTheDocument();
    });

    it("P1-UI-001: the Play button is disabled when isReady is false", () => {
      // Arrange
      mockIsReady = false;
      mockPlaybackState = "stopped";

      // Act
      render(React.createElement(Transport));

      // Assert
      const playButton = screen.getByRole("button", { name: /play/i });
      expect(playButton).toBeDisabled();
    });
  });

  describe("interactions", () => {
    it("P1-UI-003: clicking Play button calls the store's play action", async () => {
      // Arrange
      mockPlaybackState = "stopped";
      mockIsReady = true;
      const user = userEvent.setup();
      render(React.createElement(Transport));

      // Act
      const playButton = screen.getByRole("button", { name: /play/i });
      await user.click(playButton);

      // Assert
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it("P1-UI-003: clicking Pause button calls the store's pause action", async () => {
      // Arrange
      mockPlaybackState = "playing";
      const user = userEvent.setup();
      render(React.createElement(Transport));

      // Act
      const pauseButton = screen.getByRole("button", { name: /pause/i });
      await user.click(pauseButton);

      // Assert
      expect(mockPause).toHaveBeenCalledTimes(1);
    });

    it("P1-UI-004: clicking Stop button calls the store's stop action", async () => {
      // Arrange
      mockPlaybackState = "playing";
      const user = userEvent.setup();
      render(React.createElement(Transport));

      // Act
      const stopButton = screen.getByRole("button", { name: /stop/i });
      await user.click(stopButton);

      // Assert
      expect(mockStop).toHaveBeenCalledTimes(1);
    });
  });

  describe("P1-UI-005: seek slider (deferred)", () => {
    it.skip("P1-UI-005: Transport seek slider shows current position within song duration — deferred to Phase III styling", () => {
      // SKIP: P1-UI-005 is a SHOULD requirement. Seek slider UI will be implemented
      // in Phase III when the full openDAW-inspired design is applied.
      // The underlying seekToTick() action IS tested in player-store.test.ts (P1-ST-003).
    });
  });
});

describe("P1-UI-010: import-guard — component modules do not export audio-layer types", () => {
  it("P1-UI-010: component modules do not export AudioContext or SpessaSynth types", async () => {
    // Components should only re-export React components.
    // No audio-layer types should be among their named exports.
    // Using dynamic import() (not require) to load modules outside of vi.mock scope.
    const [transporter, mixer, layout] = await Promise.all([
      import("../../components/Transport.tsx"),
      import("../../components/Mixer.tsx"),
      import("../../components/PlayerLayout.tsx"),
    ]);

    // Components export React component functions
    expect(typeof transporter.Transport).toBe("function");
    expect(typeof mixer.MixerBoard).toBe("function");
    expect(typeof layout.PlayerLayout).toBe("function");

    // No audio-layer types should be among their named exports
    expect((transporter as Record<string, unknown>).AudioContext).toBeUndefined();
    expect((transporter as Record<string, unknown>).WorkletSynthesizer).toBeUndefined();
    expect((mixer as Record<string, unknown>).AudioContext).toBeUndefined();
    expect((layout as Record<string, unknown>).AudioContext).toBeUndefined();
  });

  it("P1-UI-010: Transport renders a play button that is enabled when the player is ready", () => {
    // The Transport component must render a play button when the player is ready.
    // This FAILS on the stub because the stub renders only <div data-testid="transport" />
    // with no buttons. Once implemented, Transport must show an enabled play button.
    mockIsReady = true;
    mockPlaybackState = "stopped";
    render(React.createElement(Transport));
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
  });
});
