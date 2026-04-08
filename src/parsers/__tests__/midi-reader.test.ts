/**
 * Tests for midi-reader (src/parsers/midi-reader.ts)
 *
 * API CHECKLIST — exported functions and coverage count:
 *   isMidiFile(buffer)      → 3 tests (P1-MR-001, P1-MR-002, P1-MR-003)
 *   parseMidiFile(buffer)   → 8 tests (P1-MR-004 through P1-MR-011)
 *
 * Test fixtures:
 *   - buildType0Midi()  — minimal valid Type 0 MIDI with 1 note
 *   - buildType1Midi()  — minimal valid Type 1 MIDI with 2 tracks
 *   - All fixtures are inline Uint8Array literals — no filesystem access
 */

import { describe, it, expect } from "vitest";
import { parseMidiFile, isMidiFile, MidiParseError } from "../../parsers/midi-reader.ts";

// ---------------------------------------------------------------------------
// MIDI fixture helpers
// ---------------------------------------------------------------------------

/**
 * Write a 32-bit big-endian integer into a byte array at offset.
 */
function writeUint32BE(arr: number[], offset: number, value: number): void {
  arr[offset] = (value >>> 24) & 0xff;
  arr[offset + 1] = (value >>> 16) & 0xff;
  arr[offset + 2] = (value >>> 8) & 0xff;
  arr[offset + 3] = value & 0xff;
}

/**
 * Write a 16-bit big-endian integer into a byte array at offset.
 */
function writeUint16BE(arr: number[], offset: number, value: number): void {
  arr[offset] = (value >>> 8) & 0xff;
  arr[offset + 1] = value & 0xff;
}

/**
 * Encode a MIDI variable-length quantity (VLQ).
 */
function vlq(value: number): number[] {
  if (value < 0x80) return [value];
  const bytes: number[] = [];
  let v = value;
  bytes.unshift(v & 0x7f);
  v >>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

/**
 * Build a minimal valid Type 0 MIDI file:
 *   Header: format=0, numTracks=1, division=480
 *   Track 0:
 *     delta=0,  FF 51 03 07 A1 20  (tempo = 120 BPM = 500000 µs)
 *     delta=0,  FF 58 04 04 02 18 08  (time sig 4/4)
 *     delta=0,  90 3C 40  (note-on ch0, C4, vel=64)
 *     delta=96, 80 3C 00  (note-off ch0, C4)
 *     delta=0,  FF 2F 00  (end of track)
 */
function buildType0Midi(): ArrayBuffer {
  const trackEvents: number[] = [
    // Tempo 120 BPM: delta=0, FF 51 03 07 A1 20
    ...vlq(0), 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,
    // Time sig 4/4: delta=0, FF 58 04 04 02 18 08
    ...vlq(0), 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08,
    // Note-on: delta=0, 90 3C 40
    ...vlq(0), 0x90, 0x3c, 0x40,
    // Note-off: delta=96 ticks, 80 3C 00
    ...vlq(96), 0x80, 0x3c, 0x00,
    // End of track: delta=0, FF 2F 00
    ...vlq(0), 0xff, 0x2f, 0x00,
  ];

  const trackLength = trackEvents.length;

  // Header chunk: MThd + length(6) + format(0) + numTracks(1) + division(480)
  const header = new Array<number>(14).fill(0);
  // "MThd"
  header[0] = 0x4d; header[1] = 0x54; header[2] = 0x68; header[3] = 0x64;
  writeUint32BE(header, 4, 6);      // length = 6
  writeUint16BE(header, 8, 0);      // format = 0
  writeUint16BE(header, 10, 1);     // numTracks = 1
  writeUint16BE(header, 12, 480);   // division = 480 tpqn

  // Track chunk: MTrk + length + events
  const trackHeader = new Array<number>(8).fill(0);
  // "MTrk"
  trackHeader[0] = 0x4d; trackHeader[1] = 0x54;
  trackHeader[2] = 0x72; trackHeader[3] = 0x6b;
  writeUint32BE(trackHeader, 4, trackLength);

  const allBytes = [...header, ...trackHeader, ...trackEvents];
  return new Uint8Array(allBytes).buffer;
}

/**
 * Build a minimal valid Type 1 MIDI file:
 *   Header: format=1, numTracks=2, division=480
 *   Track 0: tempo meta event + end of track
 *   Track 1: note-on + note-off + end of track
 */
function buildType1Midi(): ArrayBuffer {
  const track0Events: number[] = [
    // Tempo 120 BPM: delta=0, FF 51 03 07 A1 20
    ...vlq(0), 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,
    // End of track
    ...vlq(0), 0xff, 0x2f, 0x00,
  ];

  const track1Events: number[] = [
    // Note-on ch0 C4: delta=0, 90 3C 40
    ...vlq(0), 0x90, 0x3c, 0x40,
    // Note-off ch0 C4: delta=96
    ...vlq(96), 0x80, 0x3c, 0x00,
    // End of track
    ...vlq(0), 0xff, 0x2f, 0x00,
  ];

  // Header
  const header = new Array<number>(14).fill(0);
  header[0] = 0x4d; header[1] = 0x54; header[2] = 0x68; header[3] = 0x64;
  writeUint32BE(header, 4, 6);
  writeUint16BE(header, 8, 1);      // format = 1
  writeUint16BE(header, 10, 2);     // numTracks = 2
  writeUint16BE(header, 12, 480);

  function buildTrackChunk(events: number[]): number[] {
    const trackHeader = new Array<number>(8).fill(0);
    trackHeader[0] = 0x4d; trackHeader[1] = 0x54;
    trackHeader[2] = 0x72; trackHeader[3] = 0x6b;
    writeUint32BE(trackHeader, 4, events.length);
    return [...trackHeader, ...events];
  }

  const allBytes = [
    ...header,
    ...buildTrackChunk(track0Events),
    ...buildTrackChunk(track1Events),
  ];
  return new Uint8Array(allBytes).buffer;
}

// ---------------------------------------------------------------------------
// Tests — isMidiFile()
// ---------------------------------------------------------------------------

describe("isMidiFile()", () => {
  it("P1-MR-001: returns true for a buffer starting with MThd magic bytes", () => {
    // Arrange — buffer starting with 4D 54 68 64
    const buffer = new Uint8Array([0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06]).buffer;

    // Act
    const result = isMidiFile(buffer);

    // Assert
    expect(result).toBe(true);
  });

  it("P1-MR-002: returns false for a buffer that does not start with MThd", () => {
    // Arrange — invalid header
    const buffer = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]).buffer; // "RIFF"

    // Act
    const result = isMidiFile(buffer);

    // Assert
    expect(result).toBe(false);
  });

  it("P1-MR-003: returns false for an empty buffer", () => {
    // Arrange
    const buffer = new ArrayBuffer(0);

    // Act
    const result = isMidiFile(buffer);

    // Assert
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests — parseMidiFile()
// ---------------------------------------------------------------------------

describe("parseMidiFile()", () => {
  it("P1-MR-004: throws MidiParseError for an empty buffer", () => {
    // Arrange
    const buffer = new ArrayBuffer(0);

    // Act & Assert
    expect(() => parseMidiFile(buffer)).toThrow(MidiParseError);
    expect(() => parseMidiFile(buffer)).toThrow(/empty|too short|invalid length/i);
  });

  it("P1-MR-005: throws MidiParseError for a buffer that is not a valid MIDI file", () => {
    // Arrange — random bytes
    const buffer = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]).buffer;

    // Act & Assert
    expect(() => parseMidiFile(buffer)).toThrow(MidiParseError);
    expect(() => parseMidiFile(buffer)).toThrow(/invalid|header|magic|MThd/i);
  });

  it("P1-MR-006: returns a Song with correct format (0) from a minimal valid Type 0 MIDI file", () => {
    // Arrange
    const buffer = buildType0Midi();

    // Act
    const song = parseMidiFile(buffer);

    // Assert
    expect(song.format).toBe(0);
  });

  it("P1-MR-007: returns a Song with at least one track from a minimal Type 0 MIDI file", () => {
    // Arrange
    const buffer = buildType0Midi();

    // Act
    const song = parseMidiFile(buffer);

    // Assert
    expect(song.tracks.length).toBeGreaterThanOrEqual(1);
  });

  it("P1-MR-008: parses timeBase (ticks per quarter note = 480) from the MIDI header correctly", () => {
    // Arrange
    const buffer = buildType0Midi();

    // Act
    const song = parseMidiFile(buffer);

    // Assert
    expect(song.ticksPerBeat).toBe(480);
  });

  it("P1-MR-009: returns a Song with at least 2 tracks for a Type 1 MIDI file with 2 tracks", () => {
    // Arrange
    const buffer = buildType1Midi();

    // Act
    const song = parseMidiFile(buffer);

    // Assert — Type 1 should have 2 tracks (or more if Type 0 split logic applies)
    expect(song.tracks.length).toBeGreaterThanOrEqual(2);
  });

  it("P1-MR-010: reads Program Change events and stores the correct program number on the track", () => {
    // Arrange
    const buffer = buildType0Midi();

    // Act
    const song = parseMidiFile(buffer);

    // Assert — at least one track contains at least one note event
    const allNotes = song.tracks.flatMap((t) => t.notes);
    expect(allNotes.length).toBeGreaterThanOrEqual(1);
    // Verify the first note looks correct: C4 = pitch 60
    expect(allNotes[0]?.pitch).toBe(0x3c); // 0x3C = 60 = middle C
  });

  it("P1-MR-011: reads Program Change events and stores the correct program number on the track", () => {
    // Arrange — Type 0 MIDI with a Program Change to program 32 (Bass) before the note
    const trackEvents: number[] = [
      // Tempo 120 BPM
      ...vlq(0), 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,
      // Program Change ch0, program=32 (Bass): delta=0, C0 20
      ...vlq(0), 0xc0, 0x20,
      // Note-on ch0 C4: delta=0, 90 3C 40
      ...vlq(0), 0x90, 0x3c, 0x40,
      // Note-off ch0 C4: delta=96
      ...vlq(96), 0x80, 0x3c, 0x00,
      // End of track
      ...vlq(0), 0xff, 0x2f, 0x00,
    ];

    const trackHeader = new Array<number>(8).fill(0);
    trackHeader[0] = 0x4d; trackHeader[1] = 0x54;
    trackHeader[2] = 0x72; trackHeader[3] = 0x6b;
    writeUint32BE(trackHeader, 4, trackEvents.length);

    const header = new Array<number>(14).fill(0);
    header[0] = 0x4d; header[1] = 0x54; header[2] = 0x68; header[3] = 0x64;
    writeUint32BE(header, 4, 6);
    writeUint16BE(header, 8, 0);   // format 0
    writeUint16BE(header, 10, 1);  // 1 track
    writeUint16BE(header, 12, 480);

    const buffer = new Uint8Array([...header, ...trackHeader, ...trackEvents]).buffer;

    // Act
    const song = parseMidiFile(buffer);

    // Assert
    expect(song.tracks.length).toBeGreaterThanOrEqual(1);
    expect(song.tracks[0]?.program).toBe(32); // General MIDI program 32 = Acoustic Bass
  });
});
