/**
 * Synth interface — abstraction over SpessaSynth's WorkletSynthesizer.
 *
 * This interface defines the contract for initializing and managing the
 * SoundFont synthesizer. The audio layer implementation wraps SpessaSynth's
 * `WorkletSynthesizer` behind this interface so that the rest of the system
 * never imports `spessasynth_lib` directly.
 *
 * @module audio/synth
 * @see ADR-004 in architecture.md
 * @see ADR-005 in architecture.md (AudioContext lifecycle)
 */

import { BasicSynthesizer } from "spessasynth_lib";

/**
 * Configuration options for creating a Synth instance.
 */
export interface SynthOptions {
  /**
   * URL to the SpessaSynth AudioWorklet processor script.
   * Typically `/workers/spessasynth_processor.min.js`.
   */
  readonly workerUrl: string;

  /**
   * Optional pre-existing AudioContext to use.
   * If not provided, the Synth will create a new one on `initialize()`.
   */
  readonly audioContext?: AudioContext;
}

/**
 * Progress callback signature for SoundFont loading.
 *
 * @param percent - Loading progress from 0 to 100.
 */
export type SoundFontProgressCallback = (percent: number) => void;

/**
 * Interface for the SoundFont synthesizer wrapper.
 *
 * Encapsulates AudioContext creation, AudioWorklet registration,
 * SpessaSynth WorkletSynthesizer instantiation, and SoundFont loading.
 *
 * Lifecycle:
 * 1. Construct with `SynthOptions`
 * 2. Call `initialize()` on first user gesture — creates AudioContext, registers worklet, creates synth
 * 3. Call `loadSoundFont(url)` — fetches and loads the SF2 file
 * 4. `isReady` becomes `true` — synth is ready for playback
 * 5. Call `dispose()` when done — releases all resources
 */
export interface Synth {
  /**
   * Initialize the synthesizer: create AudioContext, register the
   * AudioWorklet processor, and instantiate the SpessaSynth synthesizer.
   *
   * Must be called from a user gesture handler to satisfy browser
   * autoplay policies (see ADR-005).
   *
   * @throws {ChopsPlayerError} If initialization fails (worklet registration error, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Fetch a SoundFont file from the given URL and load it into the synthesizer.
   *
   * @param url - URL to the SF2/SF3 SoundFont file.
   * @param onProgress - Optional callback invoked with loading progress (0–100).
   * @throws {ChopsPlayerError} If the fetch fails or the SoundFont is invalid.
   */
  loadSoundFont(url: string, onProgress?: SoundFontProgressCallback): Promise<void>;

  /**
   * Release all audio resources: disconnect nodes, close AudioContext,
   * and destroy the SpessaSynth synthesizer.
   *
   * After calling dispose(), the synth instance cannot be reused.
   */
  dispose(): void;

  /**
   * Whether the synthesizer is fully initialized and ready for playback.
   *
   * `true` only after `initialize()` completes, the worklet is registered,
   * the synthesizer is created, and at least one SoundFont is loaded.
   */
  readonly isReady: boolean;

  /**
   * The AudioContext used by this synthesizer.
   *
   * Available after `initialize()` is called. Throws if accessed before initialization.
   */
  readonly audioContext: AudioContext;

  /**
   * Returns the underlying native SpessaSynth synthesizer.
   *
   * Used by SequencerWrapper to create a SpessaSynth Sequencer,
   * which requires a BasicSynthesizer.
   *
   * @throws {ChopsPlayerError} If called before `initialize()` completes.
   */
  getNativeSynth(): BasicSynthesizer;
}
