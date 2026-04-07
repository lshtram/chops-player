/**
 * Model layer barrel export.
 *
 * Re-exports all public types and constants from the model layer.
 *
 * @module model
 */

export type {
  Song,
  Track,
  NoteEvent,
  TempoEvent,
  TimeSignatureEvent,
} from "./song.ts";

export {
  GM_PROGRAMS,
  DRUM_CHANNEL,
  DEFAULT_TEMPO,
  DEFAULT_TICKS_PER_BEAT,
  MIDI_CHANNEL_COUNT,
  DEFAULT_SOUNDFONT_URL,
  DEFAULT_WORKER_URL,
} from "./constants.ts";

export { ChopsPlayerError } from "./errors.ts";
