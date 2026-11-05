#!/usr/bin/env python3
"""parse-bank11.py — parsea el banco 11 completo en estructuras.

Regiones detectadas:
  0x0040-0x0B00  registros de 16 bytes (¿datos por forma / story?)
  0x0B00 ($4B00) tabla de offsets 49×2 bytes
  0x0B62 ($4B62) listas 0x00-terminadas de IDs
Imprime todo con interpretación.
"""
BASE = 'rom-research/13_raw_rom/'
rom = open(BASE + 'dbz-lsw-usa.gbc', 'rb').read()
b = rom[0x11 * 0x4000: 0x12 * 0x4000]

print('═══ 1. Registros 16B desde 0x40 (primeros 30) ═══')
for off in range(0x40, 0x40 + 30 * 16, 16):
    rec = b[off:off + 16]
    print(f'  0x{off:04X}: {rec.hex(" ")}')

print('\n═══ 2. Tabla offsets RO11:$4B00 (49 entradas) ═══')
offs = [b[0x0B00 + i] | (b[0x0B01 + i] << 8) for i in range(0, 98, 2)]
print('  ' + ' '.join(f'{v:04X}' for v in offs))

print('\n═══ 3. Listas 0x00-terminadas desde RO11:$4B62 ═══')
addr = 0x0B62
count = 0
while addr < 0x0B62 + 0x300:
    # leer hasta el siguiente 00
    end = addr
    while end < len(b) and b[end] != 0:
        end += 1
    ids = list(b[addr:end])
    print(f'  RO11:${addr + 0x4000:04X} ({len(ids):2} ids): [{",".join(f"{x:02X}" for x in ids)}]')
    addr = end + 1
    count += 1
    if count >= 60:
        break
print(f'  ... ({count} listas mostradas)')
