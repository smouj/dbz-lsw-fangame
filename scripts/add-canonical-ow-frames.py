#!/usr/bin/env python3
"""Canonical V9 completeness — add missing OW / aura-tile / composite frames.

2026-08-17 — El usuario reportó que en el V9 canónico algunos characters
(trunks_base = kid trunks, nappa, gotenks_ssj3...) no tienen los frames de
overworld / idle / powerup que sí tienen los bien configurados.

Patrón canónico (formas bien configuradas):
  · overworld_actor_or_pose (2 frames chibi 12-16px: idle + walk)
  · battle_aura_tile (24x16 blob de aura)
  · battle_aura_actor_composite (24x16 personaje dentro del aura)

Fuentes de los frames que faltan (el usuario: "seguro que tenemos ese frame"):
  · trunks_base      → kid_trunks_super_saiyan 024/025/026/027 (mismo arte kid trunks, == sheet ROM trunks_kid.png)
  · nappa_base       → runtime panel_sprites/nappa_base_ow.png + battle aura runtime (+ composite generado)
  · gotenks_ssj3     → runtime panel_sprites/gotenks_super_saiyan_3_ow.png + battle aura runtime (+ composite generado)
  · android_16/frieza→ composite generado (OW walk sobre tile)
  · buu_gohan        → 028/029 eran tiles mal clasificados como composite → re-clasificar + composite generado
  · young_gohan_ssj  → 029 era tile mal clasificado → re-clasificar
  · ginyu            → composite generado

Aplica en: paquete V9 (tmp) + copia del repo (sprites-source/catalog-v9).
"""
import json
import subprocess
import sys
from pathlib import Path
from PIL import Image

ROOTS = [
    Path('/home/local-user/.openclaw/workspace/.openclaw/tmp/v9/DBZ_LSW_SPRITES_PACKAGED_V9_RIGHTCANONICAL/forms_by_runtime'),
    Path('/home/local-user/.openclaw/workspace/dbz-lsw-fangame/sprites-source/catalog-v9/forms_by_runtime'),
]
RUNTIME = Path('/home/local-user/.openclaw/workspace/dbz-lsw-fangame/public/assets')

# ── plan: form -> list of (new_frame, source, bucket, note) ──
# source: ('copy', path) | ('runtime', relpath) | ('gen', owwalk, tile) | ('reclass', new_bucket)
PLAN = {
    'trunks_base': {
        'add': [
            ('035.png', ('copy', 'kid_trunks_super_saiyan/atomic/024.png'), 'overworld_actor_or_pose', 'OW idle (== sheet trunks_kid.png 247,665)'),
            ('036.png', ('copy', 'kid_trunks_super_saiyan/atomic/025.png'), 'overworld_actor_or_pose', 'OW walk (== sheet trunks_kid.png 267,665)'),
            ('037.png', ('copy', 'kid_trunks_super_saiyan/atomic/026.png'), 'battle_aura_actor_composite', 'powerup composite (== sheet 287,665)'),
            ('038.png', ('copy', 'kid_trunks_super_saiyan/atomic/027.png'), 'battle_aura_tile', 'aura tile (== sheet 316,665)'),
        ],
        'sheet_src': 'kid_trunks_super_saiyan',
    },
    'nappa_base': {
        'add': [
            ('038.png', ('runtime', 'overworld/panel_sprites/nappa_base_ow.png'), 'overworld_actor_or_pose', 'OW idle (único frame disponible)'),
            ('039.png', ('runtime', 'overworld/battle/nappa/base/battle_overworld/effects/000_gather_power_aura.png'), 'battle_aura_tile', 'aura tile'),
            ('040.png', ('gen', '038.png', '039.png'), 'battle_aura_actor_composite', 'composite generado (chibi + aura)'),
        ],
    },
    'gotenks_super_saiyan_3': {
        'add': [
            ('045.png', ('runtime', 'overworld/panel_sprites/gotenks_super_saiyan_3_ow.png'), 'overworld_actor_or_pose', 'OW idle (único frame disponible)'),
            ('046.png', ('runtime', 'overworld/battle/gotenks/super_saiyan_3/battle_overworld/effects/000_gather_power_aura.png'), 'battle_aura_tile', 'aura tile'),
            ('047.png', ('gen', '045.png', '046.png'), 'battle_aura_actor_composite', 'composite generado (chibi + aura)'),
        ],
    },
    'android_16_base': {
        'add': [
            ('045.png', ('gen', '006.png', '007.png'), 'battle_aura_actor_composite', 'composite generado (OW walk sobre tile)'),
        ],
    },
    'frieza_base': {
        'add': [
            ('047.png', ('gen', '006.png', '007.png'), 'battle_aura_actor_composite', 'composite generado (OW walk sobre tile)'),
        ],
    },
    'buu_gohan_absorbed': {
        'reclass': {'028.png': 'battle_aura_tile', '029.png': 'battle_aura_tile'},
        'add': [
            ('057.png', ('gen', '033.png', '028.png'), 'battle_aura_actor_composite', 'composite generado (OW walk sobre tile)'),
        ],
    },
    'young_gohan_super_saiyan': {
        'reclass': {'029.png': 'battle_aura_tile'},
    },
    'ginyu_base': {
        'add': [
            ('053.png', ('gen', '030.png', '025.png'), 'battle_aura_actor_composite', 'composite generado (OW sobre tile)'),
        ],
    },
}

# v5 categorías por bucket (igual que entradas existentes)
V5_CAT = {
    'overworld_actor_or_pose': ('sprites/movement_or_attack_pose', 'overworld'),
    'battle_aura_tile': ('sprites/effects', 'aura_tile'),
    'battle_aura_actor_composite': ('sprites/effects', 'powerup_composite'),
}


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


def components_of(img: Image.Image):
    img = img.convert('RGBA')
    w, h = img.size
    alpha = img.split()[3]
    seen = set()
    n = 0
    for y in range(h):
        for x in range(w):
            if alpha.getpixel((x, y)) > 40 and (x, y) not in seen:
                n += 1
                stack = [(x, y)]
                seen.add((x, y))
                while stack:
                    cx, cy = stack.pop()
                    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and alpha.getpixel((nx, ny)) > 40:
                            seen.add((nx, ny))
                            stack.append((nx, ny))
    return n


def git_blob(p: Path):
    try:
        return subprocess.run(['git', 'hash-object', str(p)], capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ''


def next_frame_num(atomic_dir: Path):
    nums = [int(f.stem) for f in atomic_dir.glob('*.png') if f.stem.isdigit()]
    return max(nums) + 1


def rebuild_atomic_sheet(form_dir: Path, catalog: list):
    """Rebuild spritesheets/atomic_sheet.png + .json from atomic/ (grid layout)."""
    sheet_dir = form_dir / 'spritesheets'
    atomic = form_dir / 'atomic'
    frames = sorted(atomic.glob('*.png'))
    if not frames:
        return
    # cell geometry: keep the SAME as current sheet (cell_width/height from json)
    jpath = sheet_dir / 'atomic_sheet.json'
    if jpath.exists():
        j = json.load(open(jpath))
        cols = j.get('columns', 8)
        cell_w = j.get('cell_width')
        cell_h = j.get('cell_height')
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
    """Rebuild by_bucket/<bucket>.png + .json for the given frames (list of (frame, alias))."""
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


def apply_form(form_name: str, plan: dict):
    for root in ROOTS:
        fdir = root / form_name
        if not fdir.exists():
            print(f'  !! {root.name}/{form_name} no existe, skip')
            continue
        atomic = fdir / 'atomic'
        cat_path = fdir / 'catalog.json'
        catalog = json.load(open(cat_path))
        by_frame = {e['frame']: e for e in catalog}

        # ── reclassificaciones ──
        for frame, new_bucket in plan.get('reclass', {}).items():
            e = by_frame[frame]
            old_bucket = e['semantic_bucket']
            if old_bucket == new_bucket:
                continue
            e['semantic_bucket'] = new_bucket
            # re-alias
            old_alias = e['semantic_alias']
            idx = 1
            for other in catalog:
                if other['semantic_bucket'] == new_bucket and other['frame'] != frame:
                    idx += 1
            e['semantic_alias'] = f"{form_name}__{new_bucket}__{idx:02d}__src_{frame}"
            e['correction'] = 'reclassified_2026-08-17'
            # move named alias
            for bucket_dir in ['battle_aura_actor_composite', 'battle_aura_tile']:
                old_p = fdir / 'named' / bucket_dir / old_alias
                if old_p.exists():
                    new_p = fdir / 'named' / new_bucket / e['semantic_alias']
                    new_p.parent.mkdir(parents=True, exist_ok=True)
                    if old_p != new_p:
                        old_p.rename(new_p)
            print(f'   {form_name}: {frame} {old_bucket} -> {new_bucket}')

        # ── frames nuevos (idempotente: salta si ya existe) ──
        for frame, src, bucket, note in plan.get('add', []):
            if frame in by_frame:
                continue
            dst = atomic / frame
            src_img = None
            kind = src[0]
            if kind == 'copy':
                src_path = ROOTS[0] / src[1]
                im = Image.open(src_path).convert('RGBA')
            elif kind == 'runtime':
                im = Image.open(RUNTIME / src[1]).convert('RGBA')
            elif kind == 'gen':
                walk_f, tile_f = src[1], src[2]
                walk_im = Image.open(atomic / walk_f).convert('RGBA')
                tile_im = Image.open(atomic / tile_f).convert('RGBA')
                im = tile_im.copy()
                ww, wh = walk_im.size
                tw, th = tile_im.size
                im.paste(walk_im, ((tw - ww) // 2, (th - wh) // 2), walk_im)
            im.save(dst)
            # stats
            op, nrgb, occ = opaque_stats(im)
            comps = components_of(im)
            # alias index
            idx = sum(1 for e in catalog if e['semantic_bucket'] == bucket) + 1
            alias = f"{form_name}__{bucket}__{idx:02d}__src_{frame}"
            entry = {
                'canonical_id': f'{form_name}/{frame}',
                'character': form_name.split('_')[0],
                'form': form_name,
                'frame': frame,
                'canonical_path': f'forms_by_runtime/{form_name}/atomic/{frame}',
                'runtime_dir': form_name,
                'semantic_alias': alias,
                'semantic_bucket': bucket,
                'semantic_certainty': 'visual_geometry',
                'confidence': 'HIGH',
                'v5_categories': V5_CAT.get(bucket, ('', ''))[0],
                'v5_suggested_actions': V5_CAT.get(bucket, ('', ''))[1],
                'old_refs': src[1] if kind in ('copy', 'runtime') else f'gen:{walk_f}+{tile_f}',
                'correction': 'added_2026-08-17_canonical_completeness',
                'source_sheet': ('kid_trunks_super_saiyan' if kind == 'copy' else ('runtime' if kind == 'runtime' else 'generated')),
                'x0': '0', 'y0': '0', 'width': str(im.width), 'height': str(im.height),
                'opaque_pixels': str(op), 'unique_rgb': str(nrgb), 'occupancy': f'{occ:.5f}',
                'components': str(comps),
                'git_blob_sha1': git_blob(dst),
                'evidence': f'V9:added_2026-08-17:{note}',
            }
            catalog.append(entry)
            by_frame[frame] = entry
            # named alias
            alias_dir = fdir / 'named' / bucket
            alias_dir.mkdir(parents=True, exist_ok=True)
            (alias_dir / alias).write_bytes(dst.read_bytes())
            print(f'   {form_name}: +{frame} ({bucket}) {im.size} <- {src[1] if kind in ("copy","runtime") else "generated"}')

        # ── catálogo ordenado ──
        catalog.sort(key=lambda e: int(e['frame'].split('.')[0]))
        json.dump(catalog, open(cat_path, 'w'), indent=2, ensure_ascii=False)
        open(cat_path, 'a').write('\n')

        # ── atomic sheet rebuild ──
        rebuild_atomic_sheet(fdir, catalog)

        # ── buckets: rebuild afectados ──
        touched_buckets = set()
        for frame, src, bucket, _ in plan.get('add', []):
            touched_buckets.add(bucket)
        touched_buckets.update(plan.get('reclass', {}).values())
        for bucket in touched_buckets:
            entries = [(e['frame'], e['semantic_alias']) for e in catalog if e['semantic_bucket'] == bucket]
            rebuild_bucket(fdir, bucket, entries)

        # ── catalog.csv sync (CRLF como el original) ──
        csv_path = fdir / 'catalog.csv'
        if csv_path.exists():
            header = csv_path.read_text().splitlines()[0]
            fieldnames = header.split(',')
            rows = [','.join(str(e.get(f, '')) for f in fieldnames) for e in catalog]
            csv_path.write_bytes((header + '\r\n' + '\r\n'.join(rows) + '\r\n').encode())
            print(f'   {form_name}: catalog.csv actualizado ({len(catalog)} filas)')


def main():
    for form_name, plan in PLAN.items():
        print(f'== {form_name} ==')
        apply_form(form_name, plan)
    print('DONE')


if __name__ == '__main__':
    main()
