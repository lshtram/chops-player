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
import { useMixerStore } from "./mixer-store.js";

export interface PlayerState {
  readonly playbackState: PlaybackState;
  readonly position: PlaybackPosition;
  readonly isReady: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly song: Song | null;
  readonly loadingProgress: number;
  readonly loop: boolean;
}

export interface PlayerActions {
  setPlaybackState(state: PlaybackState): void;
  setPosition(position: PlaybackPosition): void;
  setReady(ready: boolean): void;
  setLoading(loading: boolean): void;
  setError(error: string | null): void;
  setSong(song: Song | null): void;
  setLoadingProgress(progress: number): void;
  setLoop(loop: boolean): void;
  initialize(): Promise<void>;
  initAudio(): Promise<void>;
  loadMidi(url: string): Promise<void>;
  loadMidiBuffer(buffer: ArrayBuffer, fileName?: string): Promise<void>;
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
  loadingProgress: 0,
  loop: false,
};

// Singleton instance for synth and sequencer
let _synthWrapper: SynthWrapper | null = null;
let _sequencerWrapper: SequencerWrapper | null = null;
// Buffer held until initAudio() makes the sequencer ready
let _pendingMidiBuffer: ArrayBuffer | null = null;

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

  setLoadingProgress: (progress: number): void => {
    set({ loadingProgress: Math.max(0, Math.min(100, progress)) });
  },

  setLoop: (loop: boolean): void => {
    set({ loop });
    if (_sequencerWrapper) {
      _sequencerWrapper.loop = loop;
    }
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

    // Note: AudioContext creation is deferred to user gesture.
    // Call initAudio() to complete audio initialization.
    set({ isLoading: false });
  },

  initAudio: async (): Promise<void> => {
    if (_synthWrapper === null) {
      _synthWrapper = new SynthWrapper({
        workerUrl: "/workers/spessasynth_processor.min.js",
      });
    }

    try {
      await _synthWrapper.initialize();
      set({ isReady: true });

      // Bridge mixer-store changes → SpessaSynth CC messages.
      // Runs whenever any channel's volume, pan, mute, or solo changes.
      useMixerStore.subscribe((mixerState, prevMixerState) => {
        if (_synthWrapper === null || !_synthWrapper.isReady) return;
        const synth = _synthWrapper.getNativeSynth();

        // Determine which channels are soloed
        const soloedChannels = Object.entries(mixerState.channels)
          .filter(([, ch]) => ch.solo)
          .map(([id]) => Number(id));
        const anySolo = soloedChannels.length > 0;

        // Only re-apply channels that actually changed (or all when solo state flips)
        const prevSoloedCount = Object.values(prevMixerState.channels).filter(
          (ch) => ch.solo,
        ).length;
        const soloChanged = (prevSoloedCount > 0) !== anySolo;

        for (const [idStr, ch] of Object.entries(mixerState.channels)) {
          const channelId = Number(idStr);
          const prev = prevMixerState.channels[channelId];
          const channelChanged =
            !prev ||
            prev.volume !== ch.volume ||
            prev.pan !== ch.pan ||
            prev.muted !== ch.muted ||
            prev.solo !== ch.solo ||
            soloChanged;

          if (!channelChanged) continue;

          // Effective mute: explicitly muted OR another channel is solo'd
          const effectiveMute = ch.muted || (anySolo && !ch.solo);

          // CC 7 — Main Volume (0–127)
          const ccVolume = effectiveMute ? 0 : Math.round((ch.volume / 100) * 127);
          // CC 10 — Pan (0–127, 64 = centre)
          const ccPan = Math.round(((ch.pan + 100) / 200) * 127);

          synth.controllerChange(channelId, 7 as Parameters<typeof synth.controllerChange>[1], ccVolume);
          synth.controllerChange(channelId, 10 as Parameters<typeof synth.controllerChange>[1], ccPan);
        }
      });

      // Load default SoundFont if not already loaded
      try {
        await _synthWrapper.loadSoundFont(
          "/soundfonts/chops-instruments.sf2",
          (pct) => get().setLoadingProgress(pct),
        );
      } catch {
        // SoundFont loading is optional for initialization
      }

      // Flush any MIDI that was loaded before the synth was ready
      if (_pendingMidiBuffer !== null && _sequencerWrapper !== null) {
        console.log("[PlayerStore] flushing pending MIDI buffer into sequencer");
        const song = get().song;
        if (song) _sequencerWrapper.load(song);
        _sequencerWrapper.loadRawMidi(_pendingMidiBuffer);
        _pendingMidiBuffer = null;
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
    console.log("[PlayerStore] loadMidi:", url);

    try {
      // Fetch the MIDI file using fetchSoundFont (returns ArrayBuffer directly)
      const buffer = await fetchSoundFont(url);
      console.log("[PlayerStore] MIDI fetched, byteLength:", buffer.byteLength);

      // Parse the MIDI file
      const song = parseMidiFile(buffer);
      console.log("[PlayerStore] MIDI parsed, duration:", song.durationSeconds, "s, tracks:", song.tracks.length);

      set({ song, isLoading: false });

      // If the synth is already ready, load into sequencer immediately.
      // Otherwise stash the buffer — initAudio() will flush it once the synth is ready.
      if (_sequencerWrapper && _synthWrapper?.isReady) {
        console.log("[PlayerStore] loading into sequencer");
        _sequencerWrapper.load(song);
        _sequencerWrapper.loadRawMidi(buffer);
      } else {
        console.log("[PlayerStore] synth not ready yet — buffering MIDI for later");
        _pendingMidiBuffer = buffer;
      }
    } catch (error) {
      console.error("[PlayerStore] loadMidi failed:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to load MIDI",
        isLoading: false,
      });
      throw error;
    }
  },

  loadMidiBuffer: async (buffer: ArrayBuffer, fileName?: string): Promise<void> => {
    set({ isLoading: true, error: null });
    console.log("[PlayerStore] loadMidiBuffer:", fileName ?? "(unnamed)", "byteLength:", buffer.byteLength);

    try {
      const song = parseMidiFile(buffer);
      console.log("[PlayerStore] MIDI parsed, duration:", song.durationSeconds, "s, tracks:", song.tracks.length);

      set({ song, isLoading: false });

      if (_sequencerWrapper && _synthWrapper?.isReady) {
        console.log("[PlayerStore] loading buffer into sequencer");
        _sequencerWrapper.load(song);
        _sequencerWrapper.loadRawMidi(buffer);
      } else {
        console.log("[PlayerStore] synth not ready yet — buffering MIDI for later");
        _pendingMidiBuffer = buffer;
      }
    } catch (error) {
      console.error("[PlayerStore] loadMidiBuffer failed:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to load MIDI",
        isLoading: false,
      });
      throw error;
    }
  },

  play: (): void => {
    console.log("[PlayerStore] play() — synth ready:", _synthWrapper?.isReady, "seq:", _sequencerWrapper !== null);
    // Resume AudioContext on user gesture (browser autoplay policy)
    if (_synthWrapper?.isReady) {
      void _synthWrapper.audioContext.resume();
    }
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
