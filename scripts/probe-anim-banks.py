#!/usr/bin/env python3
"""probe-anim-banks.py — explora los bancos de AnimationResource ($62-$64).

Busca la tabla de punteros que mapea resourceIndex → dirección del recurso
dentro de los bancos de animación. Según el análisis: byte+06 de la carta se
transforma en `$62 + bankOffset, resourceIndex`.
"""
BASE = 'rom-research/13_raw_rom/'
rom = open(BASE + 'dbz-lsw-usa.gbc', 'rb').read()

def bank(n):
    return rom[n * 0x4000:(n + 1) * 0x4000]

# 1) Primeros bytes de los bancos 0x62, 0x63, 0x64 (¿tabla de punteros?)
for bnum in [0x60, 0x61, 0x62, 0x63, 0x64, 0x65]:
    b = bank(bnum)
    print(f'═══ Bank ${bnum:02X} (0x{bnum*0x4000:05X}) ═══')
    for off in range(0, 0x60, 16):
        print(f'  ${off:04X}: {b[off:off+16].hex(" ")}')
    print()
