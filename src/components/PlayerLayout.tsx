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
  const initialize = usePlayerStore((s) => s.initialize);
  const loadMidi = usePlayerStore((s) => s.loadMidi);
  const loadMidiBuffer = usePlayerStore((s) => s.loadMidiBuffer);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <div data-testid="loading-indicator">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="player-layout">
        {uploadBar}
        <div data-testid="error-message">{error}</div>
        <Transport />
        <MixerBoard channels={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]} />
      </div>
    );
  }

  return (
    <div data-testid="player-layout">
      {uploadBar}
      <Transport />
      <MixerBoard channels={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]} />
    </div>
  );
}

export function ChopsPlayer(props: ChopsPlayerProps): React.JSX.Element {
  return <PlayerLayout {...props} />;
}
