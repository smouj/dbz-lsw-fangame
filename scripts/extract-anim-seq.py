#!/usr/bin/env python3
"""extract-anim-seq.py — extrae secuencias de animación REALES de la ROM.

Formato de frame confirmado byte a byte (Kamehameha en banco $62, 0x04A7):
  [u8 metaspriteIndex, u8 durationTicks, s8 deltaY, s8 deltaX]

Estrategia por CONTENIDO (el patrón no miente):
  1. Escanear los bancos $62-$64 buscando runs de frames coherentes:
     count u8 razonable + count×4 bytes donde los ticks son 1-255.
  2. Cruzar contra los ticks TOTALES conocidos del análisis (ground truth):
     Kamehameha 75 · Masenko 74 · Galick-Ho 76 · Final Flash 78 ...
  3. Emitir JSON con todas las secuencias encontradas por banco.

Uso: python3 scripts/extract-anim-seq.py
"""
import json, os, sys

BASE = '/home/local-user/.openclaw/workspace/dbz-lsw-decomp/13_raw_rom/'
OUT = '/home/local-user/.openclaw/workspace/dbz-lsw-decomp/12_data/cards/rom-anim-sequences.json'

# Ground truth del análisis (ticks totales por secuencia de técnica conocida)
KNOWN = {
    'Kamehameha': [75, 75, 75, 75, 75, 75],       # 6 sec × 8 frames
    'Masenko': [74, 74],
    'Galick-Ho': [76, 76],
    'Final Flash': [78, 78],
    'Energy Wave': [15, 15],
    'Finger Beam': [13, 13],
    'Big Bang Attack': [75, 75],
    'Destructo Disk': [79, 79, 79, 79],
    'Special Beam Cannon': [78, 78],
    'Misty KiWave': [77],
    'Eraser Cannon': [195],
    'Hell Flash': [113],
    'Telekinesis': [176],
    'Crasher Ball': [172],
    'Body Change': [166],
    'Spirit Bomb': [85],
    'Suicide': [162],
    'Cont. Punch': [206, 49],
    'Cont. Kick': [134, 58],
    'Sonic Kick': [178, 55],
    'Dunk Shot': [122, 41],
    'Solid Shot': [191, 61],
    'Rising Kick': [135, 46],
    'Flash Punch': [185, 74],
    'Atomic Break': [258, 54],
    'Mach Attack': [168, 70],
    'Dynamic Punch': [233, 58],
    'Crazy Rush': [165, 48],
    '18 Attack': [307, 46],
    'Cell Combo': [190, 54],
    'Life Absorb': [387, 43],
    'Tail': [31, 225],
}

def s8(v):
    return v - 256 if v >= 128 else v

def try_frames(b, addr, max_count=100):
    """Intenta leer una secuencia en addr: count + count×4 frames. Devuelve
    (frames, total_ticks, end) o None si no es coherente.
    Filtros físicos: frames 1-100 (Life Absorb tiene 70), ticks 1-255/frame
    (holds largos existen), metas 0-16, offsets ±40."""
    if addr + 2 >= len(b):
        return None
    count = b[addr]
    if count == 0 or count > max_count:
        return None
    end = addr + 1 + count * 4
    if end > len(b):
        return None
    frames = []
    total = 0
    for i in range(count):
        base = addr + 1 + i * 4
        meta = b[base]
        ticks = b[base + 1]
        dy = s8(b[base + 2])
        dx = s8(b[base + 3])
        if ticks == 0:
            return None  # frame de 0 ticks no es una secuencia de animación
        if meta > 16:
            return None
        if abs(dy) > 40 or abs(dx) > 40:
            return None
        frames.append({'meta': meta, 'ticks': ticks, 'dy': dy, 'dx': dx})
        total += ticks
    return frames, total, end

def main():
    found = {}
    bank_total = {}
    for bnum in [0x62, 0x63, 0x64]:
        rom = open(BASE + 'dbz-lsw-usa.gbc', 'rb').read()
        b = rom[bnum * 0x4000:(bnum + 1) * 0x4000]
        bank_total[bnum] = 0
        # escanear todo el banco buscando secuencias coherentes
        addr = 0
        sequences = []
        while addr < len(b) - 8:
            r = try_frames(b, addr)
            if r:
                frames, total, end = r
                sequences.append({'addr': addr, 'count': len(frames), 'totalTicks': total, 'frames': frames})
                bank_total[bnum] += 1
                addr = end  # saltar a la siguiente secuencia
            else:
                addr += 1
        found[bnum] = sequences
        print(f'═══ Bank ${bnum:02X}: {len(sequences)} secuencias ═══')
        for s in sequences[:40]:
            metas = ','.join(str(f['meta']) for f in s['frames'][:6])
            print(f'  @0x{s["addr"]:04X} {s["count"]:2}f {s["totalTicks"]:4}t meta=[{metas}{"..." if len(s["frames"])>6 else ""}]')

    # ── Cruzar contra ground truth: casar BLOQUES completos de secuencias ──
    print('\n═══ Cruzando con ticks conocidos del análisis (bloques completos) ═══')
    all_seqs = []
    for bnum in [0x62, 0x63, 0x64]:
        for s in found[bnum]:
            all_seqs.append((bnum, s))
    # indexar por ticks totales para búsqueda rápida
    by_ticks = {}
    for bn, s in all_seqs:
        by_ticks.setdefault(s['totalTicks'], []).append((bn, s))
    matched = 0
    results = {}
    for name, ticks_list in KNOWN.items():
        # buscar un bloque de secuencias ADYACENTES (misma técnica) cuyos
        # ticks coincidan en orden con la lista conocida
        best = None
        for bn, s in all_seqs:
            # probar si una racha desde s coincide con ticks_list (con saltos ≤ 2 bytes)
            if s['totalTicks'] != ticks_list[0]:
                continue
            run = [(bn, s)]
            cur_addr = s['addr']
            ok = True
            for want in ticks_list[1:]:
                # siguiente secuencia del mismo banco después de cur_addr (tolerancia 4 bytes)
                nxt = None
                for bn2, s2 in all_seqs:
                    if bn2 == bn and s2['addr'] > cur_addr and s2['addr'] <= cur_addr + 40 and s2['totalTicks'] == want:
                        if nxt is None or s2['addr'] < nxt['addr']:
                            nxt = s2
                if nxt is None:
                    ok = False
                    break
                run.append((bn, nxt))
                cur_addr = nxt['addr']
            if ok:
                best = run
                break
        if best:
            bn, s0 = best[0]
            addrs = ','.join(f'0x{s[1]["addr"]:04X}' for s in best)
            print(f'  {name:18} ticks={ticks_list} → banco ${bn:02X} @{addrs}')
            results[name] = {'bank': bn, 'sequences': [{'addr': s[1]['addr'], 'frames': s[1]['frames'], 'totalTicks': s[1]['totalTicks']} for s in best]}
            matched += 1
        else:
            print(f'  {name:18} ticks={ticks_list} → SIN MATCH')
    print(f'\nMatch: {matched}/{len(KNOWN)}')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump({
            'banks': {str(k): v for k, v in found.items()},
            'confirmed': results,
            'total': sum(bank_total.values()),
        }, f, indent=1)
    print(f'\n→ {OUT} ({sum(bank_total.values())} secuencias totales, {len(results)} técnicas confirmadas)')

if __name__ == '__main__':
    main()
