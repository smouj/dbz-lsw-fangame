#!/usr/bin/env python3
"""probe-names.py — busca la tabla de nombres de las 49 formas.

La tabla de offsets RO11:$4B00 (49×2 bytes) apunta a nombres cortos
(offsets 0x62-0x16B). Los nombres deben estar al inicio del banco 11
(slice 0x60-0x180). En la Spain serán legibles (español/ASCII o charset).
"""
BASE = 'rom-research/13_raw_rom/'

def bank11(name):
    rom = open(BASE + name, 'rb').read()
    return rom[0x11 * 0x4000: 0x12 * 0x4000]

for name in ['dbz-lsw-usa.gbc', 'dbz-lsw-spain.gbc']:
    b = bank11(name)
    print(f'═══ {name} — slice 0x40-0x200 (inicio banco 11) ═══')
    for off in range(0x40, 0x200, 16):
        chunk = b[off:off + 16]
        asc = ''.join(chr(c) if 32 <= c < 127 else '.' for c in chunk)
        print(f'  {off:04X}: {chunk.hex(" ")}  {asc}')
    print()
