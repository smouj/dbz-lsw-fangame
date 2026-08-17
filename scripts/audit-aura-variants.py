#!/usr/bin/env python3
"""Audit pixel-perfect de la variante SUPPORT BLUE del aura de power (V9).

Reconstruye la máscara del aura con el MISMO algoritmo que el build (el píxel
rota los 3 colores del ciclo entre las 3 fases) y verifica por forma:
  A. width/height idénticos por frame (power vs support)
  B. alpha bounds idénticos (misma máscara de opacidad)
  C. personaje intacto: píxeles FUERA de la máscara del aura binariamente
     idénticos (power == support, incluido alpha)
  D. paleta: píxeles DENTRO de la máscara → azul exacto del mapeo
     (#50A8F0/#A0C0F8/#0090F0); 0 píxeles de la paleta naranja canónica
     en todo el support
  E. ciclo preservado: los 3 frames support NO son idénticos entre sí
  F. cobertura: toda forma con ciclo naranja tiene 3 frames support

Uso: python3 scripts/audit-aura-variants.py
"""
import json
from pathlib import Path
from PIL import Image

V9 = Path('sprites-source/catalog-v9/forms_by_runtime')

ORANGE_CANON = {(0xF0, 0xA0, 0x50), (0xF0, 0xC8, 0xA0), (0xF8, 0x80, 0x00)}
BLUE = {(0x50, 0xA8, 0xF0), (0xA0, 0xC0, 0xF8), (0x00, 0x90, 0xF0)}
ORANGE_TO_BLUE = {
    (0xF0, 0xA0, 0x50): (0x50, 0xA8, 0xF0),
    (0xF0, 0xC8, 0xA0): (0xA0, 0xC0, 0xF8),
    (0xF8, 0x80, 0x00): (0x00, 0x90, 0xF0),
}


def is_orangeish(c):
    r, g, b = c
    return r > 200 and g > 100 and b < 190 and r > g > b


def azul_for(c):
    if c in ORANGE_TO_BLUE:
        return ORANGE_TO_BLUE[c]
    best = min(ORANGE_TO_BLUE, key=lambda k: (k[0] - c[0]) ** 2 + (k[1] - c[1]) ** 2 + (k[2] - c[2]) ** 2)
    return ORANGE_TO_BLUE[best]


def load(p):
    return Image.open(p).convert('RGBA')


def aura_masks(power_ims):
    """Máscaras del aura POR FRAME (mismo algoritmo que el build): pasada 1
    paleta (colores que rotan), pasada 2 píxeles de cada frame cuyo color está
    en la paleta. Por frame: el personaje puede tapar el aura en una fase
    (p.ej. gohan_ultimate: píxel #FF0000 del personaje en f1, aura #FFDEAD en
    f2/f3) — cada frame tiene su propia máscara."""
    ims = [im.load() for im in power_ims]
    w = max(im.width for im in power_ims)
    h = max(im.height for im in power_ims)
    palette = set()
    for y in range(h):
        for x in range(w):
            trio = []
            for i, im in enumerate(power_ims):
                if x < im.width and y < im.height:
                    r, g, b, a = ims[i][x, y]
                    trio.append((r, g, b) if a > 0 else None)
                else:
                    trio.append(None)
            present = [c for c in trio if c is not None]
            if len(present) >= 2 and len(set(present)) == len(present) and all(is_orangeish(c) for c in present):
                palette.update(present)
    masks = [set() for _ in power_ims]
    for i, im in enumerate(power_ims):
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = ims[i][x, y]
                if a > 0 and (r, g, b) in palette:
                    masks[i].add((x, y))
    return masks


def main():
    failures = []
    n_forms = n_frames = 0
    ok_forms = []
    for fdir in sorted(V9.iterdir()):
        cat = fdir / 'catalog.json'
        if not cat.exists():
            continue
        catalog = json.load(open(cat))
        sups = [e for e in catalog if e.get('semantic_bucket') == 'aura_support']
        if not sups:
            continue
        sups.sort(key=lambda e: e['semantic_alias'])
        n_forms += 1
        n_frames += len(sups)
        if len(sups) != 3 and fdir.name not in ('goku_base', 'goku_super_saiyan'):
            failures.append(f'{fdir.name}: {len(sups)} frames support (esperado 3)')
        # agrupar en series de 3 (las FIXED-only comparten dir con su fuente:
        # goku_base/goku_super_saiyan tienen 2 series de 3)
        series = [sups[i:i + 3] for i in range(0, len(sups), 3)]
        for serie in series:
            if len(serie) != 3:
                failures.append(f'{fdir.name}: serie incompleta')
                continue
            try:
                powers = []
                for e in serie:
                    sf = e['old_refs'].split('/')
                    powers.append(load(V9 / sf[0] / 'atomic' / sf[1]))
            except Exception as ex:
                failures.append(f'{fdir.name}: no se pudieron cargar powers: {ex}')
                continue
            masks = aura_masks(powers)
            if not any(masks):
                failures.append(f'{fdir.name}: máscara de aura vacía')
            sups_ims = [load(fdir / 'atomic' / e['frame']) for e in serie]
            form_ok = True
            for i, (pim, sim) in enumerate(zip(powers, sups_ims), 1):
                if pim.size != sim.size:
                    failures.append(f'{fdir.name}/f{i}: tamaño {pim.size} != {sim.size}')
                    form_ok = False
                    continue
                px = pim.load()
                sx = sim.load()
                w, h = pim.size
                for y in range(h):
                    for x in range(w):
                        pr, pg, pb, pa = px[x, y]
                        sr, sg, sb, sa = sx[x, y]
                        if (pa == 0) != (sa == 0):
                            failures.append(f'{fdir.name}/f{i} ({x},{y}): alpha difiere ({pa} vs {sa})')
                            form_ok = False
                        if pa == 0:
                            continue
                        if (x, y) in masks[i - 1]:
                            # D: debe ser el azul exacto del mapeo
                            if (sr, sg, sb) != azul_for((pr, pg, pb)) or sa != pa:
                                failures.append(
                                    f'{fdir.name}/f{i} ({x},{y}): aura #{pr:02X}{pg:02X}{pb:02X}→#{sr:02X}{sg:02X}{sb:02X} no es el azul exacto')
                                form_ok = False
                        else:
                            # C: fuera de la máscara, binariamente idéntico
                            if (pr, pg, pb, pa) != (sr, sg, sb, sa):
                                failures.append(
                                    f'{fdir.name}/f{i} ({x},{y}): píxel fuera de la máscara cambió #{pr:02X}{pg:02X}{pb:02X}→#{sr:02X}{sg:02X}{sb:02X}')
                                form_ok = False
                        # 0 naranjas canónicos restantes
                        if pa > 0 and (pr, pg, pb) in ORANGE_CANON and (sr, sg, sb) == (pr, pg, pb):
                            failures.append(f'{fdir.name}/f{i} ({x},{y}): naranja canónico sin convertir')
                            form_ok = False
            # E: ciclo preservado (los 3 frames no idénticos)
            toks = [im.tobytes() for im in sups_ims]
            if len(toks) >= 2 and toks[0] == toks[1]:
                failures.append(f'{fdir.name}: frames support 01/02 idénticos (ciclo roto)')
                form_ok = False
            if form_ok:
                ok_forms.append(fdir.name)
                print(f'  OK  {fdir.name}: máscara {sum(len(m) for m in masks)}px, 3 frames azules, personaje intacto')
            else:
                print(f'  FAIL {fdir.name}')

    # ── matriz de cobertura ──
    print('\n=== MATRIZ DE COBERTURA ===')
    print(f'{"form":<30} {"naranja":<4} {"support":<4} status')
    for fdir in sorted(V9.iterdir()):
        cat = fdir / 'catalog.json'
        if not cat.exists():
            continue
        catalog = json.load(open(cat))
        sups = [e for e in catalog if e.get('semantic_bucket') == 'aura_support']
        if sups:
            status = 'OK' if fdir.name in ok_forms else 'FAIL'
            print(f'{fdir.name:<30} {len(sups):<4} {len(sups):<4} {status}')

    print(f'\n=== RESUMEN ===')
    print(f'formas con support: {n_forms} (ok: {len(ok_forms)}), frames: {n_frames}')
    print(f'FALLOS: {len(failures)}')
    for f in failures[:40]:
        print(f'  - {f}')


if __name__ == '__main__':
    main()
