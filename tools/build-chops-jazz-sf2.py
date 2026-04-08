#!/usr/bin/env python3
"""
chops-jazz SF2 Assembler
========================
Extracts specific presets from multiple SF2 source files and combines
them into a single compact chops-jazz.sf2.

Usage:
    python3 tools/build-chops-jazz-sf2.py

Output:
    /data/projects/SoundFonts/chops-jazz.sf2
"""

import struct
import os
import sys
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# SF2 structure constants
# ---------------------------------------------------------------------------
PHDR_SIZE = 38
PBAG_SIZE = 4
PMOD_SIZE = 10
PGEN_SIZE = 4
INST_SIZE = 22
IBAG_SIZE = 4
IMOD_SIZE = 10
IGEN_SIZE = 4
SHDR_SIZE = 46

GEN_INSTRUMENT = 41  # preset-layer generator: references an instrument
GEN_SAMPLE_ID = 53  # instrument-layer generator: references a sample


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class SampleHeader:
    name: str
    start: int  # in sample frames (16-bit words)
    end: int
    startloop: int
    endloop: int
    sample_rate: int
    original_key: int  # byOriginalPitch (unsigned)
    correction: int  # chPitchCorrection (signed)
    sample_link: int  # index of linked sample (stereo pair)
    sample_type: int  # 1=mono 2=right 4=left 8=linked


@dataclass
class ParsedSF2:
    path: str
    raw: bytes
    phdr: List  # (name, preset, bank, bag_idx, lib, genre, morph)
    pbag: List  # (gen_idx, mod_idx)
    pmod: List  # raw 10-byte buffers
    pgen: List  # (oper, amount_raw_2bytes)
    inst: List  # (name, bag_idx)
    ibag: List  # (gen_idx, mod_idx)
    imod: List  # raw 10-byte buffers
    igen: List  # (oper, amount_raw_2bytes)
    shdr: List  # SampleHeader
    smpl_offset: int  # byte offset of smpl data within raw
    smpl_size: int


# ---------------------------------------------------------------------------
# SF2 parser
# ---------------------------------------------------------------------------


def parse_sf2(path: str) -> ParsedSF2:
    print(f"Loading {os.path.basename(path)} ...", flush=True)
    with open(path, "rb") as fh:
        raw = fh.read()

    # Walk all RIFF chunks and collect leaf chunks by tag
    chunks: Dict[bytes, Tuple[int, int]] = {}  # tag -> (content_start, size)

    def walk(offset: int, end: int) -> None:
        while offset + 8 <= end:
            tag = raw[offset : offset + 4]
            size = struct.unpack_from("<I", raw, offset + 4)[0]
            content_start = offset + 8
            content_end = content_start + size
            if tag == b"LIST":
                walk(content_start + 4, content_end)
            else:
                chunks[tag] = (content_start, size)
            offset = content_end + (size & 1)  # RIFF word-aligns chunks

    walk(12, len(raw))

    def get(tag: bytes) -> bytes:
        if tag not in chunks:
            return b""
        s, sz = chunks[tag]
        return raw[s : s + sz]

    # phdr
    phdr_raw = get(b"phdr")
    phdr = []
    for i in range(0, len(phdr_raw), PHDR_SIZE):
        f = struct.unpack_from("<20sHHHIII", phdr_raw, i)
        phdr.append(
            (f[0].rstrip(b"\x00").decode("latin-1"), f[1], f[2], f[3], f[4], f[5], f[6])
        )

    # pbag
    pbag_raw = get(b"pbag")
    pbag = [
        struct.unpack_from("<HH", pbag_raw, i)
        for i in range(0, len(pbag_raw), PBAG_SIZE)
    ]

    # pmod (keep raw bytes)
    pmod_raw = get(b"pmod")
    pmod = [pmod_raw[i : i + PMOD_SIZE] for i in range(0, len(pmod_raw), PMOD_SIZE)]

    # pgen
    pgen_raw = get(b"pgen")
    pgen = [
        (struct.unpack_from("<H", pgen_raw, i)[0], pgen_raw[i + 2 : i + 4])
        for i in range(0, len(pgen_raw), PGEN_SIZE)
    ]

    # inst
    inst_raw = get(b"inst")
    inst = []
    for i in range(0, len(inst_raw), INST_SIZE):
        f = struct.unpack_from("<20sH", inst_raw, i)
        inst.append((f[0].rstrip(b"\x00").decode("latin-1"), f[1]))

    # ibag
    ibag_raw = get(b"ibag")
    ibag = [
        struct.unpack_from("<HH", ibag_raw, i)
        for i in range(0, len(ibag_raw), IBAG_SIZE)
    ]

    # imod
    imod_raw = get(b"imod")
    imod = [imod_raw[i : i + IMOD_SIZE] for i in range(0, len(imod_raw), IMOD_SIZE)]

    # igen
    igen_raw = get(b"igen")
    igen = [
        (struct.unpack_from("<H", igen_raw, i)[0], igen_raw[i + 2 : i + 4])
        for i in range(0, len(igen_raw), IGEN_SIZE)
    ]

    # shdr
    shdr_raw = get(b"shdr")
    shdr = []
    for i in range(0, len(shdr_raw), SHDR_SIZE):
        f = struct.unpack_from("<20sIIIIIBbHH", shdr_raw, i)
        shdr.append(
            SampleHeader(
                name=f[0].rstrip(b"\x00").decode("latin-1"),
                start=f[1],
                end=f[2],
                startloop=f[3],
                endloop=f[4],
                sample_rate=f[5],
                original_key=f[6],
                correction=f[7],
                sample_link=f[8],
                sample_type=f[9],
            )
        )

    smpl_offset, smpl_size = chunks.get(b"smpl", (0, 0))
    print(
        f"  {len(phdr) - 1} presets  "
        f"{len(inst) - 1} instruments  "
        f"{len(shdr) - 1} samples  "
        f"({smpl_size / 1024 / 1024:.1f} MB sample data)",
        flush=True,
    )

    return ParsedSF2(
        path=path,
        raw=raw,
        phdr=phdr,
        pbag=pbag,
        pmod=pmod,
        pgen=pgen,
        inst=inst,
        ibag=ibag,
        imod=imod,
        igen=igen,
        shdr=shdr,
        smpl_offset=smpl_offset,
        smpl_size=smpl_size,
    )


# ---------------------------------------------------------------------------
# SF2 assembler
# ---------------------------------------------------------------------------


class SF2Assembler:
    def __init__(self) -> None:
        # Output flat tables (filled during add_preset calls)
        self._phdr: List = []  # (name, preset, bank, bag_start_idx)
        self._pbag: List = []  # (gen_start_idx, mod_start_idx)
        self._pmod: List = []  # raw bytes
        self._pgen: List = []  # (oper, amount_raw)
        self._inst: List = []  # (name, ibag_start_idx)  — with None placeholders
        self._ibag: List = []
        self._imod: List = []
        self._igen: List = []
        self._shdr: List = []  # SampleHeader — with None placeholders
        self._smpl: bytearray = bytearray()

        # Deduplication caches — key: (source_path, src_index) -> new_index
        self._inst_map: Dict[Tuple, int] = {}
        self._sample_map: Dict[Tuple, int] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add_preset(
        self, sf2: ParsedSF2, bank: int, prog: int, rename: Optional[str] = None
    ) -> bool:
        """Extract one preset (bank, prog) from sf2 and append to output."""
        src_idx: Optional[int] = None
        for i, ph in enumerate(sf2.phdr[:-1]):  # skip EOP sentinel
            if ph[1] == prog and ph[2] == bank:
                src_idx = i
                break
        if src_idx is None:
            print(
                f"  WARNING: bank={bank} prog={prog} not found in "
                f"{os.path.basename(sf2.path)}"
            )
            return False

        ph = sf2.phdr[src_idx]
        next_ph = sf2.phdr[src_idx + 1]
        name = rename if rename else ph[0]
        bag_start = ph[3]
        bag_end = next_ph[3]

        new_bag_start = len(self._pbag)

        for bag_i in range(bag_start, bag_end):
            bag = sf2.pbag[bag_i]
            next_bag = sf2.pbag[bag_i + 1]
            gen_s, gen_e = bag[0], next_bag[0]
            mod_s, mod_e = bag[1], next_bag[1]

            new_gen_start = len(self._pgen)
            new_mod_start = len(self._pmod)

            for gi in range(gen_s, gen_e):
                oper, amount_raw = sf2.pgen[gi]
                if oper == GEN_INSTRUMENT:
                    src_inst_idx = struct.unpack("<H", amount_raw)[0]
                    new_inst_idx = self._add_instrument(sf2, src_inst_idx)
                    amount_raw = struct.pack("<H", new_inst_idx)
                self._pgen.append((oper, amount_raw))

            for mi in range(mod_s, mod_e):
                self._pmod.append(sf2.pmod[mi])

            self._pbag.append((new_gen_start, new_mod_start))

        self._phdr.append((name, ph[1], ph[2], new_bag_start))
        print(
            f"  + [{name}]  bank={ph[2]}  prog={ph[1]}  "
            f"(from {os.path.basename(sf2.path)})"
        )
        return True

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _add_instrument(self, sf2: ParsedSF2, src_idx: int) -> int:
        key = (sf2.path, src_idx)
        if key in self._inst_map:
            return self._inst_map[key]

        new_idx = len(self._inst)
        self._inst_map[key] = new_idx
        self._inst.append(None)  # placeholder — filled at end

        inst = sf2.inst[src_idx]
        next_inst = sf2.inst[src_idx + 1]
        bag_start = inst[1]
        bag_end = next_inst[1]

        new_ibag_start = len(self._ibag)

        for bag_i in range(bag_start, bag_end):
            bag = sf2.ibag[bag_i]
            next_bag = sf2.ibag[bag_i + 1]
            gen_s, gen_e = bag[0], next_bag[0]
            mod_s, mod_e = bag[1], next_bag[1]

            new_gen_start = len(self._igen)
            new_mod_start = len(self._imod)

            for gi in range(gen_s, gen_e):
                oper, amount_raw = sf2.igen[gi]
                if oper == GEN_SAMPLE_ID:
                    src_smp_idx = struct.unpack("<H", amount_raw)[0]
                    new_smp_idx = self._add_sample(sf2, src_smp_idx)
                    amount_raw = struct.pack("<H", new_smp_idx)
                self._igen.append((oper, amount_raw))

            for mi in range(mod_s, mod_e):
                self._imod.append(sf2.imod[mi])

            self._ibag.append((new_gen_start, new_mod_start))

        self._inst[new_idx] = (inst[0], new_ibag_start)
        return new_idx

    def _add_sample(self, sf2: ParsedSF2, src_idx: int) -> int:
        key = (sf2.path, src_idx)
        if key in self._sample_map:
            return self._sample_map[key]

        new_idx = len(self._shdr)
        self._sample_map[key] = new_idx
        self._shdr.append(None)  # placeholder

        s = sf2.shdr[src_idx]

        # Extract raw PCM (16-bit frames → bytes)
        byte_start = sf2.smpl_offset + s.start * 2
        byte_end = sf2.smpl_offset + s.end * 2
        pcm = sf2.raw[byte_start:byte_end]

        new_start = len(self._smpl) // 2
        self._smpl.extend(pcm)
        new_end = len(self._smpl) // 2

        # Remap loop points relative to new start
        new_startloop = new_start + (s.startloop - s.start)
        new_endloop = new_start + (s.endloop - s.start)

        # Handle stereo link — safe: _sample_map[key] already set above
        new_link = 0
        if s.sample_type in (2, 4) and s.sample_link != src_idx:
            new_link = self._add_sample(sf2, s.sample_link)

        self._shdr[new_idx] = SampleHeader(
            name=s.name,
            start=new_start,
            end=new_end,
            startloop=new_startloop,
            endloop=new_endloop,
            sample_rate=s.sample_rate,
            original_key=s.original_key,
            correction=s.correction,
            sample_link=new_link,
            sample_type=s.sample_type,
        )
        return new_idx

    # ------------------------------------------------------------------
    # Writer
    # ------------------------------------------------------------------

    def write(self, path: str) -> None:
        # ---- terminal entries ----------------------------------------
        eop_bag = len(self._pbag)
        self._pbag.append((len(self._pgen), len(self._pmod)))
        self._pgen.append((0, b"\x00\x00"))
        self._pmod.append(b"\x00" * PMOD_SIZE)
        self._phdr.append(("EOP", 255, 255, eop_bag))

        eoi_bag = len(self._ibag)
        self._ibag.append((len(self._igen), len(self._imod)))
        self._igen.append((0, b"\x00\x00"))
        self._imod.append(b"\x00" * IMOD_SIZE)
        self._inst.append(("EOI", eoi_bag))

        self._shdr.append(SampleHeader("EOS", 0, 0, 0, 0, 0, 60, 0, 0, 1))

        # Pad smpl to even byte count
        if len(self._smpl) & 1:
            self._smpl.append(0)

        # ---- serialise sub-chunks ------------------------------------
        def pack_phdr() -> bytes:
            out = bytearray()
            for name, preset, bank, bag in self._phdr:
                nb = name.encode("latin-1")[:19].ljust(20, b"\x00")
                out += struct.pack("<20sHHHIII", nb, preset, bank, bag, 0, 0, 0)
            return bytes(out)

        def pack_bags(lst) -> bytes:
            out = bytearray()
            for g, m in lst:
                out += struct.pack("<HH", g, m)
            return bytes(out)

        def pack_mods(lst) -> bytes:
            return b"".join(lst)

        def pack_gens(lst) -> bytes:
            out = bytearray()
            for oper, amt in lst:
                out += struct.pack("<H", oper) + amt
            return bytes(out)

        def pack_inst() -> bytes:
            out = bytearray()
            for name, bag in self._inst:
                nb = name.encode("latin-1")[:19].ljust(20, b"\x00")
                out += struct.pack("<20sH", nb, bag)
            return bytes(out)

        def pack_shdr() -> bytes:
            out = bytearray()
            for s in self._shdr:
                nb = s.name.encode("latin-1")[:19].ljust(20, b"\x00")
                out += struct.pack(
                    "<20sIIIIIBbHH",
                    nb,
                    s.start,
                    s.end,
                    s.startloop,
                    s.endloop,
                    s.sample_rate,
                    s.original_key,
                    s.correction,
                    s.sample_link,
                    s.sample_type,
                )
            return bytes(out)

        # ---- RIFF helpers -------------------------------------------
        def chunk(tag: bytes, data: bytes) -> bytes:
            if len(data) & 1:
                data += b"\x00"
            return tag + struct.pack("<I", len(data)) + data

        def list_chunk(tag: bytes, *parts: bytes) -> bytes:
            inner = b"".join(parts)
            if len(inner) & 1:
                inner += b"\x00"
            return b"LIST" + struct.pack("<I", len(inner) + 4) + tag + inner

        # ---- assemble -----------------------------------------------
        info = list_chunk(
            b"INFO",
            chunk(b"ifil", struct.pack("<HH", 2, 1)),
            chunk(b"isng", b"EMU8000\x00"),
            chunk(b"INAM", b"chops-jazz\x00"),
            chunk(b"ICRD", b"2026\x00"),
            chunk(b"ISFT", b"chops-assembler v1\x00"),
        )

        sdta = list_chunk(
            b"sdta",
            chunk(b"smpl", bytes(self._smpl)),
        )

        pdta = list_chunk(
            b"pdta",
            chunk(b"phdr", pack_phdr()),
            chunk(b"pbag", pack_bags(self._pbag)),
            chunk(b"pmod", pack_mods(self._pmod)),
            chunk(b"pgen", pack_gens(self._pgen)),
            chunk(b"inst", pack_inst()),
            chunk(b"ibag", pack_bags(self._ibag)),
            chunk(b"imod", pack_mods(self._imod)),
            chunk(b"igen", pack_gens(self._igen)),
            chunk(b"shdr", pack_shdr()),
        )

        body = info + sdta + pdta
        riff = b"RIFF" + struct.pack("<I", len(body) + 4) + b"sfbk" + body

        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(riff)

        mb = len(riff) / 1024 / 1024
        print(f"\n  Wrote {mb:.1f} MB  →  {path}")
        print(f"  Presets:     {len(self._phdr) - 1}")
        print(f"  Instruments: {len(self._inst) - 1}")
        print(f"  Samples:     {len(self._shdr) - 1}")
        print(f"  Sample data: {len(self._smpl) / 1024 / 1024:.1f} MB")


# ---------------------------------------------------------------------------
# Main: define what we want and run
# ---------------------------------------------------------------------------


def main() -> None:
    SF_DIR = "/data/projects/SoundFonts"
    SGM = os.path.join(SF_DIR, "SGM-V2.01.sf2")
    FLUID = os.path.join(SF_DIR, "FluidR3_GM.sf2")
    OUT = os.path.join(SF_DIR, "chops-jazz.sf2")

    for p in (SGM, FLUID):
        if not os.path.exists(p):
            print(f"ERROR: Source file not found: {p}", file=sys.stderr)
            sys.exit(1)

    sgm = parse_sf2(SGM)
    fluid = parse_sf2(FLUID)

    asm = SF2Assembler()
    print("\nExtracting presets...")

    # ------------------------------------------------------------------ #
    #  MELODIC PRESETS                                                     #
    #  All map to standard GM program numbers so SpessaSynth uses them     #
    #  transparently on MIDI channel programs.                             #
    # ------------------------------------------------------------------ #

    # Acoustic Grand Piano — from SGM (Piano 1, bank 0 prog 0)
    asm.add_preset(sgm, bank=0, prog=0, rename="Acoustic Grand Piano")

    # Electric Piano — from SGM (E.Piano 1, bank 0 prog 4)
    asm.add_preset(sgm, bank=0, prog=4, rename="Electric Piano 1")

    # Hammond Organ — from SGM (Organ 1, bank 0 prog 16)
    asm.add_preset(sgm, bank=0, prog=16, rename="Drawbar Organ")

    # Jazz Guitar — from FluidR3 (bank 0 prog 26)
    asm.add_preset(fluid, bank=0, prog=26, rename="Jazz Guitar")

    # Acoustic Bass — from FluidR3 (bank 0 prog 32)
    asm.add_preset(fluid, bank=0, prog=32, rename="Acoustic Bass")

    # ------------------------------------------------------------------ #
    #  DRUM KITS (bank 128)                                                #
    # ------------------------------------------------------------------ #

    # Standard / Jazz Kit — SGM: bank 128 prog 32 ("JAZZ")
    asm.add_preset(sgm, bank=128, prog=32, rename="Jazz Kit")

    # Brush Kit — SGM: bank 128 prog 40 ("BRUSH")
    asm.add_preset(sgm, bank=128, prog=40, rename="Brush Kit")

    # ------------------------------------------------------------------ #
    print("\nWriting output SF2 ...")
    asm.write(OUT)
    print("\nDone.  Load chops-jazz.sf2 in SpessaSynth to verify.")


if __name__ == "__main__":
    main()
