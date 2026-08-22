#!/usr/bin/env python3
"""dump-after-cards.py — hexdump tras la tabla de cartas (buscando tabla de personajes)."""
rom = open('/home/local-user/.openclaw/workspace/dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc', 'rb').read()
# La tabla de cartas termina en RO11:$4AF0 (físico 0x44000+0xAF0). Miramos qué sigue.
base = 0x44000 + 0xAF0
print(f'físico 0x{base:05X}')
for off in range(0, 0x180, 16):
    chunk = rom[base + off:base + off + 16]
    addr = 0x4000 + 0xAF0 + off
    print(f'RO11:${addr:04X} (0x{base+off:05X}): {chunk.hex(" ")}')
