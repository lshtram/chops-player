/**
 * Mixer interface — abstraction over SpessaSynth's per-channel controls.
 *
 * This interface defines the contract for per-channel audio mixing:
 * volume, pan, mute, and solo. The implementation maps these high-level
 * controls to SpessaSynth's MIDI CC messages and mute API.
 *
 * @module audio/mixer
 * @see ADR-004 in architecture.md
 */

/**
 * The state of a single mixer channel.
 *
 * Represents the current volume, pan, mute, and solo settings
 * for one MIDI channel.
 */
export interface ChannelState {
  /** Volume level, 0–100. Default is 100. */
  readonly volume: number;

  /** Pan position, -100 (full left) to +100 (full right). Default is 0 (center). */
  readonly pan: number;

  /** Whether this channel is muted. Default is false. */
  readonly muted: boolean;

  /** Whether this channel is soloed. Default is false. */
  readonly solo: boolean;
}

/**
 * Interface for the per-channel audio mixer.
 *
 * Maps user-friendly mixer controls (0–100 volume, -100..+100 pan)
 * to MIDI CC messages sent to the SpessaSynth synthesizer.
 *
 * Solo logic: when one or more channels are soloed, only those channels
 * are audible. All non-soloed channels are effectively muted. When no
 * channels are soloed, the solo state has no effect (all channels
 * follow their individual mute settings).
 */
export interface Mixer {
  /**
   * Set the volume of a MIDI channel.
   *
   * @param channel - MIDI channel number (0–15).
   * @param value - Volume level (0–100). Mapped to MIDI CC7 (0–127).
   * @throws {RangeError} If channel or value is out of range.
   */
  setVolume(channel: number, value: number): void;

  /**
   * Set the pan position of a MIDI channel.
   *
   * @param channel - MIDI channel number (0–15).
   * @param value - Pan position (-100 to +100). Mapped to MIDI CC10 (0–127).
   * @throws {RangeError} If channel or value is out of range.
   */
  setPan(channel: number, value: number): void;

  /**
   * Mute or unmute a MIDI channel.
   *
   * @param channel - MIDI channel number (0–15).
   * @param muted - Whether the channel should be muted.
   */
  setMute(channel: number, muted: boolean): void;

  /**
   * Solo or unsolo a MIDI channel.
   *
   * When one or more channels are soloed, only soloed channels produce audio.
   * When no channels are soloed, all channels follow their individual mute state.
   *
   * @param channel - MIDI channel number (0–15).
   * @param solo - Whether the channel should be soloed.
   */
  setSolo(channel: number, solo: boolean): void;

  /**
   * Get the current state of a single channel.
   *
   * @param channel - MIDI channel number (0–15).
   * @returns The channel's current mixer state.
   */
  getChannelState(channel: number): ChannelState;

  /**
   * Get the current state of all active channels.
   *
   * @returns A read-only map of channel number → ChannelState.
   */
  getAllChannelStates(): ReadonlyMap<number, ChannelState>;
}
