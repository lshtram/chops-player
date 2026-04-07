/**
 * player-store — Zustand store for transport / playback state.
 *
 * @module stores/player-store
 * @see P1-ST-001, P1-ST-003, P1-ST-005, P1-ST-006, P1-ST-007 in requirements-phase1.md
 */

import { create } from "zustand";
import type { PlaybackState, PlaybackPosition } from "@audio/sequencer.ts";
import type { Song } from "@model/song.ts";
import { SynthWrapper } from "@audio/synth-wrapper.js";
import { SequencerWrapper } from "@audio/sequencer-wrapper.js";
import { parseMidiFile } from "@parsers/midi-reader.js";
import { fetchSoundFont } from "@audio/soundfont-loader.js";

export interface PlayerState {
  readonly playbackState: PlaybackState;
  readonly position: PlaybackPosition;
  readonly isReady: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly song: Song | null;
}

export interface PlayerActions {
  setPlaybackState(state: PlaybackState): void;
  setPosition(position: PlaybackPosition): void;
  setReady(ready: boolean): void;
  setLoading(loading: boolean): void;
  setError(error: string | null): void;
  setSong(song: Song | null): void;
  initialize(): Promise<void>;
  loadMidi(url: string): Promise<void>;
  play(): void;
  pause(): void;
  stop(): void;
  seekToTick(tick: number): void;
  seekToBar(bar: number): void;
}

export type PlayerStore = PlayerState & PlayerActions;

export const INITIAL_POSITION: PlaybackPosition = {
  tick: 0,
  seconds: 0,
  bar: 1,
  beat: 1,
} as const;

const initialState: PlayerState = {
  playbackState: "stopped",
  position: INITIAL_POSITION,
  isReady: false,
  isLoading: false,
  error: null,
  song: null,
};

// Singleton instance for synth and sequencer
let _synthWrapper: SynthWrapper | null = null;
let _sequencerWrapper: SequencerWrapper | null = null;

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  ...initialState,

  setPlaybackState: (state: PlaybackState): void => {
    set({ playbackState: state });
  },

  setPosition: (position: PlaybackPosition): void => {
    set({ position });
  },

  setReady: (ready: boolean): void => {
    set({ isReady: ready });
  },

  setLoading: (loading: boolean): void => {
    set({ isLoading: loading });
  },

  setError: (error: string | null): void => {
    set({ error });
  },

  setSong: (song: Song | null): void => {
    set({ song });
  },

  initialize: async (): Promise<void> => {
    // Create singleton synth and sequencer if not already created
    if (_synthWrapper === null) {
      _synthWrapper = new SynthWrapper({
        workerUrl: "/workers/spessasynth_processor.min.js",
      });
    }

    if (_sequencerWrapper === null && _synthWrapper) {
      _sequencerWrapper = new SequencerWrapper(_synthWrapper);

      // Set up position change callback
      _sequencerWrapper.onPositionChange = (position: PlaybackPosition) => {
        get().setPosition(position);
      };
    }

    try {
      await _synthWrapper.initialize();
      set({ isReady: true });

      // Load default SoundFont if not already loaded
      try {
        await _synthWrapper.loadSoundFont("/soundfonts/chops-instruments.sf2");
      } catch {
        // SoundFont loading is optional for initialization
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to initialize audio",
        isReady: false,
      });
      throw error;
    }
  },

  loadMidi: async (url: string): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      // Fetch the MIDI file using fetchSoundFont (returns ArrayBuffer directly)
      const buffer = await fetchSoundFont(url);

      // Parse the MIDI file
      const song = parseMidiFile(buffer);

      set({ song, isLoading: false });

      // Load into sequencer
      if (_sequencerWrapper) {
        _sequencerWrapper.load(song);
        _sequencerWrapper.loadRawMidi(buffer);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load MIDI",
        isLoading: false,
      });
      throw error;
    }
  },

  play: (): void => {
    if (_sequencerWrapper) {
      _sequencerWrapper.play();
      set({ playbackState: "playing" });
    }
  },

  pause: (): void => {
    if (_sequencerWrapper) {
      _sequencerWrapper.pause();
      set({ playbackState: "paused" });
    }
  },

  stop: (): void => {
    if (_sequencerWrapper) {
      _sequencerWrapper.stop();
      set({
        playbackState: "stopped",
        position: INITIAL_POSITION,
      });
    }
  },

  seekToTick: (tick: number): void => {
    if (_sequencerWrapper) {
      _sequencerWrapper.seekToTick(tick);
      set({ position: { ...get().position, tick } });
    }
  },

  seekToBar: (bar: number): void => {
    if (_sequencerWrapper) {
      _sequencerWrapper.seekToBar(bar);
      set({ position: { ...get().position, bar } });
    }
  },
}));
