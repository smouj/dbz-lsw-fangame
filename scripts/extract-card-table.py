#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════
# extract-card-table.py — Tabla de cartas desde la ROM USA (fuente de verdad).
#
# ROM: dbz-lsw-usa.gbc (2 MiB, MBC5, 128 bancos)
# Tabla: Bank $11, RO11:$4320–$4AEF → 125 registros × 16 bytes
#   byte 0  → categoría (01 Command/Stage · 02 Damage · 03 Beam · 04 Support · 05 Defense)
#   byte 1  → Power
#   byte 2  → Accuracy
#   byte 3  → ID/referencia interna
#   byte 4  → CC Cost
#   byte 5  → selector de ejecución/efecto (taxonomía de técnicas)
#   byte 6  → (por confirmar: ¿targeting/alcance?)
#   bytes 7–14 → máscara de compatibilidad personaje/forma (48–64 bits)
#   byte 15 → (por confirmar: ¿fin de registro?)
#
# Salida: JSON con los 125 registros crudos + resumen de categorías/selectores.
# ═══════════════════════════════════════════════════════════════════════
import json, sys, os
from collections import Counter

ROM_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'dbz-lsw-decomp', '13_raw_rom', 'dbz-lsw-usa.gbc')
OUT_JSON = os.path.join(os.path.dirname(__file__), '..', '..', 'dbz-lsw-decomp', '12_data', 'cards', 'rom-card-table.json')

BANK = 0x11
TABLE_START = 0x4320   # RO11:$4320
RECORDS = 125
REC_SIZE = 16

CATEGORIES = {0x01: 'COMMAND_STAGE', 0x02: 'DAMAGE', 0x03: 'BEAM', 0x04: 'SUPPORT', 0x05: 'DEFENSE'}

def main():
    rom = open(ROM_PATH, 'rb').read()
    # MBC5: la ventana conmutable es 0x4000–0x7FFF (banco N → offset físico
    # N*0x4000). Una dirección RO11:$4320 (ventana) → físico 0x11*0x4000 + 0x320.
    bank_off = BANK * 0x4000
    base = bank_off + (TABLE_START - 0x4000)
    # sanity: verificar el primer byte del primer registro (categoría 0x01)
    print(f'Primer byte en físico 0x{base:05X}: 0x{rom[base]:02X}')
    print(f'Primeros 16 bytes: {rom[base:base+16].hex(" ")}')
    records = []
    for i in range(RECORDS):
        rec = rom[base + i * REC_SIZE : base + (i + 1) * REC_SIZE]
        assert len(rec) == REC_SIZE, f'record {i} truncado'
        records.append({
            'index': i + 1,                    # 1-based (carta 1 = Stage 3)
            'bytes': rec.hex(' '),
            'category': rec[0],
            'category_name': CATEGORIES.get(rec[0], f'UNKNOWN_{rec[0]:02X}'),
            'power': rec[1],
            'accuracy': rec[2],
            'internal_id': rec[3],
            'cc_cost': rec[4],
            'exec_selector': rec[5],
            'b6': rec[6],
            'compat_mask': rec[7:15].hex(),
            'b15': rec[15],
        })
        # sanity: el byte 15 de los últimos registros debe ser 00 (terminador)
        if i >= RECORDS - 3 and rec[15] != 0:
            print(f'  ⚠ record {i+1}: byte15={rec[15]:02X} (esperado 00 cerca del final)')

    # ── Checks del análisis ──
    print(f'ROM: {ROM_PATH}')
    print(f'Tabla: Bank ${BANK:02X} RO${TABLE_START:04X} → RO${TABLE_START + RECORDS*REC_SIZE - 1:04X}')
    print(f'Registros: {len(records)} × {REC_SIZE} bytes')
    print()
    print('Primeros 6 registros:')
    for r in records[:6]:
        print(f'  #{r["index"]:3} {r["category_name"]:13} pow={r["power"]:3} acc={r["accuracy"]:3} id={r["internal_id"]:3} cc={r["cc_cost"]:3} sel={r["exec_selector"]:3} mask={r["compat_mask"]}')
    print()
    print('Últimos 3 registros:')
    for r in records[-3:]:
        print(f'  #{r["index"]:3} {r["category_name"]:13} pow={r["power"]:3} acc={r["accuracy"]:3} id={r["internal_id"]:3} cc={r["cc_cost"]:3} sel={r["exec_selector"]:3} mask={r["compat_mask"]}')
    print()
    print('Categorías:', dict(Counter(r['category'] for r in records)))
    print('Selectores de ejecución:', dict(sorted(Counter(r['exec_selector'] for r in records).items())))

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, 'w') as f:
        json.dump({'rom': 'dbz-lsw-usa.gbc', 'sha256': '8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee',
                   'bank': BANK, 'start': f'RO{BANK:02X}:{TABLE_START:04X}', 'records': records}, f, indent=1)
    print(f'\n→ {OUT_JSON}')

if __name__ == '__main__':
    main()
