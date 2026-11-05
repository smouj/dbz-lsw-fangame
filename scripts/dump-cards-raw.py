#!/usr/bin/env python3
"""dump-cards-raw.py — vuelca registros crudos de la tabla de cartas.

Verifica el rango de bytes de la máscara de compatibilidad con cartas de
compatibilidad CONOCIDA (wiki incontestable): F.Kamehameha = solo Goku,
Tail = solo Gohan Kid, Misty KiWave = solo Krillin, Kaio Ken = solo Goku.
"""
BASE = 'rom-research/13_raw_rom/'
rom = open(BASE + 'dbz-lsw-usa.gbc', 'rb').read()
base = 0x44000 + 0x320  # RO11:$4320 físico

# cartas a inspeccionar: índice 0-based
targets = [
    (4, 'Cont.Punch (universal)'),
    (9, 'Masenko'),
    (11, 'Kamehameha'),
    (13, 'F.Kamehameha (solo Goku)'),
    (20, 'Misty KiWave (solo Krillin)'),
    (22, 'Kaio Ken (solo Goku)'),
    (28, 'Tail (solo Gohan Kid)'),
    (31, 'Final Flash (solo Vegeta)'),
    (42, 'Atomic Break (wiki: Vegito)'),
    (43, 'Flash.Sword (wiki: Trunks)'),
    (44, 'Flash.Sword id?'),
]
for idx, label in targets:
    if idx >= 125:
        continue
    rec = rom[base + idx * 16: base + (idx + 1) * 16]
    print(f'#{idx+1:3} {label:34} {rec.hex(" ")}')
