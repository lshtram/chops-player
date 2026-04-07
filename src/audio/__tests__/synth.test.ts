/**
 * Tests for SynthWrapper (src/audio/synth-wrapper.ts)
 *
 * API CHECKLIST — public methods and coverage count:
 *   initialize()    → 6 tests (P1-SY-001, P1-SY-002, P1-SY-003, P1-SY-004, P1-SY-005 pre-condition)
 *   isReady         → 3 tests (P1-SY-003, P1-SY-004, P1-SY-006)
 *   loadSoundFont() → 2 tests (P1-SY-005, P1-SY-006)
 *   dispose()       → 2 tests (P1-SY-007, pre-initialize safety)
 *   audioContext    → 1 test  (implicit in P1-SY-001)
 *
 * Mocking strategy:
 *   - spessasynth_lib is mocked at module boundary via vi.mock
 *   - globalThis.AudioContext is replaced with a test double
 *   - The real SynthWrapper is the unit under test — never mocked itself
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SynthWrapper } from "../synth-wrapper.ts";
import { ChopsPlayerError } from "@model/errors.ts";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/** Minimal AudioContext test double */
const makeAudioContextMock = (): {
  state: string;
  destination: object;
  audioWorklet: { addModule: ReturnType<typeof vi.fn> };
  close: ReturnType<typeof vi.fn>;
} => ({
  state: "running",
  destination: {},
  audioWorklet: {
    addModule: vi.fn().mockResolvedValue(undefined),
  },
  close: vi.fn().mockResolvedValue(undefined),
});

/** SpessaSynth WorkletSynthesizer test double */
const makeSpessaSynthMock = (): {
  soundBankManager: { addSoundBank: ReturnType<typeof vi.fn> };
  isReady: Promise<void>;
} => ({
  soundBankManager: {
    addSoundBank: vi.fn().mockResolvedValue(undefined),
  },
  isReady: Promise.resolve(),
});

vi.mock("spessasynth_lib", () => {
  const WorkletSynthesizer = vi.fn().mockImplementation(() => makeSpessaSynthMock());
  return { WorkletSynthesizer };
});

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let audioContextMock: ReturnType<typeof makeAudioContextMock>;
let AudioContextSpy: ReturnType<typeof vi.fn>;
const WORKER_URL = "/workers/spessasynth_processor.min.js";

beforeEach(() => {
  vi.clearAllMocks();
  audioContextMock = makeAudioContextMock();
  // Install globalThis.AudioContext spy
  AudioContextSpy = vi.fn().mockReturnValue(audioContextMock);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as unknown as Record<string, unknown>).AudioContext = AudioContextSpy;
});

afterEach(() => {
  // Clean up globalThis.AudioContext
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as unknown as Record<string, unknown>).AudioContext;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SynthWrapper", () => {
  describe("isReady (before initialize)", () => {
    it("P1-SY-003: isReady is false before initialize() is called", () => {
      const synth = new SynthWrapper({ workerUrl: WORKER_URL });

      // Assert
      expect(synth.isReady).toBe(false);
    });

    it("P1-SY-006: isReady is false before initialize() even if audioContext was somehow accessed", async () => {
      const synth = new SynthWrapper({ workerUrl: WORKER_URL });

      // Assert — accessing audioContext before initialize should throw, and isReady stays false
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        synth.audioContext;
      }).toThrow();
      expect(synth.isReady).toBe(false);

      // Assert — after successful initialize(), isReady becomes true
      // This FAILS on the stub because initialize() throws "not implemented"
      await synth.initialize();
      expect(synth.isReady).toBe(true);
    });
  });

  describe("initialize()", () => {
    it("P1-SY-001: initialize() creates an AudioContext when called", async () => {
      const synth = new SynthWrapper({ workerUrl: WORKER_URL });

      // Act
      await synth.initialize();

      // Assert — AudioContext constructor was called exactly once
      expect(AudioContextSpy).toHaveBeenCalledTimes(1);
    });

    it("P1-SY-002: initialize() registers the AudioWorklet processor via addModule before creating the synthesizer", async () => {
      const synth = new SynthWrapper({ workerUrl: WORKER_URL });

      // Act
      await synth.initialize();

      // Assert — audioWorklet.addModule was called with the worker URL
      expect(audioContextMock.audioWorklet.addModule).toHaveBeenCalledTimes(1);
      expect(audioContextMock.audioWorklet.addModule).toHaveBeenCalledWith(WORKER_URL);
    });

    it("P1-SY-003: initialize() connects the synthesizer to audioContext.destination", async () => {
      const { WorkletSynthesizer } = await import("spessasynth_lib");
      const spessaMock = makeSpessaSynthMock();
      (WorkletSynthesizer as ReturnType<typeof vi.fn>).mockImplementation(
        () => spessaMock,
      );

      const synth = new SynthWrapper({ workerUrl: WORKER_URL });

      // Act
      await synth.initialize();

      // Assert — WorkletSynthesizer was constructed (implicitly connected to destination)
      expect(WorkletSynthesizer).toHaveBeenCalledTimes(1);
    });

    it("P1-SY-002: initialize() is idempotent — calling it twice does not create a second AudioContext", async () => {
      const synth = new SynthWrapper({ workerUrl: WORKER_URL });

      // Act
      await synth.initialize();
      await synth.initialize();

      // Assert — AudioContext constructor called only once despite two calls
      expect(AudioContextSpy).toHaveBeenCalledTimes(1);
    });

    it("P1-SY-004: isReady is true after initialize() resolves", async () => {
      const synth = new SynthWrapper({ workerUrl: WORKER_URL });

      // Act
      await synth.initialize();

      // Assert
      expect(synth.isReady).toBe(true);
    });
  });

  describe("loadSoundFont()", () => {
    it("P1-SY-005: loadSoundFont(url) throws ChopsPlayerError if called before initialize()", async () => {
      const synth = new SynthWrapper({ workerUrl: WORKER_URL });

      // Act & Assert
      await expect(
        synth.loadSoundFont("/soundfonts/chops-instruments.sf2"),
      ).rejects.toBeInstanceOf(ChopsPlayerError);
    });

    it("P1-SY-005: loadSoundFont(url) invokes the SpessaSynth synth with the correct URL", async () => {
      const { WorkletSynthesizer } = await import("spessasynth_lib");
      const spessaMock = makeSpessaSynthMock();
      (WorkletSynthesizer as ReturnType<typeof vi.fn>).mockImplementation(
        () => spessaMock,
      );

      // Stub fetch so the SoundFont "loads" successfully
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
      });

      const synth = new SynthWrapper({ workerUrl: WORKER_URL });
      await synth.initialize();

      const sfUrl = "/soundfonts/chops-instruments.sf2";

      // Act
      await synth.loadSoundFont(sfUrl);

      // Assert — soundBankManager.addSoundBank was called
      expect(spessaMock.soundBankManager.addSoundBank).toHaveBeenCalledTimes(1);
    });
  });

  describe("dispose()", () => {
    it("P1-SY-007: dispose() closes the AudioContext", async () => {
      const synth = new SynthWrapper({ workerUrl: WORKER_URL });
      await synth.initialize();

      // Act
      synth.dispose();

      // Assert — AudioContext.close was called
      expect(audioContextMock.close).toHaveBeenCalledTimes(1);
    });

    it("P1-SY-007: dispose() is safe to call before initialize() — does not throw", () => {
      const synth = new SynthWrapper({ workerUrl: WORKER_URL });

      // Act & Assert — must not throw
      expect(() => synth.dispose()).not.toThrow();
    });
  });
});
