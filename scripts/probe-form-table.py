#!/usr/bin/env python3
"""probe-form-table.py — compara RO11:$4B00-$5100 entre USA y Spain.

Si las dos ROMs comparten bytes → estructura (tabla de personajes/formas).
Si difieren → texto (nombres localizados).
"""
BASE = 'rom-research/13_raw_rom/'

def bank11(name):
    rom = open(BASE + name, 'rb').read()
    return rom[0x11 * 0x4000: 0x12 * 0x4000]

usa = bank11('dbz-lsw-usa.gbc')
spa = bank11('dbz-lsw-spain.gbc')

# 1) ¿La tabla de offsets es igual? (estructura → sí)
print('═══ Comparación tabla offsets RO11:$4B00 (primeras 24) ═══')
for i in range(0, 48, 2):
    u = usa[0x0B00 + i] | (usa[0x0B01 + i] << 8)
    s = spa[0x0B00 + i] | (spa[0x0B01 + i] << 8)
    mark = '==' if u == s else '≠≠'
    print(f'  [{i//2:2}] USA={u:04X} Spain={s:04X} {mark}')

# 2) ¿La zona $4B60+ (listas de IDs) es igual?
print('\n═══ Comparación RO11:$4B60-$4F00 (listas de IDs) ═══')
same = all(usa[0x0B60 + i] == spa[0x0B60 + i] for i in range(0x4F00 - 0x4B60))
print(f'  idénticas: {same}')
if not same:
    for i in range(0x4F00 - 0x4B60):
        if usa[0x0B60 + i] != spa[0x0B60 + i]:
            print(f'  primera dif en RO11:${0x4B60 + i:04X} (offset {i})')
            break

# 3) Resumen de las listas de IDs: ¿cuántas listas terminadas en 00 hay?
print('\n═══ Listas 0x00-terminadas en RO11:$4B60+ (USA) ═══')
addr = 0x4B60
count = 0
while addr < 0x5200:
    end = usa.index(0, addr, 0x6000) if 0 in usa[addr:0x6000] else None
    if end is None or end - addr > 32:
        break
    ids = list(usa[addr:end])
    print(f'  RO11:${addr:04X} ({end-addr:2} ids): [{",".join(f"{x:02X}" for x in ids)}]')
    addr = end + 1
    count += 1
    if count >= 40:
        break
print(f'  (primeras {count} listas)')
