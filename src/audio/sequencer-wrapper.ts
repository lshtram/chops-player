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
import { parseMidiFile } from "@parsers/midi-reader.js";
import { fetchArrayBuffer } from "@audio/soundfont-loader.js";

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
  private _rafId: number | null = null;

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
    } catch (err) {
      // SpessaSynth Sequencer creation failed (e.g., in test environment with mock synth)
      // Return null - state management will still work in the wrapper
      console.error("[SequencerWrapper] Sequencer creation failed:", err);
      return null;
    }
  }

  /**
   * Get the tempo in microseconds-per-beat at a given tick.
   * Falls back to MIDI default (500000 µs/beat = 120 BPM) if no tempo map.
   */
  private _getTempoAtTick(_tick: number): number {
    const tempoMap = this._song?.tempoMap;
    if (!tempoMap || tempoMap.length === 0) {
      return 500000; // MIDI default: 500000 µs/beat = 120 BPM
    }
    // Find the last tempo event at or before the given tick
    let result = tempoMap[0]!.microsecondsPerBeat;
    for (const event of tempoMap) {
      if (event.tick <= _tick) {
        result = event.microsecondsPerBeat;
      } else {
        break;
      }
    }
    return result;
  }

  /**
   * Convert seconds to a PlaybackPosition using the song's time signature and tempo map.
   */
  private _secondsToPosition(seconds: number, currentTick: number): PlaybackPosition {
    const ticksPerBeat = this._song?.ticksPerBeat ?? 480;
    const timeSig = this._song?.timeSignatures[0];
    const beatsPerBar = timeSig?.numerator ?? 4;
    const ticksPerBar = ticksPerBeat * beatsPerBar;

    // Convert seconds to ticks using the song's tempo at the current tick position
    // tempo is stored as microsecondsPerBeat; convert to seconds per beat
    const microsecondsPerBeat = this._getTempoAtTick(currentTick);
    const secondsPerBeat = microsecondsPerBeat / 1_000_000;
    const totalBeats = seconds / secondsPerBeat;
    const tick = Math.floor(totalBeats * ticksPerBeat);
    const bar = Math.floor(tick / ticksPerBar) + 1;
    const beatInBar = Math.floor((tick % ticksPerBar) / ticksPerBeat) + 1;

    return {
      tick,
      seconds,
      bar,
      beat: beatInBar,
    };
  }

  private _updatePosition = (): void => {
    if (this._state !== "playing") {
      return;
    }
    const seq = this.ensureSequencer();
    if (seq) {
      const seconds = seq.currentHighResolutionTime;
      this._position = this._secondsToPosition(seconds, this._position.tick);
    }
    if (this.onPositionChange) {
      this.onPositionChange(this._position);
    }
    this._rafId = requestAnimationFrame(this._updatePosition);
  };

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
   * Fetch and load a MIDI file from a URL.
   *
   * This is the primary entry point for the store layer — it keeps the store
   * from importing the parser directly.
   *
   * @returns The parsed Song and raw buffer.
   */
  async loadMidi(url: string): Promise<{ song: Song; buffer: ArrayBuffer }> {
    const buffer = await fetchArrayBuffer(url);
    const song = parseMidiFile(buffer);
    this.load(song);
    this.loadRawMidi(buffer);
    return { song, buffer };
  }

  /**
   * Parse and load a MIDI file from an in-memory ArrayBuffer.
   *
   * Used by the store for file-upload scenarios where the bytes are already loaded.
   *
   * @returns The parsed Song.
   */
  loadMidiBuffer(buffer: ArrayBuffer): Song {
    const song = parseMidiFile(buffer);
    this.load(song);
    this.loadRawMidi(buffer);
    return song;
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

    // Start position polling so the timer advances during playback
    this._rafId = requestAnimationFrame(this._updatePosition);
  }

  pause(): void {
    this._state = "paused";
    const seq = this.ensureSequencer();
    if (seq) {
      seq.pause();
    }
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  stop(): void {
    this._state = "stopped";
    const seq = this.ensureSequencer();
    if (seq) {
      seq.pause();
      seq.currentTime = 0;
    }
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
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
    const ticksPerBeat = this._song?.ticksPerBeat ?? 480;
    const timeSig = this._song?.timeSignatures[0];
    const beatsPerBar = timeSig?.numerator ?? 4;
    const ticksPerBar = ticksPerBeat * beatsPerBar;
    const bar = Math.floor(tick / ticksPerBar) + 1;
    const beatInBar = Math.floor((tick % ticksPerBar) / ticksPerBeat) + 1;

    // Convert tick to seconds for the sequencer
    const microsecondsPerBeat = this._getTempoAtTick(tick);
    const secondsPerBeat = microsecondsPerBeat / 1_000_000;
    const seconds = (tick / ticksPerBeat) * secondsPerBeat;

    this._position = { tick, seconds, bar, beat: beatInBar };

    const seq = this.ensureSequencer();
    if (seq) {
      seq.currentTime = seconds;
    }
  }

  seekToBar(bar: number): void {
    const ticksPerBeat = this._song?.ticksPerBeat ?? 480;
    const timeSig = this._song?.timeSignatures[0];
    const beatsPerBar = timeSig?.numerator ?? 4;
    const ticksPerBar = ticksPerBeat * beatsPerBar;

    const tick = (bar - 1) * ticksPerBar;
    this.seekToTick(tick);
  }
}