/**
 * PlayerLayout and ChopsPlayer components.
 *
 * @module components/PlayerLayout
 * @see P1-UI-001, P1-UI-008, P1-UI-009 in requirements-phase1.md
 */

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@stores/player-store";
import { Transport } from "./Transport.tsx";
import { MixerBoard } from "./Mixer.tsx";

export interface PlayerLayoutProps {
  midiUrl: string;
}

export interface ChopsPlayerProps {
  midiUrl: string;
}

export function PlayerLayout(props: PlayerLayoutProps): React.JSX.Element {
  const isLoading = usePlayerStore((s) => s.isLoading);
  const error = usePlayerStore((s) => s.error);
  const isReady = usePlayerStore((s) => s.isReady);
  const song = usePlayerStore((s) => s.song);
  const initialize = usePlayerStore((s) => s.initialize);
  const initAudio = usePlayerStore((s) => s.initAudio);
  const loadMidi = usePlayerStore((s) => s.loadMidi);
  const loadMidiBuffer = usePlayerStore((s) => s.loadMidiBuffer);
  const loadingProgress = usePlayerStore((s) => s.loadingProgress);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeChannels = song ? [...new Set(song.tracks.map((t) => t.channel))].sort((a, b) => a - b) : [];

  useEffect(() => {
    void (async () => {
      await initialize();
      await loadMidi(props.midiUrl);
    })();
  }, [initialize, loadMidi, props.midiUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer;
      void loadMidiBuffer(buf, file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  const uploadBar = (
    <div data-testid="upload-bar" style={{ marginBottom: "0.75rem" }}>
      <label>
        <span style={{ marginRight: "0.5rem", fontSize: "0.85em", opacity: 0.7 }}>
          Load your own MIDI:
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mid,.midi"
          onChange={handleFileChange}
          data-testid="midi-file-input"
        />
      </label>
    </div>
  );

  if (isLoading) {
    return (
      <div data-testid="player-layout">
        <div data-testid="loading-indicator">
          <div>Loading… {loadingProgress > 0 ? `${loadingProgress}%` : ""}</div>
          <div className="w-full bg-neutral-700 rounded overflow-hidden" style={{ height: 8 }}>
            <div
              className="bg-emerald-500 h-full rounded transition-all duration-200"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="player-layout">
        <div data-testid="error-message">{error}</div>
      </div>
    );
  }

  const showStartButton = !isReady && !isLoading;

  return (
    <div data-testid="player-layout">
      {uploadBar}
      {showStartButton && (
        <button
          onClick={() => void initAudio()}
          data-testid="start-player-button"
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-lg"
        >
          ▶ Start Player
        </button>
      )}
      <Transport />
      <MixerBoard channels={activeChannels} />
    </div>
  );
}

export function ChopsPlayer(props: ChopsPlayerProps): React.JSX.Element {
  return <PlayerLayout {...props} />;
}
