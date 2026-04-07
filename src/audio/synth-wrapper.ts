/**
 * SynthWrapper — wraps SpessaSynth's WorkletSynthesizer.
 *
 * @module audio/synth
 * @see P1-SY-001 through P1-SY-007 in requirements-phase1.md
 */

import { WorkletSynthesizer, BasicSynthesizer } from "spessasynth_lib";
import type { Synth, SynthOptions, SoundFontProgressCallback } from "./synth.ts";
import { ChopsPlayerError } from "@model/errors.ts";
import { fetchSoundFont } from "./soundfont-loader.js";

export class SynthWrapper implements Synth {
  private _audioContext: AudioContext | null = null;
  private _isReady = false;
  private _synth: WorkletSynthesizer | null = null;
  private readonly _options: SynthOptions;

  constructor(options: SynthOptions) {
    this._options = options;
  }

  get isReady(): boolean {
    return this._isReady;
  }

  get audioContext(): AudioContext {
    if (this._audioContext === null) {
      throw new ChopsPlayerError(
        "AudioContext not available before initialize()",
        "SYNTH_NOT_INITIALIZED",
      );
    }
    return this._audioContext;
  }

  async initialize(): Promise<void> {
    // Idempotent: only create AudioContext once
    if (this._audioContext !== null) {
      return;
    }

    const ctx = this._options.audioContext ?? new AudioContext();
    this._audioContext = ctx;

    // Register AudioWorklet processor
    await ctx.audioWorklet.addModule(this._options.workerUrl);

    // Create SpessaSynth synthesizer
    this._synth = new WorkletSynthesizer(ctx);

    // Wait for the synth to be ready
    await this._synth.isReady;

    this._isReady = true;
  }

  async loadSoundFont(
    url: string,
    onProgress?: SoundFontProgressCallback,
  ): Promise<void> {
    if (!this._isReady || !this._synth) {
      throw new ChopsPlayerError(
        "Synth not initialized. Call initialize() first.",
        "SYNTH_NOT_INITIALIZED",
      );
    }

    const buffer = await fetchSoundFont(url, onProgress);
    await this._synth.soundBankManager.addSoundBank(buffer, "main");
  }

  dispose(): void {
    if (this._audioContext !== null) {
      this._audioContext.close();
      this._audioContext = null;
    }
    if (this._synth) {
      // destroy() may not exist on mock
      if (typeof this._synth.destroy === "function") {
        this._synth.destroy();
      }
      this._synth = null;
    }
    this._isReady = false;
  }

  getNativeSynth(): BasicSynthesizer {
    if (this._synth === null) {
      throw new ChopsPlayerError(
        "Native synth not available before initialize()",
        "SYNTH_NOT_INITIALIZED",
      );
    }
    return this._synth;
  }
}
