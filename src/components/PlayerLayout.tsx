/**
 * PlayerLayout and ChopsPlayer components.
 *
 * @module components/PlayerLayout
 * @see P1-UI-001, P1-UI-008, P1-UI-009 in requirements-phase1.md
 */

import { usePlayerStore } from "@stores/player-store";
import { Transport } from "./Transport.tsx";
import { MixerBoard } from "./Mixer.tsx";

export interface PlayerLayoutProps {
  midiUrl: string;
}

export interface ChopsPlayerProps {
  midiUrl: string;
}

export function PlayerLayout(_props: PlayerLayoutProps): React.JSX.Element {
  const isLoading = usePlayerStore((s) => s.isLoading);
  const error = usePlayerStore((s) => s.error);

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
        <div data-testid="error-message">{error}</div>
        <Transport />
        <MixerBoard channels={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]} />
      </div>
    );
  }

  return (
    <div data-testid="player-layout">
      <Transport />
      <MixerBoard channels={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]} />
    </div>
  );
}

export function ChopsPlayer(props: ChopsPlayerProps): React.JSX.Element {
  return <PlayerLayout {...props} />;
}
