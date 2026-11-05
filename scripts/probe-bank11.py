#!/usr/bin/env python3
"""probe-bank11.py — explora RO11: tabla de offsets (personajes?) y texto legible.

Ambas ROMs comparten estructura; la Spain tiene nombres en español → el texto
legible confirma qué tabla es qué.
"""
import string

BASE = 'rom-research/13_raw_rom/'

def bank11(rom_name):
    rom = open(BASE + rom_name, 'rb').read()
    return rom[0x11 * 0x4000: 0x12 * 0x4000]  # banco 11 completo (0x4000 bytes)

def printable(bs):
    return ''.join(chr(b) if 32 <= b < 127 else '.' for b in bs)

for name in ['dbz-lsw-usa.gbc', 'dbz-lsw-spain.gbc']:
    b = bank11(name)
    print(f'═══ {name} ═══')
    # offsets 16-bit LE desde RO11:$4B00 (dentro del slice del banco: 0x4B00-0x4000)
    print('Offsets tabla RO11:$4B00 (16-bit LE):')
    offs = []
    for i in range(0, 0x60, 2):
        v = b[0x0B00 + i] | (b[0x0B01 + i] << 8)
        offs.append(v)
    print(' '.join(f'{v:04X}' for v in offs[:16]))
    print('  ...')
    print(' '.join(f'{v:04X}' for v in offs[-8:]))
    # ¿texto ASCII en el banco?
    print('Textos ASCII largos (>5 chars) en RO11:')
    run = []
    for addr in range(0x4000):
        ch = b[addr]
        if 32 <= ch < 127:
            run.append((addr, ch))
        else:
            if len(run) >= 6:
                start = run[0][0]
                txt = ''.join(chr(c) for _, c in run)
                print(f'  RO11:${start:04X}: {txt!r}')
            run = []
    print()
