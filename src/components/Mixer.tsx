/**
 * Mixer components — MixerChannel and MixerBoard.
 *
 * @module components/Mixer
 * @see P1-UI-006, P1-UI-007 in requirements-phase1.md
 */

import { useMixerStore } from "@stores/mixer-store";
import { usePlayerStore } from "@stores/player-store";
import type { Track } from "@model/song.ts";

/**
 * Compact GM program → instrument family name lookup.
 * Drums are handled separately via Track.isDrum.
 */
const GM_FAMILY: Record<number, string> = {
  // Piano family 0–7
  0: "Piano", 1: "Piano", 2: "Piano", 3: "Piano",
  4: "Piano", 5: "Piano", 6: "Piano", 7: "Piano",
  // Chromatic Perc 8–15
  8: "Perc", 9: "Perc", 10: "Perc", 11: "Perc",
  12: "Marimba", 13: "Xylophone", 14: "Perc", 15: "Perc",
  // Organ 16–23
  16: "Organ", 17: "Organ", 18: "Organ", 19: "Organ",
  20: "Organ", 21: "Organ", 22: "Organ", 23: "Organ",
  // Guitar 24–31
  24: "Guitar", 25: "Guitar", 26: "Guitar", 27: "Guitar",
  28: "Guitar", 29: "Guitar", 30: "Guitar", 31: "Guitar",
  // Bass 32–39
  32: "Bass", 33: "Bass", 34: "Bass", 35: "Bass",
  36: "Bass", 37: "Bass", 38: "Bass", 39: "Bass",
  // Strings 40–47
  40: "Strings", 41: "Strings", 42: "Strings", 43: "Strings",
  44: "Strings", 45: "Strings", 46: "Harp", 47: "Timpani",
  // Ensemble 48–55
  48: "Strings", 49: "Strings", 50: "Strings", 51: "Strings",
  52: "Choir", 53: "Choir", 54: "Choir", 55: "Orch Hit",
  // Brass 56–63
  56: "Trumpet", 57: "Trombone", 58: "Tuba", 59: "Muted Tp",
  60: "Fr Horn", 61: "Brass", 62: "Synth Brass", 63: "Synth Brass",
  // Reed 64–71
  64: "Sop Sax", 65: "Alto Sax", 66: "Ten Sax", 67: "Bari Sax",
  68: "Oboe", 69: "Eng Horn", 70: "Bassoon", 71: "Clarinet",
  // Pipe 72–79
  72: "Piccolo", 73: "Flute", 74: "Recorder", 75: "Pan Flute",
  76: "Bottle", 77: "Shakuhachi", 78: "Whistle", 79: "Ocarina",
  // Synth Lead 80–87
  80: "Synth", 81: "Synth", 82: "Synth", 83: "Synth",
  84: "Synth", 85: "Synth", 86: "Synth", 87: "Synth",
  // Synth Pad 88–95
  88: "Pad", 89: "Pad", 90: "Pad", 91: "Pad",
  92: "Pad", 93: "Pad", 94: "Pad", 95: "Pad",
  // Ethnic / Perc 96–111 (sampled)
  96: "FX", 97: "FX", 98: "FX", 99: "FX",
  100: "FX", 101: "FX", 102: "FX", 103: "FX",
  104: "Sitar", 105: "Banjo", 106: "Shamisen", 107: "Koto",
  108: "Kalimba", 109: "Bagpipe", 110: "Fiddle", 111: "Shanai",
  // Percussive 112–119
  112: "Tinkle", 113: "Agogo", 114: "Steeldrum", 115: "Woodblock",
  116: "Taiko", 117: "Melo Tom", 118: "Synth Drum", 119: "Rev Cym",
  // Sound FX 120–127
  120: "FX", 121: "FX", 122: "FX", 123: "FX",
  124: "FX", 125: "FX", 126: "FX", 127: "FX",
};

/** Returns a short instrument label for a track. */
function trackLabel(track: Track): string {
  if (track.isDrum) return "Drums";
  return GM_FAMILY[track.program] ?? "Ch";
}

export interface MixerChannelProps {
  channel: number;
  label: string;
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
  label,
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
      <div>Ch {channel} — {label}</div>

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
  const song = usePlayerStore((s) => s.song);

  // Build channel → instrument label map from song tracks
  const channelLabels = new Map<number, string>();
  if (song) {
    for (const track of song.tracks) {
      if (!channelLabels.has(track.channel)) {
        channelLabels.set(track.channel, trackLabel(track));
      }
    }
  }

  return (
    <div data-testid="mixer-board">
      {channels.map((ch) => {
        const state = mixerChannels[ch] ?? {
          volume: 100,
          pan: 0,
          muted: false,
          solo: false,
        };
        const label = channelLabels.get(ch) ?? "—";
        return (
          <MixerChannel
            key={ch}
            channel={ch}
            label={label}
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
