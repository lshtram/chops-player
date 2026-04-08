/**
 * Constants for General MIDI instruments and MIDI conventions.
 *
 * These constants are used throughout chops-player to refer to
 * standard GM instrument numbers, drum channel assignment, and
 * default MIDI values.
 *
 * @module model/constants
 */

/**
 * General MIDI program numbers for the Phase I instruments.
 *
 * GM program numbers are 0-indexed (0–127). These are the four
 * instruments included in the `chops-instruments.sf2` SoundFont.
 */
export const GM_PROGRAMS = {
  /** Acoustic Grand Piano — GM Program 0 */
  ACOUSTIC_GRAND_PIANO: 0,
  /** Jazz Guitar (Electric Guitar Jazz) — GM Program 26 */
  JAZZ_GUITAR: 26,
  /** Acoustic Bass (Finger) — GM Program 32 */
  ACOUSTIC_BASS: 32,
} as const;

/**
 * The standard GM drum channel number (0-indexed).
 *
 * In General MIDI, channel 10 (1-indexed) is reserved for drums.
 * Since MIDI channels in our system are 0-indexed, this is channel 9.
 */
export const DRUM_CHANNEL = 9 as const;

/**
 * Default tempo in microseconds per beat.
 *
 * 500,000 microseconds per beat = 120 BPM.
 * This is the MIDI standard default tempo when no tempo event is present.
 */
export const DEFAULT_TEMPO = 500_000 as const;

/**
 * Default time division (ticks per quarter note) for fallback scenarios.
 *
 * 480 PPQN is a common default in MIDI files and sequencers.
 */
export const DEFAULT_TICKS_PER_BEAT = 480 as const;

/**
 * The total number of MIDI channels in the General MIDI standard.
 */
export const MIDI_CHANNEL_COUNT = 16 as const;

/**
 * Default SoundFont file path (relative to the public directory).
 */
export const DEFAULT_SOUNDFONT_URL = "/soundfonts/chops-jazz.sf2" as const;

/**
 * Default SpessaSynth AudioWorklet processor URL (relative to public directory).
 */
export const DEFAULT_WORKER_URL = "/workers/spessasynth_processor.min.js" as const;
