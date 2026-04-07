/**
 * Parsers layer barrel export.
 *
 * Re-exports all public functions and types from the parsers layer.
 *
 * @module parsers
 */

export {
  MidiParseError,
  parseMidiFile,
  isMidiFile,
} from "./midi-reader.ts";
