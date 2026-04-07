/**
 * Sequencer interface — abstraction over SpessaSynth's Sequencer.
 *
 * This interface defines the contract for MIDI playback control:
 * play, pause, stop, seek, and position tracking. The implementation
 * wraps SpessaSynth's `Sequencer` class and provides a simplified API
 * for the store layer.
 *
 * @module audio/sequencer
 * @see ADR-004 in architecture.md
 * @see ADR-007 in architecture.md (position updates)
 */

import type { Song } from "../model/song.ts";

/**
 * The current state of the sequencer playback.
 */
export type PlaybackState = "stopped" | "playing" | "paused";

/**
 * A snapshot of the current playback position.
 *
 * Updated at ~60fps during playback and provided to the store
 * via the `onPositionChange` callback.
 */
export interface PlaybackPosition {
  /** Current position in MIDI ticks. */
  readonly tick: number;

  /** Current position in seconds from the start. */
  readonly seconds: number;

  /** Current bar number (1-indexed). */
  readonly bar: number;

  /** Current beat within the bar (1-indexed). */
  readonly beat: number;
}

/**
 * Interface for the MIDI sequencer/transport controller.
 *
 * Lifecycle:
 * 1. Call `load(song)` to prepare a Song for playback.
 * 2. Call `play()`, `pause()`, `stop()` to control transport.
 * 3. Use `seekToTick()` or `seekToBar()` to jump to a position.
 * 4. Subscribe to position changes via `onPositionChange`.
 */
export interface Sequencer {
  /**
   * Load a Song model into the sequencer for playback.
   *
   * This prepares the SpessaSynth sequencer with the MIDI data.
   * Any currently playing song is stopped before loading.
   *
   * @param song - The parsed Song model to load.
   */
  load(song: Song): void;

  /**
   * Start or resume playback from the current position.
   *
   * If the sequencer is stopped, playback starts from the beginning.
   * If paused, playback resumes from the paused position.
   */
  play(): void;

  /**
   * Pause playback at the current position.
   *
   * The position is preserved and can be resumed with `play()`.
   */
  pause(): void;

  /**
   * Stop playback and reset position to the beginning (tick 0, second 0).
   */
  stop(): void;

  /**
   * Seek to an arbitrary tick position.
   *
   * Can be called while playing (playback continues from new position)
   * or while stopped/paused.
   *
   * @param tick - The target tick position (0-based).
   */
  seekToTick(tick: number): void;

  /**
   * Seek to the beginning of a specific bar.
   *
   * @param bar - The target bar number (1-indexed).
   */
  seekToBar(bar: number): void;

  /** The current playback state. */
  readonly state: PlaybackState;

  /** The current playback position. */
  readonly position: PlaybackPosition;

  /** Total duration of the loaded song in seconds. Returns 0 if no song is loaded. */
  readonly duration: number;

  /** Whether looping is enabled. When true, playback restarts at song end. */
  loop: boolean;

  /**
   * Callback invoked on each animation frame during playback with the
   * current position. Set to `null` to disable.
   *
   * @see ADR-007 in architecture.md
   */
  onPositionChange: ((position: PlaybackPosition) => void) | null;
}
