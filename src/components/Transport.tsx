/**
 * Transport component — renders transport controls (play, pause, stop).
 *
 * @module components/Transport
 * @see P1-UI-001 through P1-UI-007 in requirements-phase1.md
 */

import { usePlayerStore } from "@stores/player-store";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function Transport(): React.JSX.Element {
  const playbackState = usePlayerStore((s) => s.playbackState);
  const isReady = usePlayerStore((s) => s.isReady);
  const position = usePlayerStore((s) => s.position);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);
  const stop = usePlayerStore((s) => s.stop);

  const isPlaying = playbackState === "playing";
  const isPaused = playbackState === "paused";
  const isStopped = playbackState === "stopped";

  return (
    <div data-testid="transport">
      <div>
        <span>{formatTime(position.seconds)}</span>
        <span> | </span>
        <span>
          {position.bar}.{position.beat}
        </span>
      </div>

      {isStopped && (
        <button
          onClick={play}
          disabled={!isReady}
          aria-label="Play"
          data-testid="play-button"
        >
          Play
        </button>
      )}

      {isPlaying && (
        <button
          onClick={pause}
          aria-label="Pause"
          data-testid="pause-button"
        >
          Pause
        </button>
      )}

      {isPaused && (
        <button
          onClick={play}
          aria-label="Play"
          data-testid="play-button"
        >
          Play
        </button>
      )}

      <button
        onClick={stop}
        aria-label="Stop"
        data-testid="stop-button"
      >
        Stop
      </button>
    </div>
  );
}
