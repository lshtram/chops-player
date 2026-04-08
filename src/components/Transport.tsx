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
    <div
      data-testid="transport"
      className="flex items-center gap-4 bg-neutral-900 p-4 rounded-lg"
    >
      <div className="font-mono text-sm text-neutral-100 tabular-nums min-w-[5rem]">
        <span>{formatTime(position.seconds)}</span>
        <span className="text-neutral-500 mx-1">|</span>
        <span className="text-neutral-400">
          {position.bar}.{position.beat}
        </span>
      </div>

      <div className="flex gap-2">
        {isStopped && (
          <button
            onClick={play}
            disabled={!isReady}
            aria-label="Play"
            data-testid="play-button"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white font-semibold rounded transition-colors cursor-pointer"
          >
            Play
          </button>
        )}

        {isPlaying && (
          <button
            onClick={pause}
            aria-label="Pause"
            data-testid="pause-button"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded transition-colors cursor-pointer"
          >
            Pause
          </button>
        )}

        {isPaused && (
          <button
            onClick={play}
            aria-label="Play"
            data-testid="play-button"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded transition-colors cursor-pointer"
          >
            Play
          </button>
        )}

        <button
          onClick={stop}
          aria-label="Stop"
          data-testid="stop-button"
          className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold rounded transition-colors cursor-pointer"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
