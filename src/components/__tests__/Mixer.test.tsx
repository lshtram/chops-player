/**
 * Tests for Mixer components (src/components/Mixer.tsx)
 *
 * API CHECKLIST — component behaviors and coverage count:
 *   MixerChannel volume slider render → 1 test  (P1-UI-007)
 *   MixerChannel pan slider render    → 1 test  (P1-UI-007)
 *   MixerChannel mute button render  → 1 test  (P1-UI-007)
 *   MixerChannel solo button render  → 1 test  (P1-UI-007)
 *   Volume slider interaction         → 1 test  (P1-UI-007)
 *   Mute button interaction          → 1 test  (P1-UI-007)
 *   Solo button interaction          → 1 test  (P1-UI-007)
 *   MixerBoard renders channels      → 1 test  (P1-UI-006)
 *
 * Mocking strategy:
 *   - @stores/mixer-store is mocked entirely via vi.mock
 *   - No audio layer is touched in component tests
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MixerChannel, MixerBoard } from "../Mixer.tsx";

// ---------------------------------------------------------------------------
// Mock setup — use vi.hoisted() so mock functions are available when the
// vi.mock factory runs (vi.mock is hoisted before const declarations)
// ---------------------------------------------------------------------------

const {
  mockSetChannelVolume,
  mockSetChannelPan,
  mockSetChannelMute,
  mockSetChannelSolo,
} = vi.hoisted(() => ({
  mockSetChannelVolume: vi.fn(),
  mockSetChannelPan: vi.fn(),
  mockSetChannelMute: vi.fn(),
  mockSetChannelSolo: vi.fn(),
}));

vi.mock("@stores/mixer-store", () => ({
  useMixerStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      channels: {
        0: { volume: 80, pan: -20, muted: false, solo: false },
        1: { volume: 100, pan: 0, muted: false, solo: false },
        2: { volume: 60, pan: 30, muted: true, solo: false },
        3: { volume: 90, pan: -10, muted: false, solo: true },
      } as Record<number, { volume: number; pan: number; muted: boolean; solo: boolean }>,
      setChannelVolume: mockSetChannelVolume,
      setChannelPan: mockSetChannelPan,
      setChannelMute: mockSetChannelMute,
      setChannelSolo: mockSetChannelSolo,
    };
    return selector ? selector(state) : state;
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MixerChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("P1-UI-007: mixer channel strip controls", () => {
    it("P1-UI-007: renders a volume slider with the correct value", () => {
      // Arrange
      const props = { channel: 0, volume: 80, pan: -20, muted: false, solo: false };

      // Act
      render(React.createElement(MixerChannel, props));

      // Assert — look for a slider with value 80
      const slider = screen.getByRole("slider", { name: /volume/i });
      expect(slider).toBeInTheDocument();
      expect((slider as HTMLInputElement).value).toBe("80");
    });

    it("P1-UI-007: renders a pan slider with the correct value", () => {
      // Arrange
      const props = { channel: 0, volume: 80, pan: -20, muted: false, solo: false };

      // Act
      render(React.createElement(MixerChannel, props));

      // Assert
      const slider = screen.getByRole("slider", { name: /pan/i });
      expect(slider).toBeInTheDocument();
      expect((slider as HTMLInputElement).value).toBe("-20");
    });

    it("P1-UI-007: renders a Mute button", () => {
      // Arrange
      const props = { channel: 0, volume: 80, pan: -20, muted: false, solo: false };

      // Act
      render(React.createElement(MixerChannel, props));

      // Assert
      const muteButton = screen.getByRole("button", { name: /mute/i });
      expect(muteButton).toBeInTheDocument();
    });

    it("P1-UI-007: renders a Solo button", () => {
      // Arrange
      const props = { channel: 0, volume: 80, pan: -20, muted: false, solo: false };

      // Act
      render(React.createElement(MixerChannel, props));

      // Assert
      const soloButton = screen.getByRole("button", { name: /solo/i });
      expect(soloButton).toBeInTheDocument();
    });

    it("P1-UI-007: moving the volume slider calls setChannelVolume with the new value", async () => {
      // Arrange
      const props = { channel: 0, volume: 80, pan: -20, muted: false, solo: false };
      render(React.createElement(MixerChannel, props));

      // Act — simulate slider change
      const slider = screen.getByRole("slider", { name: /volume/i });
      fireEvent.change(slider, { target: { value: "65" } });

      // Assert
      expect(mockSetChannelVolume).toHaveBeenCalledTimes(1);
      expect(mockSetChannelVolume).toHaveBeenCalledWith(0, 65);
    });

    it("P1-UI-007: clicking Mute button calls setChannelMute with channel and toggled value", () => {
      // Arrange
      const props = { channel: 0, volume: 80, pan: -20, muted: false, solo: false };
      render(React.createElement(MixerChannel, props));

      // Act
      const muteButton = screen.getByRole("button", { name: /mute/i });
      fireEvent.click(muteButton);

      // Assert — current muted is false, so should toggle to true
      expect(mockSetChannelMute).toHaveBeenCalledTimes(1);
      expect(mockSetChannelMute).toHaveBeenCalledWith(0, true);
    });

    it("P1-UI-007: clicking Solo button calls setChannelSolo with channel and true", () => {
      // Arrange
      const props = { channel: 0, volume: 80, pan: -20, muted: false, solo: false };
      render(React.createElement(MixerChannel, props));

      // Act
      const soloButton = screen.getByRole("button", { name: /solo/i });
      fireEvent.click(soloButton);

      // Assert
      expect(mockSetChannelSolo).toHaveBeenCalledTimes(1);
      expect(mockSetChannelSolo).toHaveBeenCalledWith(0, true);
    });
  });
});

describe("MixerBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("P1-UI-006", () => {
    it("P1-UI-006: renders one MixerChannel per active MIDI channel (4 channels)", () => {
      // Arrange — 4 channels: 0, 1, 2, 3
      const channelNumbers = [0, 1, 2, 3] as const;

      // Act
      render(React.createElement(MixerBoard, { channels: channelNumbers }));

      // Assert — should have 4 mixer channel strips
      const channels = screen.getAllByTestId("mixer-channel");
      expect(channels).toHaveLength(4);
    });
  });
});
