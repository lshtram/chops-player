/**
 * MIDI file parser — converts Standard MIDI File bytes into a Song model.
 *
 * @module parsers/midi-reader
 * @see ADR-006 in architecture.md
 */

import type { Song, Track, NoteEvent, TempoEvent, TimeSignatureEvent } from "../model/song.ts";

/**
 * Error thrown when MIDI file parsing fails.
 */
export class MidiParseError extends Error {
  override readonly name = "MidiParseError" as const;

  constructor(message: string) {
    super(message);
  }
}

/**
 * Check whether an ArrayBuffer looks like a valid MIDI file.
 */
export function isMidiFile(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const view = new DataView(buffer);
  return (
    view.getUint8(0) === 0x4d && // M
    view.getUint8(1) === 0x54 && // T
    view.getUint8(2) === 0x68 && // h
    view.getUint8(3) === 0x64    // d
  );
}

/**
 * Read a MIDI variable-length quantity (VLQ).
 * Returns the value and the number of bytes consumed.
 */
function readVLQ(view: DataView, offset: number): { value: number; bytesRead: number } {
  let value = 0;
  let bytesRead = 0;
  while (offset < view.byteLength) {
    const byte = view.getUint8(offset++);
    bytesRead++;
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) break;
  }
  return { value, bytesRead };
}

/**
 * Parse the MThd header chunk.
 * Returns parsed header fields and the new offset after the header.
 */
function parseHeader(view: DataView, offset: number): {
  format: 0 | 1;
  trackCount: number;
  ticksPerBeat: number;
  newOffset: number;
} {
  if (
    view.getUint8(offset) !== 0x4d ||
    view.getUint8(offset + 1) !== 0x54 ||
    view.getUint8(offset + 2) !== 0x68 ||
    view.getUint8(offset + 3) !== 0x64
  ) {
    throw new MidiParseError("Invalid MIDI header: missing MThd magic bytes");
  }
  offset += 4;

  const headerLen = view.getUint32(offset);
  offset += 4;

  if (headerLen < 6) {
    throw new MidiParseError("MIDI header length too short");
  }

  const formatValue = view.getUint16(offset);
  if (formatValue !== 0 && formatValue !== 1) {
    throw new MidiParseError(
      `Invalid MIDI format: ${formatValue}. Only format 0 and 1 are supported.`,
    );
  }
  const format: 0 | 1 = formatValue;
  offset += 2;

  const trackCount = view.getUint16(offset);
  offset += 2;

  const ticksPerBeat = view.getUint16(offset);
  offset += 2;

  return { format, trackCount, ticksPerBeat, newOffset: offset };
}

/**
 * Parse a single MTrk track chunk.
 * Returns the new offset, track notes, track name, channel, and collected
 * tempo/time events from the track.
 */
function parseTrack(
  view: DataView,
  offset: number,
  _trackIndex: number,
  absTickStart: number,
): {
  newOffset: number;
  trackNotes: NoteEvent[];
  trackName: string;
  channel: number;
  program: number;
  hasAnyEvents: boolean;
  tempoMap: TempoEvent[];
  timeSignatures: TimeSignatureEvent[];
} {
  if (
    view.getUint8(offset) !== 0x4d ||
    view.getUint8(offset + 1) !== 0x54 ||
    view.getUint8(offset + 2) !== 0x72 ||
    view.getUint8(offset + 3) !== 0x6b
  ) {
    throw new MidiParseError("Invalid MIDI track: missing MTrk magic bytes");
  }
  offset += 4;

  const trackLen = view.getUint32(offset);
  offset += 4;

  const trackEnd = offset + trackLen;
  if (trackEnd > view.byteLength) {
    throw new MidiParseError("MIDI track extends beyond file length");
  }

  let absTick = absTickStart;
  let runningStatus = 0;
  const trackNotes: NoteEvent[] = [];
  let trackName = "";
  let channel = 0;
  let program = 0;
  let hasAnyEvents = false;
  const activeNotes = new Map<number, { startTick: number; velocity: number }>();
  const tempoMap: TempoEvent[] = [];
  const timeSignatures: TimeSignatureEvent[] = [];

  while (offset < trackEnd) {
    const deltaResult = readVLQ(view, offset);
    const deltaTick = deltaResult.value;
    offset += deltaResult.bytesRead;
    absTick += deltaTick;

    if (offset >= trackEnd) break;

    let status = view.getUint8(offset);

    if ((status & 0x80) !== 0) {
      runningStatus = status;
      offset++;
    }

    if (runningStatus === 0) {
      offset = trackEnd;
      break;
    }

    const eventType = (runningStatus >> 4) & 0x0f;
    const eventChannel = runningStatus & 0x0f;

    switch (eventType) {
      case 0x02: // Key pressure (polyphonic aftertouch) — 2 data bytes
      case 0x03: // (unused in standard MIDI — treated as 2-byte)
      case 0x0a: // Polyphonic key pressure — 2 data bytes
      case 0x0b: // Control change — 2 data bytes
      case 0x0e: // Pitch bend — 2 data bytes
        if (offset + 1 < trackEnd) {
          hasAnyEvents = true;
          offset += 2;
        } else {
          offset = trackEnd;
        }
        break;

      case 0x0c: // Program change — 1 data byte
        if (offset < trackEnd) {
          hasAnyEvents = true;
          program = view.getUint8(offset);
          offset += 1;
        } else {
          offset = trackEnd;
        }
        break;

      case 0x0d: // Channel pressure (aftertouch) — 1 data byte
        if (offset < trackEnd) {
          hasAnyEvents = true;
          offset += 1;
        } else {
          offset = trackEnd;
        }
        break;

      case 0x08: // Note off
      case 0x09: // Note on
        if (offset + 1 < trackEnd) {
          hasAnyEvents = true;
          const notePitch = view.getUint8(offset);
          const noteVelocity = view.getUint8(offset + 1);
          offset += 2;

          if (eventType === 0x09 && noteVelocity > 0) {
            activeNotes.set(notePitch, { startTick: absTick, velocity: noteVelocity });
            channel = eventChannel;
          } else {
            const noteOn = activeNotes.get(notePitch);
            if (noteOn) {
              trackNotes.push({
                pitch: notePitch,
                velocity: noteOn.velocity,
                startTick: noteOn.startTick,
                durationTicks: absTick - noteOn.startTick,
              });
              activeNotes.delete(notePitch);
            }
          }
        } else {
          offset = trackEnd;
        }
        break;

      case 0x0f: // Meta event or sysex
        if (runningStatus === 0xff) {
          const metaType = view.getUint8(offset++);
          const result = readVLQ(view, offset);
          const dataLen = result.value;
          offset += result.bytesRead;

          if (offset + dataLen > trackEnd) {
            offset = trackEnd;
            break;
          }

          hasAnyEvents = true;

          switch (metaType) {
            case 0x03: // Track name
              trackName = String.fromCharCode(
                ...Array.from({ length: dataLen }, (_, i) => view.getUint8(offset + i))
              ).replace(/\0/g, "");
              break;

            case 0x51: // Tempo
              if (dataLen === 3) {
                const microseconds =
                  (view.getUint8(offset) << 16) |
                  (view.getUint8(offset + 1) << 8) |
                  view.getUint8(offset + 2);
                tempoMap.push({ tick: absTick, microsecondsPerBeat: microseconds });
              }
              break;

            case 0x58: // Time signature
              if (dataLen >= 4) {
                const numerator = view.getUint8(offset);
                const denominator = Math.pow(2, view.getUint8(offset + 1));
                timeSignatures.push({
                  tick: absTick,
                  numerator,
                  denominator,
                });
              }
              break;

            case 0x2f: // End of track
              offset = trackEnd;
              break;
          }

          offset += dataLen;
        } else {
          const result = readVLQ(view, offset);
          offset += result.bytesRead + result.value;
        }
        break;

      default:
        offset = trackEnd;
        break;
    }
  }

  // Flush remaining active notes as short notes
  for (const [pitch, noteOn] of activeNotes) {
    trackNotes.push({
      pitch,
      velocity: noteOn.velocity,
      startTick: noteOn.startTick,
      durationTicks: absTick - noteOn.startTick,
    });
  }

  return { newOffset: trackEnd, trackNotes, trackName, channel, program, hasAnyEvents, tempoMap, timeSignatures };
}

/**
 * Collect tracks from the parsed track data, merging tempo/time sig events.
 * Returns the collected tracks and discovered song name.
 */
function collectTracks(
  view: DataView,
  trackCount: number,
  headerEndOffset: number,
): {
  tracks: Track[];
  tempoMap: TempoEvent[];
  timeSignatures: TimeSignatureEvent[];
  songName: string;
} {
  const tracks: Track[] = [];
  const tempoMap: TempoEvent[] = [];
  const timeSignatures: TimeSignatureEvent[] = [];
  let songName = "";
  let offset = headerEndOffset;

  for (let trackIdx = 0; trackIdx < trackCount; trackIdx++) {
    if (offset + 8 > view.byteLength) break;

    const {
      newOffset,
      trackNotes,
      trackName,
      channel,
      program,
      hasAnyEvents,
      tempoMap: trackTempos,
      timeSignatures: trackSigs,
    } = parseTrack(view, offset, trackIdx, 0);

    if (trackTempos.length > 0) tempoMap.push(...trackTempos);
    if (trackSigs.length > 0) timeSignatures.push(...trackSigs);

    if (hasAnyEvents || trackNotes.length > 0 || trackName) {
      if (trackIdx === 0 && trackName && !songName) {
        songName = trackName;
      }
      tracks.push({
        name: trackName || `Track ${trackIdx + 1}`,
        channel,
        program,
        bank: 0,
        isDrum: channel === 9,
        notes: trackNotes.sort((a, b) => a.startTick - b.startTick),
      });
    }

    offset = newOffset;
  }

  return { tracks, tempoMap, timeSignatures, songName };
}

/**
 * Calculate total song duration in seconds from tracks and tempo map.
 */
function calculateSongDuration(
  tracks: Track[],
  tempoMap: TempoEvent[],
  ticksPerBeat: number,
): number {
  let maxTick = 0;
  for (const track of tracks) {
    for (const note of track.notes) {
      const endTick = note.startTick + note.durationTicks;
      if (endTick > maxTick) maxTick = endTick;
    }
  }

  let durationSeconds = 0;
  let prevTick = 0;
  let prevTempo = 500000;
  const sortedTempos = [...tempoMap].sort((a, b) => a.tick - b.tick);

  for (const tempo of sortedTempos) {
    const ticksInSegment = tempo.tick - prevTick;
    const secondsInSegment =
      (ticksInSegment / ticksPerBeat) * (prevTempo / 1_000_000);
    durationSeconds += secondsInSegment;
    prevTick = tempo.tick;
    prevTempo = tempo.microsecondsPerBeat;
  }

  const remainingTicks = maxTick - prevTick;
  durationSeconds +=
    (remainingTicks / ticksPerBeat) * (prevTempo / 1_000_000);

  return durationSeconds;
}

/**
 * Parse a Standard MIDI File (Type 0 or Type 1) from an ArrayBuffer.
 */
export function parseMidiFile(buffer: ArrayBuffer): Song {
  if (buffer.byteLength === 0) {
    throw new MidiParseError("MIDI file is empty or too short");
  }

  if (!isMidiFile(buffer)) {
    throw new MidiParseError("Invalid MIDI header: missing MThd magic bytes");
  }

  const view = new DataView(buffer);
  const { format, trackCount, ticksPerBeat, newOffset: headerEndOffset } =
    parseHeader(view, 0);

  const { tracks, tempoMap, timeSignatures, songName } = collectTracks(
    view,
    trackCount,
    headerEndOffset,
  );

  if (tracks.length === 0) {
    tracks.push({
      name: songName || "Untitled",
      channel: 0,
      program: 0,
      bank: 0,
      isDrum: false,
      notes: [],
    });
  }

  if (timeSignatures.length === 0) {
    timeSignatures.push({ tick: 0, numerator: 4, denominator: 4 });
  }

  if (tempoMap.length === 0) {
    tempoMap.push({ tick: 0, microsecondsPerBeat: 500000 });
  }

  const durationSeconds = calculateSongDuration(tracks, tempoMap, ticksPerBeat);

  let maxTick = 0;
  for (const track of tracks) {
    for (const note of track.notes) {
      const endTick = note.startTick + note.durationTicks;
      if (endTick > maxTick) maxTick = endTick;
    }
  }

  return {
    name: songName || "Untitled",
    ticksPerBeat,
    durationSeconds,
    durationTicks: maxTick,
    tracks,
    tempoMap,
    timeSignatures,
    format,
  };
}
