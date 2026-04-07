/**
 * mixer-store — Zustand store for per-channel mixer state.
 *
 * @module stores/mixer-store
 * @see P1-ST-002, P1-ST-004 in requirements-phase1.md
 */

import { create } from "zustand";
import type { ChannelState } from "@audio/mixer.ts";

const DEFAULT_CHANNEL_STATE: ChannelState = {
  volume: 100,
  pan: 0,
  muted: false,
  solo: false,
} as const;

export interface MixerStoreState {
  readonly channels: Readonly<Record<number, ChannelState>>;
}

export interface MixerStoreActions {
  setChannelVolume(channel: number, volume: number): void;
  setChannelPan(channel: number, pan: number): void;
  setChannelMute(channel: number, muted: boolean): void;
  setChannelSolo(channel: number, solo: boolean): void;
  getChannelState(channel: number): ChannelState;
}

export type MixerStore = MixerStoreState & MixerStoreActions;

const initialState: MixerStoreState = {
  channels: {},
};

export const useMixerStore = create<MixerStore>()((set, get) => ({
  ...initialState,

  setChannelVolume: (channel: number, volume: number): void => {
    const clamped = Math.max(0, Math.min(100, volume));
    set((state) => ({
      channels: {
        ...state.channels,
        [channel]: {
          ...(state.channels[channel] ?? DEFAULT_CHANNEL_STATE),
          volume: clamped,
        },
      },
    }));
  },

  setChannelPan: (channel: number, pan: number): void => {
    const clamped = Math.max(-100, Math.min(100, pan));
    set((state) => ({
      channels: {
        ...state.channels,
        [channel]: {
          ...(state.channels[channel] ?? DEFAULT_CHANNEL_STATE),
          pan: clamped,
        },
      },
    }));
  },

  setChannelMute: (channel: number, muted: boolean): void => {
    set((state) => ({
      channels: {
        ...state.channels,
        [channel]: {
          ...(state.channels[channel] ?? DEFAULT_CHANNEL_STATE),
          muted,
        },
      },
    }));
  },

  setChannelSolo: (channel: number, solo: boolean): void => {
    set((state) => ({
      channels: {
        ...state.channels,
        [channel]: {
          ...(state.channels[channel] ?? DEFAULT_CHANNEL_STATE),
          solo,
        },
      },
    }));
  },

  getChannelState: (channel: number): ChannelState => {
    const state = get().channels[channel];
    return state ?? { ...DEFAULT_CHANNEL_STATE };
  },
}));

export { DEFAULT_CHANNEL_STATE };
