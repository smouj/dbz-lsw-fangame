#!/usr/bin/env python3
"""extract-anim-resources.py — extrae los AnimationResources de la ROM.

Estructura confirmada por análisis + verificación:
- Bancos $62/$63/$64: tabla global de recursos.
    u16 count
    u16 ?  u16 ?  u16 ?      (flags)
    count × (u16 offset, u16 size)   — offsets acumulativos desde el inicio de datos
- Cada recurso (AnimationResource):
    3 × u16 punteros relativos → [Sequence Section, Metasprite Section, Tile Mapping]
- Sequence Section:
    u8 sequenceCount
    u16 seqPtr[sequenceCount]   (relativos al inicio de la sección)
    cada Sequence:
        u8 frameCount
        Frame[frameCount]: { u8 metaspriteIndex, u8 durationTicks, s8 deltaY, s8 deltaX }
- Metasprite Section: por secuencia, u8 pieceCount + piezas {s8 dY, s8 dX, u8 tile, u8 attr}

Verificación contra el análisis: Kamehameha resource=$03 → 6 secuencias × 8 frames, 75 ticks.
"""
import json, os, sys

BASE = '/home/local-user/.openclaw/workspace/dbz-lsw-decomp/13_raw_rom/'
OUT = '/home/local-user/.openclaw/workspace/dbz-lsw-decomp/12_data/cards/rom-anim-resources.json'

def bank(n):
    rom = open(BASE + 'dbz-lsw-usa.gbc', 'rb').read()
    return rom[n * 0x4000:(n + 1) * 0x4000]

def u16(b, off):
    return b[off] | (b[off + 1] << 8)

def s8(b, off):
    v = b[off]
    return v - 256 if v >= 128 else v

def parse_resource(b, start, size, label):
    """Devuelve dict con sequences/metasprites/tilemap o None si el parse falla."""
    try:
        # 3 punteros relativos al inicio del recurso
        p_seq = u16(b, start + 0)
        p_meta = u16(b, start + 2)
        p_tile = u16(b, start + 4)
        if p_seq == 0 or p_seq >= size or p_meta >= size or p_tile >= size:
            return None
        # ── Sequence Section ──
        s = start + p_seq
        seq_count = b[s]
        seq_ptrs = [u16(b, s + 1 + i * 2) for i in range(seq_count)]
        sequences = []
        for sp in seq_ptrs:
            sp_abs = s + sp
            fc = b[sp_abs]
            frames = []
            for f in range(fc):
                base = sp_abs + 1 + f * 4
                frames.append({
                    'meta': b[base],
                    'ticks': b[base + 1],
                    'dy': s8(b, base + 2),
                    'dx': s8(b, base + 3),
                })
            sequences.append({'frames': frames, 'totalTicks': sum(f['ticks'] for f in frames)})
        # ── Metasprite Section (por secuencia) ──
        m = start + p_meta
        metasprites = []
        meta_off = m
        for si, seq in enumerate(sequences):
            if meta_off >= start + size:
                break
            pc = b[meta_off]
            pieces = []
            for pi in range(pc):
                base = meta_off + 1 + pi * 4
                pieces.append({
                    'dy': s8(b, base), 'dx': s8(b, base + 1),
                    'tile': b[base + 2], 'attr': b[base + 3],
                })
            metasprites.append({'pieces': pieces})
            meta_off += 1 + pc * 4
        # ── Tile Mapping Section ──
        t = start + p_tile
        tilemap = []
        # tabla paralela al metasprite: pares (u8, u8); longitud = total de piezas
        total_pieces = sum(len(ms['pieces']) for ms in metasprites)
        for pi in range(min(total_pieces, 32)):
            tilemap.append([b[t + pi * 2], b[t + pi * 2 + 1]])
        return {
            'label': label,
            'seqCount': seq_count,
            'sequences': sequences,
            'metasprites': metasprites,
            'tilemap': tilemap,
        }
    except Exception:
        return None

def main():
    all_resources = {}
    total = 0
    for bnum in [0x62, 0x63, 0x64]:
        b = bank(bnum)
        count = u16(b, 0)
        print(f'═══ Bank ${bnum:02X}: {count} recursos ═══')
        data_start = 8  # tras count(2) + flags(6)
        offset = 0
        sizes = []
        for i in range(count):
            off = data_start + i * 4
            o = u16(b, off)
            sz = u16(b, off + 2)
            sizes.append((o, sz))
            if i == 0:
                offset = o
        # offset base = primer offset
        base_off = sizes[0][0]
        for i, (o, sz) in enumerate(sizes):
            start = o  # absoluto dentro del banco
            label = f'B{bnum:02X}:{i:02d}'
            res = parse_resource(b, start, sz, label)
            if res:
                key = f'${bnum:02X}:{i:02X}'
                all_resources[key] = res
                total += 1
                seqs = ','.join(str(len(s['frames'])) for s in res['sequences'])
                ticks = ','.join(str(s['totalTicks']) for s in res['sequences'])
                print(f'  {key} [{sz:3}B] seq={res["seqCount"]} frames=[{seqs}] ticks=[{ticks}]')
            else:
                print(f'  {label} [{sz:3}B] PARSE FAIL')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump({'resources': all_resources, 'count': total}, f, indent=1)
    print(f'\n→ {OUT} ({total} recursos parseados)')

if __name__ == '__main__':
    main()
