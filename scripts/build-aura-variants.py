#!/usr/bin/env python3
"""Build SUPPORT BLUE variant of the ACTION power-aura (canonical V9).

2026-08-17 — El usuario pidió la variante BLUE/SUPPORT de la animación del aura
de power de las ACCIONES (NO el overworld): los frames 64x56 donde el personaje
aparece rodeado por el aura naranja (ciclo de paleta A→B→C del GBC).

Investigación ROM confirmada por el usuario: el aura es UNA geometría (23 tiles
GBC 2bpp, ~64x64, simetría horizontal) animada por CICLO DE PALETA. Nuestros
frames del catálogo (orbs_rings_bursts / projectiles_beams 01-03, 64x56) son
exactamente eso: personaje + aura, 3 fases con la MISMA geometría y los 3
colores de la paleta rotando por píxel.

Método (pixel-perfect, sin global color replace):
  · La máscara del aura se deriva POR PÍXEL: un píxel (x,y) es AURA si sus 3
    colores en las 3 fases son 3 naranjas DISTINTOS (el píxel rota con el
    ciclo). El personaje es estático (mismo color en las 3 fases) → NUNCA se
    toca, aunque comparta RGB con el aura (colisión imposible por diseño).
  · La variante SUPPORT reemplaza SOLO los píxeles del aura con su azul
    correspondiente (mapeo exacto del prompt: F0A050→50A8F0, F0C8A0→A0C0F8,
    F88000→0090F0; variantes de la ROM F7/FF → por proximidad al canónico).
  · El personaje (todos los demás píxeles) permanece binariamente idéntico.

Aplica en: paquete V9 (tmp) + copia del repo (sprites-source/catalog-v9).
Idempotente: --apply dos veces no duplica ni deteriora.

Uso: python3 scripts/build-aura-variants.py [--apply]
"""
import json
import subprocess
import sys
from pathlib import Path
from PIL import Image

ROOTS = [
    Path('generated/sprites/DBZ_LSW_SPRITES_PACKAGED_V9_RIGHTCANONICAL/forms_by_runtime'),
    Path('./sprites-source/catalog-v9/forms_by_runtime'),
]

# Bucket donde vive el ciclo del aura por forma (default orbs_rings_bursts).
# goku_base: el ciclo está en projectiles_beams 02/03/04 (bucket de la V7).
CYCLE_BUCKET_OVERRIDE = {
    'goku_base': 'projectiles_beams',
}

# Formas FIXED-only: sin atomic/named; su arte es el de la forma fuente
# (ginyu_gokus_body = cuerpo de Goku; goku_ssj2 = Goku SSJ compartido).
FIXED_SOURCE = {
    'goku_super_saiyan_2': 'goku_super_saiyan',
    'ginyu_gokus_body': 'goku_base',
}

# Paleta POWER naranja → SUPPORT azul (correspondencia EXACTA del usuario)
ORANGE_TO_BLUE = {
    (0xF0, 0xA0, 0x50): (0x50, 0xA8, 0xF0),  # medio
    (0xF0, 0xC8, 0xA0): (0xA0, 0xC0, 0xF8),  # claro
    (0xF8, 0x80, 0x00): (0x00, 0x90, 0xF0),  # oscuro
}

BUCKET = 'aura_support'


def is_orangeish(c):
    r, g, b = c
    return r > 200 and g > 100 and b < 190 and r > g > b


def azul_for(c):
    if c in ORANGE_TO_BLUE:
        return ORANGE_TO_BLUE[c]
    # variantes de la ROM (F7A552, F7CEA5, FF8400, FF8463, FF8442, FF8429,
    # FF8431, FF8418, FF8439, FFDEAD...): mapear por proximidad al canónico
    best = min(ORANGE_TO_BLUE, key=lambda k: (k[0] - c[0]) ** 2 + (k[1] - c[1]) ** 2 + (k[2] - c[2]) ** 2)
    return ORANGE_TO_BLUE[best]


def load_rgba(p: Path):
    return Image.open(p).convert('RGBA')


def cycle_frames(form_dir: Path, form_name: str):
    """Localiza los 3 frames del ciclo del aura (64x56, paleta naranja)."""
    if form_name in FIXED_SOURCE:
        form_dir = form_dir.parent / FIXED_SOURCE[form_name]
        form_name = FIXED_SOURCE[form_name]
    bucket = CYCLE_BUCKET_OVERRIDE.get(form_name, 'orbs_rings_bursts')
    bdir = form_dir / 'named' / bucket
    if not bdir.exists():
        return None, None
    cands = []
    for p in sorted(bdir.glob('*.png')):  # orden natural del catálogo (__01__src_.., __02__.., __03__..)
        im = load_rgba(p)
        w, h = im.size
        if not (58 <= h <= 60 or 54 <= h <= 58) or not (60 <= w <= 66):
            continue
        px = im.load()
        n = 0
        for y in range(h):
            for x in range(w):
                if px[x, y][3] > 0 and is_orangeish(px[x, y][:3]):
                    n += 1
        if n > 200:
            cands.append((n, p, im))
    if len(cands) < 3:
        return None, None
    # PRESERVAR el orden del ciclo (A→B→C): NUNCA reordenar por conteo
    cands.sort(key=lambda c: c[1].name)
    return [(c[1], c[2]) for c in cands[:3]], bucket


def opaque_stats(img: Image.Image):
    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()
    op = 0
    rgb = set()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 40:
                op += 1
                rgb.add((r, g, b))
    return op, len(rgb), round(op / (w * h), 5)


def git_blob(p: Path):
    try:
        return subprocess.run(['git', 'hash-object', str(p)], capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ''


def next_frame_num(atomic_dir: Path):
    nums = [int(f.stem) for f in atomic_dir.glob('*.png') if f.stem.isdigit()]
    return max(nums) + 1


# ── layout sheets (misma geometría que add-canonical-ow-frames.py) ──
CELL_OVERRIDE = {'trunks_base': (122, 67)}
SHEET_ORDER_OVERRIDE = {'trunks_base': {'move_to_end': ['038.png']}}


def rebuild_atomic_sheet(form_dir: Path, catalog: list):
    sheet_dir = form_dir / 'spritesheets'
    atomic = form_dir / 'atomic'
    frames = sorted(atomic.glob('*.png'))
    if not frames:
        return
    order_ov = SHEET_ORDER_OVERRIDE.get(form_dir.name, {}).get('move_to_end', [])
    if order_ov:
        frames = [f for f in frames if f.name not in order_ov] + [f for f in frames if f.name in order_ov]
    jpath = sheet_dir / 'atomic_sheet.json'
    if jpath.exists():
        j = json.load(open(jpath))
        cols = j.get('columns', 8)
        cell_w = j.get('cell_width')
        cell_h = j.get('cell_height')
        if form_dir.name in CELL_OVERRIDE:
            cell_w, cell_h = CELL_OVERRIDE[form_dir.name]
    else:
        cols = 8
        cell_w = max(im.width for im in map(Image.open, frames)) + 60
        cell_h = max(im.height for im in map(Image.open, frames)) + 20
    rows = (len(frames) + cols - 1) // cols
    canvas = Image.new('RGBA', (cols * cell_w, rows * cell_h), (0, 0, 0, 0))
    sprites = {}
    for idx, f in enumerate(frames):
        im = Image.open(f).convert('RGBA')
        w, h = im.size
        row, col = divmod(idx, cols)
        x = col * cell_w + (cell_w - w) // 2
        y = row * cell_h + (cell_h - h) // 2
        canvas.paste(im, (x, y), im)
        sprites[f.name] = {
            'x': x, 'y': y, 'w': w, 'h': h,
            'source': f'/mnt/data/DBZ_LSW_SPRITES_PACKAGED_V9_RIGHTCANONICAL/forms_by_runtime/{form_dir.name}/atomic/{f.name}',
        }
    canvas.save(sheet_dir / 'atomic_sheet.png')
    json.dump({'columns': cols, 'rows': rows, 'cell_width': cell_w, 'cell_height': cell_h, 'sprites': sprites},
              open(jpath, 'w'), indent=2, ensure_ascii=False)
    print(f'   sheet {form_dir.name}: {len(frames)} frames -> {canvas.size}')


def rebuild_bucket(form_dir: Path, bucket: str, entries):
    bdir = form_dir / 'spritesheets' / 'by_bucket'
    bdir.mkdir(parents=True, exist_ok=True)
    imgs = []
    for frame, alias in entries:
        p = form_dir / 'atomic' / frame
        if p.exists():
            imgs.append((frame, alias, Image.open(p).convert('RGBA')))
    if not imgs:
        return
    maxw = max(im.width for _, _, im in imgs)
    maxh = max(im.height for _, _, im in imgs)
    gap = 2
    W = gap + sum(im.width + gap for _, _, im in imgs)
    H = maxh + gap * 2
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sprites = {}
    x = gap
    for frame, alias, im in imgs:
        y = gap + (maxh - im.height) // 2
        canvas.paste(im, (x, y), im)
        sprites[alias] = {'x': x, 'y': y, 'w': im.width, 'h': im.height,
                          'source': f'/mnt/data/DBZ_LSW_SPRITES_PACKAGED_V9_RIGHTCANONICAL/forms_by_runtime/{form_dir.name}/named/{bucket}/{alias}'}
        x += im.width + gap
    canvas.save(bdir / f'{bucket}.png')
    json.dump({'columns': len(imgs), 'rows': 1, 'cell_width': maxw + 4, 'cell_height': maxh + 4, 'sprites': sprites},
              open(bdir / f'{bucket}.json', 'w'), indent=2, ensure_ascii=False)


def build_support_frames(frames):
    """Devuelve (support_imgs, stats) — solo píxeles del aura → azul.

    Pasada 1: paleta del aura = colores naranjas que ROTAN en el ciclo
    (trío de 3 distintos en la misma posición). Pasada 2: cualquier píxel
    con un color de esa paleta se convierte (cubre micro-variaciones de
    geometría del GBC, p.ej. kid_buu fase 2 desplazada 1px). El personaje
    es estático y sus colores no están en la paleta del aura.
    """
    ims = [im for _, im in frames]
    w = max(im.width for im in ims)
    h = max(im.height for im in ims)
    px = [im.load() for im in ims]
    # pasada 1: paleta del aura
    palette = set()
    for y in range(h):
        for x in range(w):
            trio = []
            for i in range(3):
                if x < ims[i].width and y < ims[i].height:
                    r, g, b, a = px[i][x, y]
                    trio.append((r, g, b) if a > 0 else None)
                else:
                    trio.append(None)
            present = [c for c in trio if c is not None]
            if len(present) >= 2 and len(set(present)) == len(present) and all(is_orangeish(c) for c in present):
                palette.update(present)
    if not palette:
        return None, 0
    # pasada 2: convertir píxeles con color de la paleta del aura
    support = [im.copy() for im in ims]
    spx = [im.load() for im in support]
    aura_px = 0
    for i in range(3):
        for y in range(h):
            for x in range(ims[i].width):
                r, g, b, a = px[i][x, y]
                if a > 0 and (r, g, b) in palette:
                    spx[i][x, y] = azul_for((r, g, b)) + (a,)
                    aura_px += 1
    return support, aura_px


def apply_form(form_name: str):
    for root in ROOTS:
        fdir = root / form_name
        real_name = form_name
        real_dir = fdir
        if form_name in FIXED_SOURCE:
            # las FIXED-only no tienen dir propio en atomic: escribir en la FUENTE
            real_name = FIXED_SOURCE[form_name]
            real_dir = root / real_name
        if not real_dir.exists():
            print(f'  !! {root.name}/{form_name}: no existe, skip')
            continue
        atomic = real_dir / 'atomic'
        cat_path = real_dir / 'catalog.json'
        catalog = json.load(open(cat_path))
        # idempotencia: si la forma ya tiene aura_support, skip
        # (OJO: comparar por 'form' (form_name completo), NO por 'character'
        # — android_16_base tendría character='android' y nunca haría skip)
        if any(e.get('semantic_bucket') == BUCKET and e.get('form') == form_name for e in catalog):
            print(f'   {form_name}: ya tiene {BUCKET}, skip')
            continue
        frames, bucket = cycle_frames(real_dir, real_name)
        if not frames:
            print(f'   !! {form_name}: ciclo de aura no encontrado (bucket={bucket}), skip')
            continue
        support, aura_px = build_support_frames(frames)
        if aura_px == 0:
            print(f'   !! {form_name}: 0 píxeles de aura detectados, skip')
            continue
        # ── escribir atomic + named + catalog ──
        aliases = []
        for i, (p, im) in enumerate(zip([fr[0] for fr in frames], support), 1):
            src_frame = p.name.split('__src_')[-1]  # NNN.png del frame naranja
            new_frame = f'{next_frame_num(atomic):03d}.png'
            im.save(atomic / new_frame)
            op, nrgb, occ = opaque_stats(im)
            alias = f'{form_name}__{BUCKET}__{i:02d}__src_{src_frame}'
            aliases.append((new_frame, alias))
            entry = {
                'canonical_id': f'{real_name}/{new_frame}',
                'character': form_name.split('_')[0],
                'form': form_name,
                'frame': new_frame,
                'canonical_path': f'forms_by_runtime/{real_name}/atomic/{new_frame}',
                'runtime_dir': form_name,
                'semantic_alias': alias,
                'semantic_bucket': BUCKET,
                'semantic_certainty': 'visual_geometry',
                'confidence': 'HIGH',
                'v5_categories': 'sprites/effects',
                'v5_suggested_actions': 'aura_support',
                'old_refs': f'{real_name}/{src_frame}',
                'correction': 'added_2026-08-17_aura_support',
                'support_variant_of': f'{real_name}/{src_frame}',
                'palette': 'support_blue_2026-08-17',
                'source_sheet': 'generated',
                'x0': '0', 'y0': '0', 'width': str(im.width), 'height': str(im.height),
                'opaque_pixels': str(op), 'unique_rgb': str(nrgb), 'occupancy': f'{occ:.5f}',
                'components': '1',
                'git_blob_sha1': git_blob(atomic / new_frame),
                'evidence': f'V9:generated_support_blue_2026-08-17:from_{real_name}_{src_frame}',
            }
            catalog.append(entry)
            alias_dir = real_dir / 'named' / BUCKET
            alias_dir.mkdir(parents=True, exist_ok=True)
            (alias_dir / alias).write_bytes((atomic / new_frame).read_bytes())
            print(f'   {form_name}: +{new_frame} ({BUCKET}) {im.size} aura={aura_px}px <- {real_name}/{src_frame}')
        # ── catálogo ordenado + csv ──
        catalog.sort(key=lambda e: int(e['frame'].split('.')[0]))
        json.dump(catalog, open(cat_path, 'w'), indent=2, ensure_ascii=False)
        open(cat_path, 'a').write('\n')
        csv_path = real_dir / 'catalog.csv'
        if csv_path.exists():
            header = csv_path.read_text().splitlines()[0]
            fieldnames = header.split(',')
            rows = [','.join(str(e.get(f, '')) for f in fieldnames) for e in catalog]
            csv_path.write_bytes((header + '\r\n' + '\r\n'.join(rows) + '\r\n').encode())
        # ── sheets ──
        rebuild_atomic_sheet(real_dir, catalog)
        entries = [(e['frame'], e['semantic_alias']) for e in catalog if e['semantic_bucket'] == BUCKET and e['form'] == form_name]
        rebuild_bucket(real_dir, BUCKET, entries)


def main():
    forms = sorted(d.name for d in ROOTS[1].iterdir() if d.is_dir())
    n_done = 0
    for f in forms:
        print(f'== {f} ==')
        apply_form(f)
        n_done += 1
    print(f'\nDONE ({n_done} formas)')


if __name__ == '__main__':
    main()
