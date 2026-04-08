/**
 * Tests for PlayerLayout component (src/components/PlayerLayout.tsx)
 *
 * API CHECKLIST — component behaviors and coverage count:
 *   PlayerLayout renders                → 1 test (P1-UI-001)
 *   ChopsPlayer is the exported root   → 1 test (P1-UI-001)
 *   Loading indicator renders          → 1 test (P1-UI-008)
 *   Error message renders              → 1 test (P1-UI-009)
 *   Renders Transport                  → 1 test (P1-UI-001)
 *   Renders MixerBoard                 → 1 test (P1-UI-001)
 *
 * Mocking strategy:
 *   - @stores/player-store is mocked entirely via vi.mock
 *   - @stores/mixer-store is mocked entirely via vi.mock
 *   - No audio layer is touched in component tests
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayerLayout, ChopsPlayer } from "../PlayerLayout.tsx";

// ---------------------------------------------------------------------------
// Mock setup — use vi.hoisted() so mock functions are available when the
// vi.mock factory runs (vi.mock is hoisted before const declarations).
// Dynamic state vars (mockIsLoading, mockError) are module-level lets that
// are read fresh on each call via the dynamic state factory pattern.
// ---------------------------------------------------------------------------

const { mockPlay, mockPause, mockStop, mockInitialize } = vi.hoisted(() => ({
  mockPlay: vi.fn(),
  mockPause: vi.fn(),
  mockStop: vi.fn(),
  mockInitialize: vi.fn().mockResolvedValue(undefined),
}));

let mockIsLoading = false;
let mockError: string | null = null;

vi.mock("@stores/player-store", () => ({
  // Dynamic factory: re-reads mockIsLoading/mockError on each hook call
  // so that tests can set them before rendering.
  usePlayerStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      playbackState: "stopped" as const,
      isReady: true,
      isLoading: mockIsLoading,
      error: mockError,
      position: { tick: 0, seconds: 0, bar: 1, beat: 1 },
      song: null,
      play: mockPlay,
      pause: mockPause,
      stop: mockStop,
      initialize: mockInitialize,
      loadMidi: vi.fn(),
      loadMidiBuffer: vi.fn(),
      seekToTick: vi.fn(),
      seekToBar: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock("@stores/mixer-store", () => ({
  useMixerStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      channels: { 0: { volume: 100, pan: 0, muted: false, solo: false } },
      setChannelVolume: vi.fn(),
      setChannelPan: vi.fn(),
      setChannelMute: vi.fn(),
      setChannelSolo: vi.fn(),
      getChannelState: () => ({ volume: 100, pan: 0, muted: false, solo: false }),
    };
    return selector ? selector(state) : state;
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PlayerLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockError = null;
  });

  describe("P1-UI-008: loading indicator", () => {
    it("P1-UI-008: renders a loading indicator when isLoading is true in player-store", () => {
      // Arrange
      mockIsLoading = true;

      // Act
      render(React.createElement(PlayerLayout, { midiUrl: "https://example.com/song.mid" }));

      // Assert — loading indicator should be visible
      // The stub implementation should render a loading indicator div
      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });

    it("P1-UI-008: does not render loading indicator when isLoading is false", () => {
      // Arrange
      mockIsLoading = false;

      // Act
      render(React.createElement(PlayerLayout, { midiUrl: "https://example.com/song.mid" }));

      // Assert — loading indicator should not be present
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
    });
  });

  describe("P1-UI-009: error display", () => {
    it("P1-UI-009: renders an error message when error is set in player-store", () => {
      // Arrange
      mockError = "Failed to load SoundFont";

      // Act
      render(React.createElement(PlayerLayout, { midiUrl: "https://example.com/song.mid" }));

      // Assert — error message should be visible
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByText(/Failed to load SoundFont/)).toBeInTheDocument();
    });

    it("P1-UI-009: does not render error message when error is null", () => {
      // Arrange
      mockError = null;

      // Act
      render(React.createElement(PlayerLayout, { midiUrl: "https://example.com/song.mid" }));

      // Assert
      expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
    });
  });

  describe("P1-UI-001: ChopsPlayer entry point", () => {
    it("P1-UI-001: renders without throwing when given a midiUrl prop", () => {
      // Act & Assert — should not throw
      expect(() =>
        render(React.createElement(PlayerLayout, { midiUrl: "https://example.com/song.mid" })),
      ).not.toThrow();
    });

    it("P1-UI-001: renders a Transport element", () => {
      // Act
      render(React.createElement(PlayerLayout, { midiUrl: "https://example.com/song.mid" }));

      // Assert — Transport should be present (via data-testid or rendered markup)
      // The stub renders <div data-testid="transport" />, so we check that ID exists
      expect(screen.getByTestId("transport")).toBeInTheDocument();
    });

    it("P1-UI-001: renders a MixerBoard element", () => {
      // Act
      render(React.createElement(PlayerLayout, { midiUrl: "https://example.com/song.mid" }));

      // Assert — MixerBoard should be present
      expect(screen.getByTestId("mixer-board")).toBeInTheDocument();
    });
  });
});

describe("ChopsPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockError = null;
  });

  describe("P1-UI-001: ChopsPlayer as exported root", () => {
    it("P1-UI-001: ChopsPlayer is the exported root component (renders without throwing)", () => {
      // Act & Assert
      expect(() =>
        render(React.createElement(ChopsPlayer, { midiUrl: "https://example.com/song.mid" })),
      ).not.toThrow();
    });

    it("P1-UI-001: ChopsPlayer renders the player layout", () => {
      // Act
      render(React.createElement(ChopsPlayer, { midiUrl: "https://example.com/song.mid" }));

      // Assert — should have the player layout
      expect(screen.getByTestId("player-layout")).toBeInTheDocument();
    });
  });
});
