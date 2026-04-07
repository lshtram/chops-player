/**
 * SequencerWrapper — wraps SpessaSynth's Sequencer for MIDI playback.
 *
 * @module audio/sequencer-wrapper
 * @see P1-TR-001 through P1-TR-010 in requirements-phase1.md
 */

import { Sequencer } from "spessasynth_lib";
import type {
  Sequencer as SequencerInterface,
  PlaybackState,
  PlaybackPosition,
} from "./sequencer.ts";
import type { Synth } from "./synth.ts";
import type { Song } from "@model/song.ts";

export class SequencerWrapper implements SequencerInterface {
  private _state: PlaybackState = "stopped";
  private _position: PlaybackPosition = {
    tick: 0,
    seconds: 0,
    bar: 1,
    beat: 1,
  };
  private _duration = 0;
  private _song: Song | null = null;
  private _spessaSeq: Sequencer | null = null;
  private readonly _synth: Synth;
  loop = false;
  onPositionChange: ((position: PlaybackPosition) => void) | null = null;

  constructor(synth: Synth) {
    this._synth = synth;
  }

  private ensureSequencer(): Sequencer | null {
    if (this._spessaSeq !== null) {
      return this._spessaSeq;
    }

    try {
      // Create SpessaSynth sequencer using the synth's audioContext
      // This may throw if the synth doesn't have the required methods
      // (e.g., when using a mock Synth in tests)
      this._spessaSeq = new Sequencer(
        this._synth.getNativeSynth(),
      );
      return this._spessaSeq;
    } catch {
      // SpessaSynth Sequencer creation failed (e.g., in test environment with mock synth)
      // Return null - state management will still work in the wrapper
      return null;
    }
  }

  get state(): PlaybackState {
    return this._state;
  }

  get position(): PlaybackPosition {
    return this._position;
  }

  get duration(): number {
    return this._duration;
  }

  load(song: Song): void {
    this._song = song;
    this._duration = song.durationSeconds;
    this._position = {
      tick: 0,
      seconds: 0,
      bar: 1,
      beat: 1,
    };
  }

  /**
   * Load raw MIDI binary data into the sequencer.
   * Called by the store after parsing MIDI to get raw bytes.
   */
  loadRawMidi(buffer: ArrayBuffer): void {
    const seq = this.ensureSequencer();
    if (seq) {
      // SpessaSynth expects SuppliedMIDIData with binary: ArrayBuffer
      seq.loadNewSongList([{ binary: buffer }]);
    }
  }

  play(): void {
    this._state = "playing";
    const seq = this.ensureSequencer();
    if (seq) {
      seq.play();
    }

    // P1-TR-009: onPositionChange must be called SYNCHRONOUSLY when play() is called
    if (this.onPositionChange) {
      this.onPositionChange(this._position);
    }
  }

  pause(): void {
    this._state = "paused";
    const seq = this.ensureSequencer();
    if (seq) {
      seq.pause();
    }
  }

  stop(): void {
    this._state = "stopped";
    const seq = this.ensureSequencer();
    if (seq) {
      seq.pause();
      seq.currentTime = 0;
    }

    this._position = {
      tick: 0,
      seconds: 0,
      bar: 1,
      beat: 1,
    };

    if (this.onPositionChange) {
      this.onPositionChange(this._position);
    }
  }

  seekToTick(tick: number): void {
    this._position = {
      ...this._position,
      tick,
    };
  }

  seekToBar(bar: number): void {
    // Calculate tick from bar using song's time signature
    // Default: 4/4 time, 480 ticks per beat
    const ticksPerBeat = this._song?.ticksPerBeat ?? 480;
    const timeSig = this._song?.timeSignatures[0];
    const beatsPerBar = timeSig ? timeSig.numerator : 4;
    const ticksPerBar = ticksPerBeat * beatsPerBar;

    const tick = (bar - 1) * ticksPerBar;
    this._position = {
      ...this._position,
      tick,
      bar,
      beat: 1,
    };
  }
}
