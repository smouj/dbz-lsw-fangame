#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════
# fix-vegito-base-hair.py — Corrige el pelo de vegito_base (URGENTE)
#
# Problema: make-vegito-forms.py recoloreó el pelo amarillo SSJ → negro
# (40,40,40) SOLO en la zona y<45%. El pelo de Vegito es enorme y llega
# hasta y≈94% → quedaron ~2660 px amarillos de pelo sin recolorear
# (cabeza parcheada: negra arriba, amarilla abajo = "sobreada").
# Además, el negro (40,40,40) coincide con el color del OUTLINE → el
# pelo recoloreado se funde en un blob sin mechones.
#
# Fix (2 partes):
#   1. Recolorear TODO el pelo (no solo y<45%) a (152,152,152): un gris
#      CLARO distinto del outline (40,40,40) → los mechones mantienen
#      su separación y la cabeza se lee como pelo sin fundirse.
#      ⚠️ LECCIÓN 2026-08-15: 96 era DEMASIADO oscuro (masa negra sin
#      cara a escala de batalla, reportado por el usuario); 152 aún
#      se fundía con el outline en sprites de 27px. 208 elegido como
#      mejor equilibrio — se lee como pelo gris claro sin ser rubio
#      (verificado a escala real de batalla vs 176/192/208).
#   2. Mismo fix en el chibi overworld vegito_base_ow.png (17 px
#      amarillos sin recolorear) y en effects/vegito_base/*.png
#      (recortes de cabeza/chibi con pelo amarillo intacto).
#
# Detección del pelo: en el frame SSJ (fuente), el pelo es el componente
# 8-conectado de píxeles amarillos (r>=225, g>=225, 150<=b<=240) que
# contiene el píxel amarillo MÁS ALTO del sprite. Los componentes
# amarillos separados (energía ki, puños, beams) NO se tocan.
#
# Uso: python3 scripts/fix-vegito-base-hair.py [--apply]
# (sin --apply: dry-run, no toca nada)
# ═══════════════════════════════════════════════════════════════════
import os, sys, glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'public/assets/sprites')
OW = os.path.join(ROOT, 'public/assets/overworld/panel_sprites')

APPLY = '--apply' in sys.argv
NEW_HAIR = (208, 208, 208)


def is_hair(r, g, b):
    return r >= 225 and g >= 225 and b >= 150 and b <= 240


def hair_mask_from_ssj(ssj_img, base_img):
    """Devuelve set de (x,y) = TODO el pelo del frame base.

    Ancla: píxeles que el recolor anterior YA pintó de negro (en base son
    oscuros r<100 y en SSJ eran amarillo pelo) = pelo confirmado.
    Crecimiento: píxeles amarillos del SSJ 8-conectados al ancla a través
    de amarillo → pelo que quedó sin recolorear (y>=45%) aunque esté
    fragmentado por las líneas oscuras.
    Los componentes amarillos de energía (puños/beams) no tocan el ancla
    → quedan fuera.
    """
    w, h = ssj_img.size
    sp, bp = ssj_img.load(), base_img.load()
    anchor = set()
    yellows = set()
    for y in range(h):
        for x in range(w):
            if sp[x, y][3] <= 128:
                continue
            r, g, b, _ = sp[x, y]
            if not is_hair(r, g, b):
                continue
            br, bg, bb, ba = bp[x, y]
            if ba > 128 and br < 100 and bg < 100 and bb < 100:
                anchor.add((x, y))
            else:
                yellows.add((x, y))
    if not anchor:
        # Sin ancla (p.ej. chibi sin recolor previo): usar el componente
        # amarillo que toca el borde superior o es el más alto.
        seed = min(yellows, key=lambda p: (p[1], p[0])) if yellows else None
        if seed is None:
            return set()
        comp = set()
        stack = [seed]
        while stack:
            x, y = stack.pop()
            if (x, y) in comp:
                continue
            comp.add((x, y))
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    n = (x + dx, y + dy)
                    if n in yellows:
                        stack.append(n)
        return comp
    # BFS desde el ancla a través de (ancla ∪ amarillo) — 8-conectividad
    hair = set(anchor)
    stack = list(anchor)
    pool = yellows | anchor
    while stack:
        x, y = stack.pop()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                n = (x + dx, y + dy)
                if n in pool and n not in hair:
                    hair.add(n)
                    stack.append(n)
    return hair


def fix_frame(path, mask_source=None):
    """Recolorea el pelo a NEW_HAIR. Si mask_source se da (imagen SSJ),
    usa hair_mask_from_ssj. Si no, recolorea todo el amarillo (chibi/efectos)."""
    img = Image.open(path).convert('RGBA')
    if mask_source:
        ssj = Image.open(mask_source).convert('RGBA')
        mask = hair_mask_from_ssj(ssj, img)
    else:
        px = img.load()
        mask = {(x, y) for y in range(img.height) for x in range(img.width)
                if px[x, y][3] > 128 and is_hair(*px[x, y][:3])}
    if not mask:
        return img, 0
    px = img.load()
    n = 0
    for (x, y) in mask:
        if x < img.width and y < img.height:
            px[x, y] = NEW_HAIR + (255,)
            n += 1
    return img, n


def main():
    total = 0
    reports = []

    # 1) Frames de batalla: máscara = componente de pelo del SSJ homólogo
    for f in sorted(glob.glob(os.path.join(SPR, 'vegito_base', 'vegito_base_*.png'))):
        base_name = os.path.basename(f)
        ssj_name = base_name.replace('vegito_base_', 'vegito_ssj_')
        ssj_path = os.path.join(SPR, 'vegito_ssj', ssj_name)
        if not os.path.exists(ssj_path):
            reports.append(f'{base_name}: SIN homólogo SSJ, SKIP')
            continue
        img, n = fix_frame(f, ssj_path)
        total += n
        reports.append(f'{base_name}: {n} px')
        if APPLY:
            img.save(f)

    # 2) Chibi overworld: sin ancla fiable → recolor directo de todo el
    #    amarillo (es un chibi, no hay energía).
    ow_base = os.path.join(OW, 'vegito_base_ow.png')
    if os.path.exists(ow_base):
        img, n = fix_frame(ow_base)
        total += n
        reports.append(f'vegito_base_ow.png: {n} px')
        if APPLY:
            img.save(ow_base)

    # 3) Effects: recortes de cabeza/chibi → TODO el amarillo es pelo.
    #    (Los frames de energía/beam no tienen amarillo en HAIR_RANGE
    #    — solo blanco/azul — y se excluyen solos.)
    for f in sorted(glob.glob(os.path.join(SPR, 'effects', 'vegito_base', '*.png'))):
        img = Image.open(f).convert('RGBA')
        px = img.load()
        n = 0
        for y in range(img.height):
            for x in range(img.width):
                r, g, b, a = px[x, y]
                if a > 128 and is_hair(r, g, b):
                    px[x, y] = NEW_HAIR + (255,)
                    n += 1
        total += n
        reports.append(f'effects/{os.path.basename(f)}: {n} px')
        if APPLY:
            img.save(f)

    mode = 'APPLY' if APPLY else 'DRY-RUN'
    print(f'=== {mode} ===')
    for r in reports:
        print(' ', r)
    print(f'TOTAL: {total} px recoloreados a {NEW_HAIR}')
    if not APPLY:
        print('(sin --apply no se ha modificado nada)')


if __name__ == '__main__':
    main()
