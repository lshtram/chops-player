/**
 * Tests for SoundFont loader (src/audio/soundfont-loader.ts)
 *
 * API CHECKLIST — exported function and coverage count:
 *   fetchSoundFont(url, onProgress?) → 4 tests (P1-SF-001, P1-SF-002, P1-SF-003, P1-SF-004)
 *
 * Mocking strategy:
 *   - globalThis.fetch is mocked to simulate network responses
 *   - No external dependencies — all test fixtures are inline
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSoundFont } from "../soundfont-loader.ts";
import { ChopsPlayerError } from "@model/errors.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFakeArrayBuffer(size = 1024): ArrayBuffer {
  return new ArrayBuffer(size);
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = vi.fn();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("fetchSoundFont()", () => {
  describe("P1-SF-001: returns an ArrayBuffer on success", () => {
    it("P1-SF-001: fetchSoundFont(url) returns an ArrayBuffer when the server responds with ok:true", async () => {
      // Arrange
      const fakeBuffer = makeFakeArrayBuffer(2048);
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(fakeBuffer),
      });

      // Act
      const result = await fetchSoundFont("https://example.com/test.sf2");

      // Assert
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("P1-SF-001: fetchSoundFont(url) calls fetch with the correct URL", async () => {
      // Arrange
      const fakeBuffer = makeFakeArrayBuffer();
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(fakeBuffer),
      });

      // Act
      await fetchSoundFont("https://example.com/my-font.sf2");

      // Assert
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith("https://example.com/my-font.sf2");
    });
  });

  describe("P1-SF-002: progress callback is invoked with 0-100", () => {
    it("P1-SF-002: fetchSoundFont(url, onProgress) calls the callback with progress values", async () => {
      // Arrange
      const fakeBuffer = makeFakeArrayBuffer();
      const progressValues: number[] = [];
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(fakeBuffer),
      });

      // Act
      await fetchSoundFont(
        "https://example.com/test.sf2",
        (percent) => progressValues.push(percent),
      );

      // Assert — callback was invoked at least once with a 0-100 value
      expect(progressValues.length).toBeGreaterThan(0);
      progressValues.forEach((p) => {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("P1-SF-003: throws ChopsPlayerError on failure", () => {
    it("P1-SF-003: fetchSoundFont(url) throws ChopsPlayerError on 404 (fetch ok but not ok)", async () => {
      // Arrange
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
      });

      // Act & Assert
      await expect(
        fetchSoundFont("https://example.com/not-found.sf2"),
      ).rejects.toBeInstanceOf(ChopsPlayerError);
    });

    it("P1-SF-003: fetchSoundFont(url) throws ChopsPlayerError on network error (fetch rejects)", async () => {
      // Arrange
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new TypeError("Network request failed"),
      );

      // Act & Assert
      await expect(
        fetchSoundFont("https://example.com/test.sf2"),
      ).rejects.toBeInstanceOf(ChopsPlayerError);
    });

    it("P1-SF-003: ChopsPlayerError has a meaningful error code on fetch failure", async () => {
      // Arrange
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
      });

      // Act
      let error: unknown;
      try {
        await fetchSoundFont("https://example.com/test.sf2");
      } catch (e) {
        error = e;
      }

      // Assert
      expect(error).toBeInstanceOf(ChopsPlayerError);
      expect(typeof (error as ChopsPlayerError).code).toBe("string");
      expect((error as ChopsPlayerError).code.length).toBeGreaterThan(0);
    });
  });

  describe("P1-SF-004: default path when no URL provided", () => {
    it("P1-SF-004: fetchSoundFont() (no args) uses the default path /soundfonts/chops-instruments.sf2", async () => {
      // Arrange
      const fakeBuffer = makeFakeArrayBuffer();
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(fakeBuffer),
      });

      // Act
      await fetchSoundFont();

      // Assert — fetch was called with the default path
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith("/soundfonts/chops-instruments.sf2");
    });
  });
});
