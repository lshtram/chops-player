/**
 * Mixer components — MixerChannel and MixerBoard.
 *
 * @module components/Mixer
 * @see P1-UI-006, P1-UI-007 in requirements-phase1.md
 */

import { useMixerStore } from "@stores/mixer-store";

export interface MixerChannelProps {
  channel: number;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
}

export interface MixerBoardProps {
  channels: readonly number[];
}

export function MixerChannel({
  channel,
  volume,
  pan,
  muted,
  solo,
}: MixerChannelProps): React.JSX.Element {
  const setChannelVolume = useMixerStore((s) => s.setChannelVolume);
  const setChannelPan = useMixerStore((s) => s.setChannelPan);
  const setChannelMute = useMixerStore((s) => s.setChannelMute);
  const setChannelSolo = useMixerStore((s) => s.setChannelSolo);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChannelVolume(channel, parseInt(e.target.value, 10));
  };

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChannelPan(channel, parseInt(e.target.value, 10));
  };

  const handleMuteClick = () => {
    setChannelMute(channel, !muted);
  };

  const handleSoloClick = () => {
    setChannelSolo(channel, !solo);
  };

  return (
    <div data-testid="mixer-channel">
      <div>Ch {channel}</div>

      <div>
        <label>
          Volume
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            aria-label="Volume"
          />
          <span>{volume}</span>
        </label>
      </div>

      <div>
        <label>
          Pan
          <input
            type="range"
            min="-100"
            max="100"
            value={pan}
            onChange={handlePanChange}
            aria-label="Pan"
          />
          <span>{pan}</span>
        </label>
      </div>

      <button
        onClick={handleMuteClick}
        aria-pressed={muted}
        data-testid="mute-button"
      >
        {muted ? "Unmute" : "Mute"}
      </button>

      <button
        onClick={handleSoloClick}
        aria-pressed={solo}
        data-testid="solo-button"
      >
        {solo ? "Unsolo" : "Solo"}
      </button>
    </div>
  );
}

export function MixerBoard({ channels }: MixerBoardProps): React.JSX.Element {
  const mixerChannels = useMixerStore((s) => s.channels);

  return (
    <div data-testid="mixer-board">
      {channels.map((ch) => {
        const state = mixerChannels[ch] ?? {
          volume: 100,
          pan: 0,
          muted: false,
          solo: false,
        };
        return (
          <MixerChannel
            key={ch}
            channel={ch}
            volume={state.volume}
            pan={state.pan}
            muted={state.muted}
            solo={state.solo}
          />
        );
      })}
    </div>
  );
}
