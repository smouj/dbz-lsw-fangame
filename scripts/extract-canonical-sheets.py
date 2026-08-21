#!/usr/bin/env python3
"""
DBZ LSW — Extractor de sheets canónicos (Sheets_Canonic_Characters_DBZ)

Toma los sheets GIF del escritorio (transparencia correcta, layout irregular
por filas de animación) y extrae cada frame:

  OUT/
    frames/<sheet>/NNN.png      → tight-cropped, RGBA, RGB=0 bajo alpha=0
    uniform/<sheet>/NNN.png     → canvas UNIFORME (--canvas, def 64x64),
                                  anclaje bottom-center para frames de
                                  personaje; SOLO si cabe (si no: overflow)
    preview/<sheet>.png         → contact sheet 2x para revisión visual
    manifest.json               → metadatos por frame (bbox, clase, offset)
    REPORT.md                   → resumen por sheet

Algoritmo: componentes conexos 4-conectados sobre la máscara alpha. Esto
separa CADA pieza individual del sheet (sprites, beams, orbes, letras) sin
fusionar piezas separadas por 1px de hueco — los runs con merge gap unían
filas de ataques (ej. vegito banda 6: collage de 478px con 121 piezas).

Clasificación heurística (best-effort, documentada en REPORT):
  - Tipo 1: monocromo inline (h<=14, w>=4, ncolors=1) = texto
  - Tipo 2: outline negro + 1-2 colores (h<=14, w<=28) = texto GBC
  - Tipo 2b: alto contraste sin outline (w<=12, h<=14) = texto GBC
  - Tipo 3: degradado GBC (h<=16, w<=16, ncolors>=6) = texto
  - Tipo 4: barras estrechas (w<=3, h 5-14, coverage>=0.9, nc<=2) = texto
  - Clases por tamaño/color: character / projectile / stripe_effect /
    large_effect / speedline / spark_particle / misc.
  - Clases por tamaño/color: character / projectile / stripe_effect /
    large_effect / speedline / spark_particle / misc.

Uso:
  python3 scripts/extract-canonical-sheets.py \
      "/mnt/c/Users/local-user/Desktop/Sheets_Canonic_Characters_DBZ" \
      [--out OUT] [--canvas 64]
"""
import argparse
import json
import os
import sys
from collections import Counter

import numpy as np
from PIL import Image
from scipy import ndimage

FUSE_RAY_MAX_DIST = 60   # px: (sin uso tras group_parallel_rays, se mantiene por compatibilidad)
STAR_FUSE_DIST = 4       # px: estrellas de poder a <=4px del sprite se fusionan con él
TEXT_MAX_H = 14        # componentes de esta altura o menos: candidatos a letra inline
TEXT_MIN_W = 4
TEXT_MAX_COVERAGE = 0.6  # cobertura <= 60% => disperso (letra), no sprite denso
MERGE_EFFECT_GAP = 6   # px máx. de hueco entre efectos (beams/orbes) para fusionarlos
MERGE_EFFECT_SHARED = 2  # colores compartidos mínimos (sin contar outline) para fusionar

# ── Detección de texto ASCII/GBC mejorada ─────────────────────────────────
#
# Los sheets de DBZ LSW contienen labels de texto incrustados (nombres de
# ataques, nombres de personaje, etc.) que NO deben extraerse como sprites.
# Análisis de los 45 sheets (2935 frames, 1487 skips originales) revela
# 4 tipos de texto GBC que la detección original no cubría:
#
# Tipo 1 — Letras monocromas inline (YA DETECTADO)
#   h<=14, w>=4, 1 solo color, coverage<=0.6
#   Ej: letras sueltas de "GOKU" (naranja monocromo)
#
# Tipo 2 — Letras con outline negro GBC (NUEVO, el bug principal)
#   outline casi-gris (canales<=50, dif<=12) + 1-2 colores de relleno,
#   tamaño típico 4-28w × 5-14h, coverage 0.45-0.85
#   Ej: letras "K","M","N" de 8x11 con outline + naranja
#   Antes se clasificaban como spark_particle (109 de 8x11, 57 de 9x11, etc.)
#
# Tipo 3 — Letras con degradado GBC (YA DETECTADO, ampliado)
#   >=6 colores, tamaño <=16x16
#   Ej: texto con gradiente naranja/amarillo
#
# Tipo 4 — Barras de texto estrechas (NUEVO)
#   w<=3, h>=5, h<=14, coverage>=0.9, ncolors<=2
#   Ej: "l", "1", "I" — letras verticales de 1-3px de ancho
#   Antes: 1x6 (50), 1x8 (43), 3x6 (75), 3x5 (45) como spark_particle
#
# DISCRIMINADOR vs spark_particle real:
#   - Partículas ki REALES: >=3 colores sin outline (paleta degradado de orbe)
#     Tamaño típico: 13-28w × 7-16h, aspecto cuadrado (0.6-2.0)
#   - Letras GBC: outline + 1-2 colores sin outline
#     Tamaño típico: 4-12w × 5-14h, coverage 0.45-0.80
TEXT_LABEL_MAX_W = 28   # labels tipo "VEGETA" pueden ser ~23px
TEXT_LABEL_OUTLINE_NONOUTLINE_MAX = 2  # letras: 1-2 colores sin outline

# Organización personaje/forma: sheet -> (personaje, forma). Los sheets ya
# vienen individualizados por forma (Buu y Gohan Kid incluidos).
ORG = {
    'burter_sheet': ('burter', None),
    'buu_fat_sheet': ('buu', 'fat'),
    'buu_kid_sheet': ('buu', 'kid'),
    'buu_super_base_sheet': ('buu', 'super_base'),
    'buu_super_gohan_sheet': ('buu', 'super_gohan'),
    'buu_super_gotenks_sheet': ('buu', 'super_gotenks'),
    'c16_sheet': ('c16', None),
    'c17_sheet': ('c17', None),
    'c18_sheet': ('c18', None),
    'c19_sheet': ('c19', None),
    'c20_sheet': ('c20', None),
    'cell_form_final_sheet': ('cell', 'final'),
    'cell_form_first_sheet': ('cell', 'first'),
    'cell_form_second_sheet': ('cell', 'second'),
    'cell_junior_sheet': ('cell', 'junior'),
    'frieza_sheet': ('frieza', None),
    'ginyu_body_goku_sheet': ('ginyu', 'body_goku'),
    'ginyu_sheet': ('ginyu', None),
    'gohan_adult_base_sheet': ('gohan_adult', 'base'),
    'gohan_adult_ssj_sheet': ('gohan_adult', 'ssj'),
    'gohan_kid_base_sheet': ('gohan_kid', 'base'),
    'gohan_kid_ssj2_sheet': ('gohan_kid', 'ssj2'),
    'gohan_kid_ssj_sheet': ('gohan_kid', 'ssj'),
    'gohan_oozaru_sheet': ('gohan_kid', 'oozaru'),
    'goku_base_sheet': ('goku', 'base'),
    'goku_ssj2_sheet': ('goku', 'ssj2'),
    'goku_ssj3_sheet': ('goku', 'ssj3'),
    'goku_ssj_sheet': ('goku', 'ssj'),
    'goten_base_sheet': ('goten', 'base'),
    'goten_ssj_sheet': ('goten', 'ssj'),
    'gotenks_ssj3_sheet': ('gotenks', 'ssj3'),
    'gotenks_ssj_sheet': ('gotenks', 'ssj'),
    'guldo_sheet': ('guldo', None),
    'jeice_sheet': ('jeice', None),
    'krillin_sheet': ('krillin', None),
    'nappa_sheet': ('nappa', None),
    'piccolo_sheet': ('piccolo', None),
    'recoome_sheet': ('recoome', None),
    'trunks_future_base_sheet': ('trunks_future', 'base'),
    'trunks_future_ssj_sheet': ('trunks_future', 'ssj'),
    'trunks_kid_base_sheet': ('trunks_kid', 'base'),
    'trunks_kid_ssj_sheet': ('trunks_kid', 'ssj'),
    'vegeta_base_sheet': ('vegeta', 'base'),
    'vegeto_ssj_sheet': ('vegeta', 'ssj'),   # ⚠️ el archivo se llama vegeto pero es VEGETA SSJ (armadura blanca/azul, 0 naranja)
    'vegito_sheet': ('vegito', None),
}

# Clases que van a la subcarpeta effects/ (SOLO residuos: restos de letras y
# fragmentos sueltos). Las rayitas (stripe_effect), beams, orbes, sparks y
# demás elementos del personaje van a la carpeta GENERAL — el usuario pidió
# que no se escondan en special/ (solo los restos de texto van ahí).
EFFECT_CLASSES = {'misc'}


def sheet_dirs(sheet):
    """Devuelve (dir_relativo, personaje, forma) para un sheet."""
    personaje, forma = ORG.get(sheet, (sheet.replace('_sheet', ''), None))
    return (f'{personaje}/{forma}' if forma else personaje), personaje, forma


def has_outline(arr, mask):
    """Contorno negro de personaje: color casi-gris muy oscuro
    (todas las sheets usan (40,40,40) o (41,41,41)). Los orbes/bolas de
    energía usan degradados de color sin tono gris oscuro."""
    for c in set(map(tuple, arr[mask][:, :3])):
        if max(c) <= 50 and (max(c) - min(c)) <= 12:
            return True
    return False


# ── Clasificación por tamaño tight ──────────────────────────────────────────
def classify(w, h, ncolors, has_outline):
    """has_outline = el sprite contiene el color de contorno (40,40,40).
    Todos los personajes reales de estas sheets llevan outline negro; los
    orbes/bolas de energía usan paletas degradado (sin outline)."""
    if w <= 1 and h >= 20:
        return 'speedline'
    if h <= 1 and w >= 20:
        return 'speedline'   # rayas horizontales de velocidad (39x1, 33x1...)
    if w <= 3 and h >= 12:
        return 'stripe_effect'   # rayita vertical agrupada (1-3px de grosor)
    if h <= 3 and w >= 12:
        return 'stripe_effect'   # rayita horizontal agrupada
    if w <= 28 and h <= 24:
        return 'spark_particle'
    if w >= 80 or h >= 80:
        return 'large_effect'
    if 20 <= w <= 80 and 28 <= h <= 64:
        if ncolors >= 3 and has_outline:
            return 'character'
        if ncolors >= 3:
            return 'projectile'   # orbe/bola de energía sin contorno
        return 'stripe_effect'    # rayas 2 colores (outline + 1 acento)
    if not has_outline and ncolors >= 2:
        return 'projectile'       # orbes fuera del rango de personaje
    return 'misc'


def load_rgba(path):
    im = Image.open(path).convert('RGBA')
    arr = np.array(im)
    arr[arr[..., 3] == 0] = 0          # canon: RGB=0 bajo alpha=0
    return im, arr


def palette_nonoutline(tight):
    """Colores del sprite excluyendo el outline negro casi-gris."""
    a = np.array(tight.convert('RGBA'))
    mask = a[..., 3] > 0
    cols = set()
    for c in set(map(tuple, a[mask][:, :3])):
        if not (max(c) <= 50 and (max(c) - min(c)) <= 12):
            cols.add(c)
    return cols


def merge_effect_pieces(frames):
    """Fusiona efectos (large_effect/projectile) que en el sheet son UNA pieza
    con huecos internos: beams lado a lado (gap_x 1-4, solape y >=50%) o
    cascada de partículas DEBAJO del beam (y0 dentro del rango del beam,
    se extiende hacia abajo, solape x >=50%, paleta compartida).
    Los personajes (character) nunca se fusionan."""
    changed = True
    while changed:
        changed = False
        for i in range(len(frames)):
            if changed:
                break
            for j in range(i + 1, len(frames)):
                ma, ta = frames[i]
                mb, tb = frames[j]
                if ma['class'] not in ('large_effect', 'projectile') or mb['class'] not in ('large_effect', 'projectile'):
                    continue
                # caso A: lado a lado (mismo rango y, hueco en x)
                ov_y = min(ma['y'] + ma['h'], mb['y'] + mb['h']) - max(ma['y'], mb['y'])
                gap_x = max(ma['x'] - (mb['x'] + mb['w']), mb['x'] - (ma['x'] + ma['w']))
                # caso B: cascada debajo (y0 de una pieza dentro del rango de la
                # otra, solape x >=50%, se extiende hacia abajo)
                ov_x = min(ma['x'] + ma['w'], mb['x'] + mb['w']) - max(ma['x'], mb['x'])
                a_over_b = ma['y'] < mb['y'] and mb['y'] < ma['y'] + ma['h'] and mb['y'] + mb['h'] > ma['y'] + ma['h']
                b_over_a = mb['y'] < ma['y'] and ma['y'] < mb['y'] + mb['h'] and ma['y'] + ma['h'] > mb['y'] + mb['h']
                ok_a = ov_y >= 0.5 * min(ma['h'], mb['h']) and 1 <= gap_x <= MERGE_EFFECT_GAP
                ok_b = ov_x >= 0.5 * min(ma['w'], mb['w']) and (a_over_b or b_over_a)
                if not (ok_a or ok_b):
                    continue
                shared = len(palette_nonoutline(ta) & palette_nonoutline(tb))
                if shared < MERGE_EFFECT_SHARED:
                    continue
                # fusionar: bbox unión + composición
                x0, y0 = min(ma['x'], mb['x']), min(ma['y'], mb['y'])
                x1, y1 = max(ma['x'] + ma['w'], mb['x'] + mb['w']), max(ma['y'] + ma['h'], mb['y'] + mb['h'])
                canvas = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
                canvas.paste(ta, (ma['x'] - x0, ma['y'] - y0), ta)
                canvas.paste(tb, (mb['x'] - x0, mb['y'] - y0), tb)
                bb = canvas.getbbox()
                if bb is None:
                    continue
                tx0, ty0, tx1, ty1 = bb
                merged = canvas.crop(bb)
                meta = {'x': x0 + tx0, 'y': y0 + ty0, 'w': merged.size[0], 'h': merged.size[1]}
                tarr = np.array(merged.convert('RGBA'))
                tmask = tarr[..., 3] > 0
                npx = int(tmask.sum())
                ncolors = len(set(map(tuple, tarr[tmask][:, :3]))) if npx else 0
                meta['class'] = classify(*merged.size, ncolors, has_outline(tarr, tmask))
                frames.pop(max(i, j))
                frames.pop(min(i, j))
                frames.append((meta, merged))
                changed = True
                break
    return frames


def is_star_shape(comps, c, sa, sm):
    """Detecta si un componente es una estrella de poder: componente compacto
    de 10-22px (LAS ESTRELLAS REALES son 12x14/12x15; los sparks de 8x7 NO),
    forma de estrella de 4 puntas (>=3 filas con ancho < 60% del máximo),
    con outline oscuro + color del personaje (el color varía por personaje:
    verde Guldo, verde C16, gris, amarillo...)."""
    w = c['x1'] - c['x0'] + 1
    h = c['y1'] - c['y0'] + 1
    if not (10 <= w <= 22 and 10 <= h <= 22 and 80 <= c['area'] <= 220):
        return False
    cols = set(map(tuple, sa[c['py'], c['px']][:, :3]))
    if not (2 <= len(cols) <= 5):
        return False
    # debe tener outline oscuro (negro/gris) + color de relleno
    has_dark = any(max(r, g, b) <= 90 for r, g, b in cols)
    has_fill = any(max(r, g, b) > 120 for r, g, b in cols)
    if not (has_dark and has_fill):
        return False
    # EXCLUIR letras: las letras de títulos tienen negro PURO (#000000) + un
    # brillante y forma plana; las estrellas reales tienen outline #282828 o
    # #292929 como color oscuro (no negro puro)
    has_black_puro = any(max(r, g, b) <= 10 for r, g, b in cols)
    if has_black_puro:
        return False
    sub = sm[c['y0']:c['y1'] + 1, c['x0']:c['x1'] + 1]
    roww = sub.sum(axis=1)
    maxw = roww.max()
    if maxw < 3:
        return False
    return int((roww < maxw * 0.6).sum()) >= 3


def fuse_stars_to_sprites(comps, arr, mask):
    """Fusiona las estrellas de poder con su sprite: la estrella flota ENCIMA
    de la cabeza del personaje con un hueco vertical (30-120px), alineada en x
    (solape >=2px). Es parte del frame del personaje. El color varía por
    personaje (verde Guldo, gris, amarillo...)."""
    # sprites destino: personajes (area >= 300, ancho <= 60 — excluye beams
    # de 100+px y orbes; las estrellas flotan sobre PERSONAJES). Altura >= 28
    # para excluir caras de reacción (24x16) y fragmentos — el canon del juego
    # tiene las estrellas de reacción como base_effect_01 SEPARADO (burter).
    sprites = [c for c in comps if c['area'] >= 300 and (c['x1'] - c['x0'] + 1) <= 60
               and (c['y1'] - c['y0'] + 1) >= 28]
    fused = 0
    for c in comps:
        if c['merged'] or c['area'] >= 300:
            continue
        if not is_star_shape(comps, c, arr, mask):
            continue
        best, bd = None, 1e9
        for s in sprites:
            # la estrella debe estar ARRIBA con hueco vertical (flota sobre la
            # cabeza: gap 20-130px, NO pegada, NO al lado)
            gap_y = s['y0'] - c['y1']
            if not (20 <= gap_y <= 130):
                continue
            # el solape en x es flexible: las 2 estrellas de un power-up flotan
            # sobre el mismo sprite y pueden quedar ligeramente desplazadas
            ov_x = min(c['x1'], s['x1']) - max(c['x0'], s['x0'])
            if ov_x < -8:
                continue
            # distancia real entre píxeles: la estrella flota sobre la cabeza,
            # la distancia al sprite destino es la menor del conjunto
            d = np.sqrt((c['px'][:, None] - s['px'][None, :])**2 +
                        (c['py'][:, None] - s['py'][None, :])**2).min()
            if d < bd:
                bd, best = d, s
        if best is not None and bd <= 300:
            # fusionar: la estrella pasa a formar parte del frame del sprite,
            # CENTRADA horizontalmente sobre la cabeza del personaje (en el
            # sheet las 2 estrellas pueden estar desplazadas a un lado)
            star_cx = (c['x0'] + c['x1']) / 2
            sprite_cx = (best['x0'] + best['x1']) / 2
            dx = int(round(sprite_cx - star_cx))
            best['px'] = np.concatenate([best['px'], c['px'] + dx])
            best['py'] = np.concatenate([best['py'], c['py']])
            best['x0'] = min(best['x0'], (c['px'] + dx).min())
            best['x1'] = max(best['x1'], (c['px'] + dx).max())
            best['y0'] = min(best['y0'], c['y0']); best['y1'] = max(best['y1'], c['y1'])
            best['w'] = best['x1'] - best['x0'] + 1
            best['h'] = best['y1'] - best['y0'] + 1
            best['area'] += c['area']
            best['has_star'] = True
            c['merged'] = True
            fused += 1
    return [c for c in comps if not c['merged']], fused


def fuse_limbs_to_sprites(comps, arr, mask):
    """Fusiona EXTREMIDADES separadas a su sprite: en la patada voladora, la
    pierna extendida queda a 1-2px del cuerpo (hueco) y el CC 8-conectado la
    separa en componente propio. La pierna es un componente alargado
    (w>=10 o h>=10, otro eje <=10), area 15-250, pegado al bbox de un sprite
    grande (distancia <=3px), con solape real de píxeles en el borde.
    Se fusiona al sprite character más cercano."""
    sprites = [c for c in comps if c['area'] >= 300]
    fused = 0
    for c in comps:
        if c['merged'] or c['area'] >= 300:
            continue
        # extremidad: alargada en un eje
        along = max(c['w'], c['h']) >= 10 and min(c['w'], c['h']) <= 10
        if not along or not (15 <= c['area'] <= 250):
            continue
        # cerca de un sprite grande (distancia de bbox <=3px en ambos ejes)
        best, bd = None, 1e9
        for s in sprites:
            dx = max(s['x0'] - c['x1'], c['x0'] - s['x1'], 0)
            dy = max(s['y0'] - c['y1'], c['y0'] - s['y1'], 0)
            if dx > 3 or dy > 3:
                continue
            # distancia real entre píxeles
            d = np.sqrt((c['px'][:, None] - s['px'][None, :])**2 +
                        (c['py'][:, None] - s['py'][None, :])**2).min()
            if d < bd:
                bd, best = d, s
        if best is not None and bd <= 4:
            # es una extremidad pegada al cuerpo (<=4px): fusionar
            best['px'] = np.concatenate([best['px'], c['px']])
            best['py'] = np.concatenate([best['py'], c['py']])
            best['x0'] = min(best['x0'], c['x0']); best['x1'] = max(best['x1'], c['x1'])
            best['y0'] = min(best['y0'], c['y0']); best['y1'] = max(best['y1'], c['y1'])
            best['w'] = best['x1'] - best['x0'] + 1
            best['h'] = best['y1'] - best['y0'] + 1
            best['area'] += c['area']
            c['merged'] = True
            fused += 1
    return [c for c in comps if not c['merged']], fused


def group_parallel_rays(comps):
    """Agrupa rayitas de velocidad PARALELAS adyacentes en UN frame de efecto.
    En el sheet, el frame de evasión del GBC son las rayitas SOLAS (el canon
    del juego las tiene como goku_base_evade_00 = 23x41 verticales y
    evade_01 = 40x31 horizontales) — NO fusionadas con el personaje.
    Criterio: misma orientación (vertical w<=3 / horizontal h<=3), gap <=3px,
    y rango solapado (misma zona x para verticales, misma zona y para
    horizontales). El personaje NUNCA se fusiona con las rayitas."""
    vert = [c for c in comps
            if c['w'] <= 3 and c['h'] >= 12 and max(c['w'], c['h']) / max(1, min(c['w'], c['h'])) >= 6]
    horz = [c for c in comps
            if c['h'] <= 3 and c['w'] >= 12 and max(c['w'], c['h']) / max(1, min(c['w'], c['h'])) >= 6]

    def merge_group(group):
        """Fusiona un grupo de rayitas en un solo componente."""
        if len(group) <= 1:
            return
        base = group[0]
        base['ray_group'] = True   # marcado: es un sprite de rallitas (stripe)
        for r in group[1:]:
            if r['merged']:
                continue
            base['px'] = np.concatenate([base['px'], r['px']])
            base['py'] = np.concatenate([base['py'], r['py']])
            base['x0'] = min(base['x0'], r['x0']); base['x1'] = max(base['x1'], r['x1'])
            base['y0'] = min(base['y0'], r['y0']); base['y1'] = max(base['y1'], r['y1'])
            base['w'] = base['x1'] - base['x0'] + 1
            base['h'] = base['y1'] - base['y0'] + 1
            base['area'] += r['area']
            r['merged'] = True

    # verticales: agrupar por proximidad en x Y solape en y (misma fila de evasión)
    vert.sort(key=lambda c: (c['x0'], c['y0']))
    cur = []
    prev_x1 = None
    prev_y = None
    for c in vert:
        same_row = prev_y is None or (
            c['y0'] <= prev_y[1] and c['y1'] >= prev_y[0]  # solape en y
        )
        if prev_x1 is None or (c['x0'] - prev_x1 <= 3 and same_row):
            cur.append(c)
        else:
            merge_group(cur)
            cur = [c]
        prev_x1 = max(prev_x1 or 0, c['x1'])
        prev_y = (min(prev_y[0], c['y0']) if prev_y else c['y0'],
                  max(prev_y[1], c['y1']) if prev_y else c['y1'])
    merge_group(cur)

    # horizontales: agrupar por proximidad en y Y solape en x (misma columna)
    horz.sort(key=lambda c: (c['y0'], c['x0']))
    cur = []
    prev_y1 = None
    prev_x = None
    for c in horz:
        same_col = prev_x is None or (
            c['x0'] <= prev_x[1] and c['x1'] >= prev_x[0]  # solape en x
        )
        if prev_y1 is None or (c['y0'] - prev_y1 <= 3 and same_col):
            cur.append(c)
        else:
            merge_group(cur)
            cur = [c]
        prev_y1 = max(prev_y1 or 0, c['y1'])
        prev_x = (min(prev_x[0], c['x0']) if prev_x else c['x0'],
                  max(prev_x[1], c['x1']) if prev_x else c['x1'])
    merge_group(cur)

    return [c for c in comps if not c['merged']]


def extract_sheet(path, canvas):
    im, arr = load_rgba(path)
    mask = arr[..., 3] > 0
    h, w = mask.shape
    frames, skipped = [], []

    # componentes conexos 8-conectados: separa piezas con hueco >=1px
    # (filas de ataques que el merge-gap fusionaba) pero mantiene unidas
    # las rayas/efectos con contacto diagonal (sprites con rayas internas)
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    comps = []
    for ci in range(1, n + 1):
        ys, xs = np.where(lab == ci)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
        comps.append({
            'id': ci, 'merged': False,
            'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1,
            'w': x1 - x0 + 1, 'h': y1 - y0 + 1,
            'area': int(len(xs)),
            'px': xs.astype(np.int32), 'py': ys.astype(np.int32),
        })

    # rayitas de velocidad → agrupar paralelas (evade_00/evade_01 del canon)
    comps = group_parallel_rays(comps)
    # estrellas de poder → fusionar con su sprite (parte del frame)
    comps, _ = fuse_stars_to_sprites(comps, arr, mask)
    # extremidades de patadas voladoras (pierna a 1-2px del cuerpo) → fusionar
    comps, _ = fuse_limbs_to_sprites(comps, arr, mask)

    for c in comps:
        x0, y0, x1, y1 = c['x0'], c['y0'], c['x1'], c['y1']
        # máscara SOLO de este componente (incluye rayitas fusionadas) dentro
        # de su bbox: los píxeles de otros componentes que caigan dentro del
        # bbox (partículas sueltas en huecos del sprite) se excluyen del crop
        cmask = np.zeros((y1 - y0 + 1, x1 - x0 + 1), dtype=bool)
        inb = (c['py'] >= y0) & (c['py'] <= y1) & (c['px'] >= x0) & (c['px'] <= x1)
        cmask[c['py'][inb] - y0, c['px'][inb] - x0] = True
        rows = cmask.any(axis=1)
        cols = cmask.any(axis=0)
        if not rows.any():
            continue
        ty0, ty1 = int(np.argmax(rows)), int(len(rows) - 1 - np.argmax(rows[::-1]))
        tx0, tx1 = int(np.argmax(cols)), int(len(cols) - 1 - np.argmax(cols[::-1]))
        sub = cmask[ty0:ty1 + 1, tx0:tx1 + 1]
        block = arr[y0 + ty0:y0 + ty1 + 1, x0 + tx0:x0 + tx1 + 1].copy()
        block[~sub] = 0            # RGB=0 bajo alpha=0 (canon)
        # ── frames con estrella de power-up fusionada: el hueco de 87px entre
        # la estrella (arriba) y el sprite (abajo) se COMPRIME para que el
        # frame quepa en el canvas 64x64 con la estrella justo encima de la
        # cabeza (anclaje bottom-center preservado).
        if c.get('has_star'):
            rows_occ = sub.any(axis=1)
            # primera y última fila ocupada
            r0 = int(np.argmax(rows_occ))
            r1 = int(len(rows_occ) - 1 - np.argmax(rows_occ[::-1]))
            # filas vacías INTERNAS (hueco estrella→sprite) → eliminar
            vacias = np.where(~rows_occ)[0]
            vacias = vacias[(vacias > r0) & (vacias < r1)]
            if len(vacias) > 0:
                keep = np.ones(block.shape[0], dtype=bool)
                keep[vacias] = False
                block = block[keep]
                sub = sub[keep]
        tight = Image.fromarray(block, 'RGBA')
        tw, th = tight.size
        area = tw * th
        if area < 6:
            continue  # ruido de 1-2px
        # ── Detección de texto ASCII/labels GBC ──────────────────────────
        # Los sheets contienen texto incrustado (nombres, labels de ataques)
        # que no debe extraerse como sprites. 4 tipos:
        #
        # Tipo 1: Letras monocromas inline
        #   h<=14, w>=4, 1 solo color, coverage<=0.6
        #   Ej: letras sueltas de "GOKU" (naranja monocromo)
        #
        # Tipo 2: Letras con outline negro (GBC con sombra)
        #   h<=14, w<=28, outline casi-gris (canales<=50, dif<=12),
        #   1-2 colores SIN outline. Coverage típicamente 0.45-0.80
        #   Ej: "K","M","N" de 8x11 con outline negro + naranja
        #   ANTES clasificados como spark_particle — el bug principal
        #
        # Tipo 3: Letras con degradado GBC
        #   h<=16, w<=16, >=6 colores (paleta renderizada)
        #   Ej: texto con gradiente naranja/amarillo
        #
        # Tipo 4: Barras de texto estrechas
        #   w<=3, h>=5, h<=14, coverage>=0.9, ncolors<=2
        #   Ej: "l", "1", "I" — letras verticales de 1-3px
        #
        # Discriminador vs spark_particle real:
        #   Partículas ki reales: >=3 colores sin outline (paleta degradado)
        #   Letras GBC: outline + 1-2 colores sin outline
        tarr = np.array(tight.convert('RGBA'))
        tmask = tarr[..., 3] > 0
        npx = int(tmask.sum())
        ncolors = len(set(map(tuple, tarr[tmask][:, :3]))) if npx else 0
        coverage = npx / area
        has_out = has_outline(tarr, tmask)
        non_outline_colors = len(palette_nonoutline(tight)) if has_out else ncolors

        # Tipo 1: monocromo inline (1 color, pequeño)
        #   Si es monocromo y pequeño (h<=14, w>=4), es texto GBC.
        #   Las partículas de ki reales SIEMPRE tienen múltiples colores
        #   (degradado), nunca son monocromas.
        if th <= TEXT_MAX_H and tw >= TEXT_MIN_W and ncolors == 1:
            skipped.append({'x': x0 + tx0, 'y': y0 + ty0, 'w': tw, 'h': th, 'reason': 'text_label_inline'})
            continue
        # Tipo 3: degradado GBC (>=6 colores, pequeño) — letras con sombreado
        if th <= 16 and tw <= 16 and ncolors >= 6 and tw >= 3 and th >= 3:
            skipped.append({'x': x0 + tx0, 'y': y0 + ty0, 'w': tw, 'h': th, 'reason': 'text_label_shaded'})
            continue
        # Tipo 5: letras 2 colores con negro PURO + brillante (títulos grandes
        #   estilo "POWER"), sin outline #282828: 2 colores exactos, uno negro
        #   puro (<=10), otro brillante (>=150), forma plana ancha (w>=10, h<=16)
        if (ncolors == 2 and tw >= 10 and tw <= 20 and th <= 16
                and (0x28, 0x28, 0x28) not in set(map(tuple, tarr[tmask][:, :3]))):
            color_list = list(set(map(tuple, tarr[tmask][:, :3])))
            has_black_puro = any(max(c) <= 10 for c in color_list)
            has_bright = any(max(c) >= 150 for c in color_list)
            if has_black_puro and has_bright:
                skipped.append({'x': x0 + tx0, 'y': y0 + ty0, 'w': tw, 'h': th, 'reason': 'text_label_2color'})
                continue
        # Tipo 5b: letras 2 colores con outline OSCURO (#28..#40) + brillante
        #   (títulos pequeños "N","E" de 12x10-13x14 que el Tipo 5 no ve porque
        #   su color oscuro es #282828, no negro puro)
        if (ncolors == 2 and 10 <= tw <= 16 and 8 <= th <= 16
                and (0x28, 0x28, 0x28) in set(map(tuple, tarr[tmask][:, :3]))):
            color_list = list(set(map(tuple, tarr[tmask][:, :3])))
            other = [c for c in color_list if c != (0x28, 0x28, 0x28)]
            if other and max(other[0]) >= 150:
                skipped.append({'x': x0 + tx0, 'y': y0 + ty0, 'w': tw, 'h': th, 'reason': 'text_label_2color_out'})
                continue
        cls = classify(tw, th, ncolors, has_outline(tarr, tmask))
        if c.get('ray_group') and tw >= 12 and th >= 12:
            cls = 'stripe_effect'   # grupo de rallitas: SIEMPRE stripe, nunca character
        if c.get('has_star'):
            cls = 'character'   # personaje con estrellas de power-up fusionadas
        frame = {
            'x': x0 + tx0, 'y': y0 + ty0,
            'w': tw, 'h': th,
            'class': cls,
        }
        frames.append((frame, tight))
    frames = merge_effect_pieces(frames)
    frames.sort(key=lambda f: (f[0]['y'], f[0]['x']))
    out = []
    for i, (meta, tight) in enumerate(frames, 1):
        meta['index'] = i
        meta['file'] = f'{i:03d}.png'
        meta['uniform'] = None
        if meta['class'] == 'character' and meta['w'] <= canvas and meta['h'] <= canvas:
            ox = (canvas - meta['w']) // 2
            oy = canvas - meta['h']          # bottom-center
            meta['uniform'] = {'canvas': canvas, 'ox': ox, 'oy': oy}
        out.append((meta, tight))
    return out, skipped


# Mapeo de recolor aura naranja → azul (derivado del canon del juego comparando
# TODOS los pares aura_power/aura_support del proyecto). SOLO se recolorean los
# tonos del AURA; los colores del PERSONAJE (#F07000, #F89800, #F880A0, verdes...)
# NO se tocan — el usuario reportó que Cell (con naranja en el cuerpo) se
# recoloreaba entero.
AURA_ORANGE_TO_BLUE = {
    # azul oscuro #0090F0
    (0xF8, 0x80, 0x00): (0x00, 0x90, 0xF0),
    (0xF8, 0x80, 0x08): (0x00, 0x90, 0xF0),
    (0xF8, 0x80, 0x10): (0x00, 0x90, 0xF0),
    (0xF8, 0x80, 0x18): (0x00, 0x90, 0xF0),
    (0xF8, 0x80, 0x20): (0x00, 0x90, 0xF0),
    (0xF8, 0x80, 0x28): (0x00, 0x90, 0xF0),
    (0xFF, 0x84, 0x00): (0x00, 0x90, 0xF0),
    (0xFF, 0x84, 0x18): (0x00, 0x90, 0xF0),
    (0xFF, 0x84, 0x29): (0x00, 0x90, 0xF0),
    # azul medio #50A8F0
    (0xF0, 0xA0, 0x50): (0x50, 0xA8, 0xF0),
    (0xF0, 0xA0, 0x60): (0x50, 0xA8, 0xF0),
    (0xF7, 0xA5, 0x52): (0x50, 0xA8, 0xF0),
    (0xF7, 0xA5, 0x63): (0x50, 0xA8, 0xF0),
    (0xF8, 0x80, 0x30): (0x50, 0xA8, 0xF0),
    (0xF8, 0x80, 0x38): (0x50, 0xA8, 0xF0),
    (0xF8, 0x80, 0x40): (0x50, 0xA8, 0xF0),
    (0xF8, 0x80, 0x48): (0x50, 0xA8, 0xF0),
    (0xF8, 0x80, 0x50): (0x50, 0xA8, 0xF0),
    (0xF8, 0x80, 0x60): (0x50, 0xA8, 0xF0),
    (0xFF, 0x84, 0x31): (0x50, 0xA8, 0xF0),
    (0xFF, 0x84, 0x39): (0x50, 0xA8, 0xF0),
    (0xFF, 0x84, 0x42): (0x50, 0xA8, 0xF0),
    (0xFF, 0x84, 0x4A): (0x50, 0xA8, 0xF0),
    (0xFF, 0x84, 0x63): (0x50, 0xA8, 0xF0),
    (0xFF, 0x8C, 0x52): (0x50, 0xA8, 0xF0),
    # azul claro #A0C0F8
    (0xF0, 0xC8, 0xA0): (0xA0, 0xC0, 0xF8),
    (0xF7, 0xCE, 0xA5): (0xA0, 0xC0, 0xF8),
    (0xFF, 0xDE, 0xAD): (0xA0, 0xC0, 0xF8),
    (0xFF, 0xC6, 0xA5): (0xA0, 0xC0, 0xF8),
}


def is_combat_aura(meta, tight):
    """Detecta un frame de aura de combate: ~64x56, con outline negro,
    color naranja dominante y >=5 colores (los orbes de beam son 4 colores
    sin outline)."""
    if not (55 <= meta['w'] <= 70 and 50 <= meta['h'] <= 60):
        return False
    a = np.array(tight.convert('RGBA'))
    mask = a[..., 3] > 0
    cols = set(map(tuple, a[mask][:, :3]))
    if len(cols) < 5:
        return False
    has_outline = any(max(c) <= 60 and (max(c) - min(c)) <= 12 for c in cols)
    has_orange = any(r > 220 and 100 < g < 180 and b < 120 for r, g, b in cols)
    return has_outline and has_orange


def aura_blue_generate(frames, fdir):
    """Genera las 3 auras azules (support) recoloreando las 3 auras naranjas
    (power) del sheet. Solo se recolorean los tonos del AURA (el mapeo
    AURA_ORANGE_TO_BLUE excluye los colores del personaje: #F07000, #F89800,
    #F880A0, verdes...). El usuario reportó que Cell, con naranja en el
    cuerpo, se recoloreaba entero — el canon del juego solo tiñe la llama."""
    auras = [(m, t) for m, t in frames if is_combat_aura(m, t)]
    out = []
    for i, (meta, tight) in enumerate(auras, 1):
        a = np.array(tight.convert('RGBA'))
        mask = a[..., 3] > 0
        for (r, g, b), (nr, ng, nb) in AURA_ORANGE_TO_BLUE.items():
            hit = mask & (a[..., 0] == r) & (a[..., 1] == g) & (a[..., 2] == b)
            a[hit, 0] = nr
            a[hit, 1] = ng
            a[hit, 2] = nb
        blue = Image.fromarray(a, 'RGBA')
        fn = f'aura_support_{i - 1:02d}.png'
        blue.save(os.path.join(fdir, fn))
        out.append({
            'index': None,  # se renumera después
            'file': fn,
            'w': blue.size[0], 'h': blue.size[1],
            'class': 'aura_support',
            'aura': 'support',
            'path': None,  # se rellena tras saber out_dir
        })
    return out


def build(args):
    src = args.src
    out_dir = args.out
    canvas = args.canvas

    os.makedirs(os.path.join(out_dir, 'frames'), exist_ok=True)
    os.makedirs(os.path.join(out_dir, 'uniform'), exist_ok=True)
    os.makedirs(os.path.join(out_dir, 'preview'), exist_ok=True)

    manifest, report_rows, totals = {}, [], Counter()

    sheets = sorted(f for f in os.listdir(src) if f.lower().endswith(('.gif', '.png')))
    for sf in sheets:
        sheet = os.path.splitext(sf)[0]
        frames, skipped = extract_sheet(os.path.join(src, sf), canvas)
        totals['frames'] += len(frames)
        totals['skipped_labels'] += len(skipped)
        totals['overflow'] += sum(1 for m, _ in frames if m['class'] == 'character' and (m['w'] > canvas or m['h'] > canvas))

        fdir = os.path.join(out_dir, 'frames', sheet_dirs(sheet)[0])
        udir = os.path.join(out_dir, 'uniform', sheet_dirs(sheet)[0])
        edir = os.path.join(fdir, 'effects')
        os.makedirs(fdir, exist_ok=True)
        os.makedirs(udir, exist_ok=True)
        os.makedirs(edir, exist_ok=True)

        entry = []
        for meta, tight in frames:
            if meta['class'] in EFFECT_CLASSES:
                target = os.path.join(edir, meta['file'])
            else:
                target = os.path.join(fdir, meta['file'])
            tight.save(target)
            meta['path'] = os.path.relpath(target, out_dir).replace(os.sep, '/')
            if meta.get('uniform'):
                c = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
                c.paste(tight, (meta['uniform']['ox'], meta['uniform']['oy']), tight)
                c.save(os.path.join(udir, meta['file']))
            entry.append(meta)

        # Auras azules (support): las 3 auras naranjas del sheet recoloreadas
        # (canon del juego: aura_power naranja → aura_support azul, misma máscara).
        aura_meta = aura_blue_generate(frames, fdir)
        for am in aura_meta:
            am['path'] = os.path.relpath(os.path.join(fdir, am['file']), out_dir).replace(os.sep, '/')
        entry.extend(aura_meta)

        # preview 2x: filas de 10 (frames + auras azules generadas)
        all_frames = list(frames) + [(m, None) for m in aura_meta]
        n = len(all_frames)
        cols = 10
        rows = (n + cols - 1) // cols
        cell = canvas * 2 + 8
        pv = Image.new('RGBA', (cols * cell + 8, max(1, rows) * cell + 8), (16, 16, 16, 255))
        for i, (meta, tight) in enumerate(all_frames):
            r, c = divmod(i, cols)
            img = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
            if tight is None:
                # aura azul generada: recargar del disco
                tight = Image.open(os.path.join(fdir, meta['file'])).convert('RGBA')
            if meta.get('uniform'):
                img.paste(tight, (meta['uniform']['ox'], meta['uniform']['oy']), tight)
            else:
                img.paste(tight, ((canvas - meta['w']) // 2, (canvas - meta['h']) // 2), tight)
            pv.paste(img.resize((canvas * 2, canvas * 2), Image.NEAREST),
                     (4 + c * cell, 4 + r * cell))
        pv.save(os.path.join(out_dir, 'preview', f'{sheet}.png'))

        # re-numerar incluyendo las auras azules (el path original se mantiene)
        for idx, m_ in enumerate(entry, 1):
            m_['index'] = idx

        manifest[sheet] = {
            'source': sf,
            'character': sheet_dirs(sheet)[1],
            'form': sheet_dirs(sheet)[2],
            'frame_count': len(entry), 'skipped_labels': skipped,
            'frames': entry,
        }
        cls_counts = Counter(m['class'] for m in entry)
        overflow = [m['index'] for m in entry
                    if m['class'] == 'character' and (m['w'] > canvas or m['h'] > canvas)]
        report_rows.append({
            'sheet': sheet, 'frames': len(entry), 'classes': dict(cls_counts),
            'labels_skipped': len(skipped),
            'uniform': sum(1 for m in entry if m.get('uniform')),
            'overflow': overflow,
        })

    with open(os.path.join(out_dir, 'manifest.json'), 'w') as fh:
        json.dump(manifest, fh, indent=1)

    # REPORT.md
    lines = [
        '# Reporte de extracción — Sheets_Canonic_Characters_DBZ',
        '',
        f'Canvas uniforme: **{canvas}x{canvas}** (bottom-center, solo clase `character`)',
        'Segmentación: componentes conexos 8-conectados (cada pieza individual del sheet)',
        '',
        f'Total frames: **{totals["frames"]}** · componentes de texto omitidos: {totals["skipped_labels"]} · overflow (no caben en {canvas}x{canvas}): {totals["overflow"]}',
        '',
        '| Sheet | Frames | Clases | Uniformes | Overflow |',
        '|---|---|---|---|---|',
    ]
    for r in report_rows:
        lines.append(
            f"| {r['sheet']} | {r['frames']} | {r['classes']} | {r['uniform']} | {r['overflow']} |")
    lines += ['', '## Clases', '- `character`: frame de personaje (outline negro + >=3 colores, entra en uniforme)', '- `projectile`: orbe/bola de energía (paleta degradado sin outline, tight)', '- `stripe_effect`: rayas de efecto 2 colores (tight, no normalizado)', '- `large_effect`: beams/orbes/auras grandes (tight, no normalizado)', '- `speedline`: línea vertical 1px (efecto velocidad)', '- `spark_particle`: partícula pequeña', '- `misc`: no clasificado (tight)']
    with open(os.path.join(out_dir, 'REPORT.md'), 'w') as fh:
        fh.write('\n'.join(lines) + '\n')

    print(json.dumps(totals))
    print(f'OK → {out_dir}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--out', default=None)
    ap.add_argument('--canvas', type=int, default=64)
    a = ap.parse_args()
    if a.out is None:
        a.out = os.path.join(os.path.abspath(a.src), 'OUT_frames')
    build(a)


if __name__ == '__main__':
    main()
