/**
 * MixerController — implements the Mixer interface using SpessaSynth CC messages.
 *
 * @module audio/mixer-controller
 * @see P1-MX-001 through P1-MX-007 in requirements-phase1.md
 */

import type { Mixer, ChannelState } from "./mixer.ts";

const DEFAULT_CHANNEL_STATE: ChannelState = {
  volume: 100,
  pan: 0,
  muted: false,
  solo: false,
} as const;

/** Minimal SpessaSynth synth interface for injection */
export interface SpessaSynthLike {
  controllerChange(channel: number, controller: number, value: number): void;
  muteChannel(channel: number, muted: boolean): void;
}

export class MixerController implements Mixer {
  private readonly _channels = new Map<number, ChannelState>();
  private readonly _synth: SpessaSynthLike;

  constructor(synth: SpessaSynthLike) {
    this._synth = synth;
  }

  getChannelState(channel: number): ChannelState {
    return this._channels.get(channel) ?? { ...DEFAULT_CHANNEL_STATE };
  }

  getAllChannelStates(): ReadonlyMap<number, ChannelState> {
    return this._channels;
  }

  setVolume(channel: number, value: number): void {
    const clamped = Math.max(0, Math.min(100, value));
    const ccValue = Math.round((clamped * 127) / 100);
    this._synth.controllerChange(channel, 7, ccValue);

    const current = this.getChannelState(channel);
    this._channels.set(channel, { ...current, volume: clamped });

    // If solo is active, reapply mute states
    this.reapplySoloState();
  }

  setPan(channel: number, value: number): void {
    const clamped = Math.max(-100, Math.min(100, value));
    const ccValue = Math.round(((clamped + 100) * 127) / 200);
    this._synth.controllerChange(channel, 10, ccValue);

    const current = this.getChannelState(channel);
    this._channels.set(channel, { ...current, pan: clamped });
  }

  setMute(channel: number, muted: boolean): void {
    this._synth.muteChannel(channel, muted);

    const current = this.getChannelState(channel);
    this._channels.set(channel, { ...current, muted });
  }

  setSolo(channel: number, solo: boolean): void {
    const current = this.getChannelState(channel);
    this._channels.set(channel, { ...current, solo });

    // Apply solo logic: mute all non-soloed channels
    this.reapplySoloState();
  }

  private reapplySoloState(): void {
    const hasAnySolo = Array.from(this._channels.values()).some((ch) => ch.solo);

    if (hasAnySolo) {
      // Mute all non-soloed channels, unmute all soloed channels
      for (const [channel, state] of this._channels) {
        const shouldMute = !state.solo;
        this._synth.muteChannel(channel, shouldMute);
      }
    }
  }
}
