#!/usr/bin/env python3
"""mgba-trace.py — Headless mGBA trace capture for DBZ LSW.

Uses libmgba C API via ctypes to run the GBC ROM headless and capture
memory state at each frame. No GUI required.

Usage:
    python3 scripts/mgba-trace.py --rom <path> --savestate <path> --output <path>

The script loads a savestate, advances frames, and captures:
  - $CA03 (action phase), $CA06 (action subtype), $CA53 (action result)
  - ActionObject visibility ($CA59 bit 7), resource ($C3C6/$C3C7)
  - SCX, SCY, LY, LCDC (IO registers)
  - $C405, $C406 (beam HBlank source)
"""
import ctypes
import ctypes.util
import json
import os
import sys
import struct
import argparse

# ─── Load libmgba ───
LIBNAME = ctypes.util.find_library('mgba')
if not LIBNAME:
    # Try known location
    LIBNAME = '/usr/lib/x86_64-linux-gnu/libmgba.so.0.10'

lib = ctypes.cdll.LoadLibrary(LIBNAME)

# ─── mGBA C API ───
# Core lifecycle
lib.mCoreCreate.restype = ctypes.c_void_p
lib.mCoreCreate.argtypes = []
lib.mCoreLoadFile.restype = ctypes.c_bool
lib.mCoreLoadFile.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
lib.mCoreReset.restype = ctypes.c_bool
lib.mCoreReset.argtypes = [ctypes.c_void_p]
lib.mCoreRunFrame.restype = None
lib.mCoreRunFrame.argtypes = [ctypes.c_void_p]
lib.mCoreDestroy.restype = None
lib.mCoreDestroy.argtypes = [ctypes.c_void_p]

# Memory access
lib.mCoreRead8.restype = ctypes.c_uint8
lib.mCoreRead8.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
lib.mCoreRead16.restype = ctypes.c_uint16
lib.mCoreRead16.argtypes = [ctypes.c_void_p, ctypes.c_uint32]

# Savestate
lib.mCoreLoadState.restype = ctypes.c_bool
lib.mCoreLoadState.argtypes = [ctypes.c_void_p, ctypes.c_char_p]

# ─── Constants ───
ADDR_CA03 = 0xCA03  # Action phase
ADDR_CA06 = 0xCA06  # Action subtype
ADDR_CA53 = 0xCA53  # Action result
ADDR_CA59 = 0xCA59  # ActionObject context
ADDR_C3C6 = 0xC3C6  # ActionObject+4 slot 0
ADDR_C3C7 = 0xC3C7  # ActionObject+4 slot 1
ADDR_C405 = 0xC405  # Beam HBlank source 1
ADDR_C406 = 0xC406  # Beam HBlank source 2
ADDR_SCX  = 0xFF43   # Scroll X
ADDR_SCY  = 0xFF42   # Scroll Y
ADDR_LY   = 0xFF44   # LCD Y coordinate
ADDR_LCDC = 0xFF40   # LCD Control

# Special handlers
SPECIALS = {
    0x08: "Generic_Special",
    0x0B: "Tail",
    0x0C: "Buu_Ball",
    0x0D: "Purple_Comet",
    0x0E: "Purple_Comet_Z",
    0x0F: "Big_Bang",
    0x12: "Destructo_Disk",
    0x16: "S_Beam_Cannon",
    0x22: "Spirit_Bomb",
}

BEAM_HANDLERS = {
    0x02: "Energy_Wave",
    0x03: "Kamehameha",
    0x04: "Masenko",
    0x05: "S_Kamehameha",
    0x06: "Energy_Bomb",
    0x07: "Galick_Ho",
}

def capture_trace(rom_path, savestate_path=None, output_path=None, max_frames=600):
    """Run ROM headless and capture memory state per frame."""
    core = lib.mCoreCreate()
    if not core:
        print("ERROR: mCoreCreate failed")
        return None

    try:
        # Load ROM
        rom_bytes = rom_path.encode('utf-8')
        if not lib.mCoreLoadFile(core, rom_bytes):
            print(f"ERROR: Failed to load ROM: {rom_path}")
            return None

        # Reset
        lib.mCoreReset(core)

        # Load savestate if provided
        if savestate_path:
            ss_bytes = savestate_path.encode('utf-8')
            if not lib.mCoreLoadState(core, ss_bytes):
                print(f"WARNING: Failed to load savestate: {savestate_path}")
                print("Continuing from ROM startup state...")

        entries = []
        prev_ca06 = 0
        action_active = False
        idle_frames = 0
        MAX_IDLE = 30

        print(f"Capturing up to {max_frames} frames...")
        for frame in range(max_frames):
            # Advance one frame
            lib.mCoreRunFrame(core)

            # Read memory
            ca03 = lib.mCoreRead8(core, ADDR_CA03)
            ca06 = lib.mCoreRead8(core, ADDR_CA06)
            ca53 = lib.mCoreRead8(core, ADDR_CA53)
            ao0_vis = lib.mCoreRead8(core, ADDR_CA59)
            slot0_res = lib.mCoreRead8(core, ADDR_C3C6)
            slot1_res = lib.mCoreRead8(core, ADDR_C3C7)
            scx = lib.mCoreRead8(core, ADDR_SCX)
            scy = lib.mCoreRead8(core, ADDR_SCY)
            ly = lib.mCoreRead8(core, ADDR_LY)
            lcdc = lib.mCoreRead8(core, ADDR_LCDC)
            c405 = lib.mCoreRead8(core, ADDR_C405)
            c406 = lib.mCoreRead8(core, ADDR_C406)

            # Detect action start
            if not action_active and ca03 != 0 and ca06 != prev_ca06:
                handler_name = SPECIALS.get(ca06, BEAM_HANDLERS.get(ca06, f"Unknown_${ca06:02X}"))
                handler_type = "special" if ca06 in SPECIALS else ("beam" if ca06 in BEAM_HANDLERS else "other")
                print(f"  Frame {frame}: Action detected! $CA06={ca06:#04x} ({handler_name}), type={handler_type}")
                action_active = True
                idle_frames = 0

            # Capture during action
            if action_active:
                entry = {
                    "frame": frame,
                    "ca03": ca03,
                    "ca06": ca06,
                    "ca53": ca53,
                    "ao0_vis": ao0_vis,
                    "slot0_res": slot0_res,
                    "slot1_res": slot1_res,
                    "scx": scx,
                    "scy": scy,
                    "ly": ly,
                    "lcdc": lcdc,
                    "c405": c405,
                    "c406": c406,
                }
                entries.append(entry)

                # Check for action end
                if ca03 == 0:
                    idle_frames += 1
                    if idle_frames >= MAX_IDLE:
                        print(f"  Frame {frame}: Action ended ({idle_frames} idle frames)")
                        action_active = False
                        break
                else:
                    idle_frames = 0

            prev_ca06 = ca06

        print(f"Captured {len(entries)} frames")

        # Save output
        if output_path and entries:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w') as f:
                json.dump(entries, f, indent=2)
            print(f"Saved to {output_path}")

        return entries

    finally:
        lib.mCoreDestroy(core)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='mGBA headless trace capture for DBZ LSW')
    parser.add_argument('--rom', required=True, help='Path to DBZ LSW ROM (.gbc)')
    parser.add_argument('--savestate', default=None, help='Path to savestate (.ss0)')
    parser.add_argument('--output', default='capture-output/trace.json', help='Output JSON path')
    parser.add_argument('--max-frames', type=int, default=600, help='Max frames to capture')
    args = parser.parse_args()

    result = capture_trace(args.rom, args.savestate, args.output, args.max_frames)
    if result is None:
        sys.exit(1)
    print(f"Done. {len(result)} entries captured.")