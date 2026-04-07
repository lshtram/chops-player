/**
 * Audio layer barrel export.
 *
 * Re-exports all public interfaces from the audio layer.
 * Implementation classes are NOT exported from the barrel —
 * they are imported directly by the store layer.
 *
 * @module audio
 */

export type {
  SynthOptions,
  SoundFontProgressCallback,
  Synth,
} from "./synth.ts";

export type {
  PlaybackState,
  PlaybackPosition,
  Sequencer,
} from "./sequencer.ts";

export type {
  ChannelState,
  Mixer,
} from "./mixer.ts";
