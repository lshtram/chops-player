/**
 * Song model — pure data types for representing a parsed MIDI file.
 *
 * This module defines the core music data structures used throughout
 * chops-player. All types are plain interfaces/objects with no methods,
 * no class instances, and no external dependencies. They are serializable
 * and testable in any environment.
 *
 * @module model/song
 */

/**
 * Root model representing a fully parsed MIDI song.
 *
 * Contains all metadata, tracks, tempo map, and time signatures
 * extracted from a Standard MIDI File (Type 0 or Type 1).
 */
export interface Song {
  /** Human-readable name of the song (from MIDI track name meta event, or filename). */
  readonly name: string;

  /** MIDI time division: number of ticks per quarter note (beat). */
  readonly ticksPerBeat: number;

  /** Total duration of the song in seconds. */
  readonly durationSeconds: number;

  /** Total duration of the song in ticks. */
  readonly durationTicks: number;

  /** Ordered list of tracks in the song. */
  readonly tracks: readonly Track[];

  /** Tempo map — ordered list of tempo change events (ascending by tick). */
  readonly tempoMap: readonly TempoEvent[];

  /** Time signature events — ordered by tick (ascending). */
  readonly timeSignatures: readonly TimeSignatureEvent[];

  /** Original MIDI file format: 0 (single track) or 1 (multi-track). */
  readonly format: 0 | 1;
}

/**
 * A single track within a Song.
 *
 * In a Type 1 MIDI file, each track typically corresponds to one instrument.
 * In a Type 0 file, the parser splits the single track into per-channel
 * logical tracks.
 */
export interface Track {
  /** Human-readable track name (from MIDI meta event FF 03). */
  readonly name: string;

  /** MIDI channel this track plays on (0–15). */
  readonly channel: number;

  /** GM program number (0–127) assigned to this track. */
  readonly program: number;

  /** MIDI bank number (0 for melodic instruments, 128 for drums). */
  readonly bank: number;

  /** Whether this track is a drum/percussion track. */
  readonly isDrum: boolean;

  /** All note events in this track, ordered by startTick ascending. */
  readonly notes: readonly NoteEvent[];
}

/**
 * A single note event within a track.
 *
 * Represents a paired note-on / note-off with timing and velocity.
 */
export interface NoteEvent {
  /** MIDI note number (0–127). Middle C = 60. */
  readonly pitch: number;

  /** Note-on velocity (0–127). 0 is equivalent to note-off. */
  readonly velocity: number;

  /** Absolute tick position where the note starts. */
  readonly startTick: number;

  /** Duration of the note in ticks. */
  readonly durationTicks: number;
}

/**
 * A tempo change event in the MIDI tempo map.
 *
 * MIDI stores tempo as microseconds per beat. The parser preserves this
 * raw value for accuracy.
 */
export interface TempoEvent {
  /** Absolute tick position of this tempo change. */
  readonly tick: number;

  /** Tempo in microseconds per beat (e.g., 500000 = 120 BPM). */
  readonly microsecondsPerBeat: number;
}

/**
 * A time signature event from the MIDI file.
 *
 * Defines the meter at a given point in the song (e.g., 4/4, 3/4, 6/8).
 */
export interface TimeSignatureEvent {
  /** Absolute tick position of this time signature change. */
  readonly tick: number;

  /** Numerator of the time signature (e.g., 4 for 4/4 time). */
  readonly numerator: number;

  /**
   * Denominator of the time signature as a power of 2.
   * Stored as the actual denominator value (e.g., 4 for quarter note),
   * not the MIDI-encoded power-of-two exponent.
   */
  readonly denominator: number;
}
