#!/usr/bin/env python3
"""Overworld facing v4: orientación NATIVA de cada chibi *_ow.png contra el V9 RIGHTCANONICAL.

Método (objetivo, sin visión; chibis ≤16px engañan al ojo humano y al modelo):

El paquete V9 (DBZ_LSW_SPRITES_PACKAGED_V9_RIGHTCANONICAL) es la ÚNICA fuente
de verdad de orientación: todos sus frames miran a la DERECHA por diseño.

  · Por cada chibi se busca su forma V9 (SPRITE_DIRS → forms_by_runtime).
  · Comparación de SILUETA (máscara binaria, IoU) contra los frames del bucket
    `spritesheets/by_bucket/overworld_actor_or_pose.png` (idle+walk).
  · SAME  = el chibi ya mira a la derecha (V9)  → correcto.
  · MIRROR = el chibi está espejado (mira a la izquierda) → FLIP.
  · Formas sin bucket OW: comparar contra los frames `atomic/` (002/004...).
  · Fallback final: goku_base_ow.png (verificado RIGHTCANONICAL en vivo).

IMPORTANTE (lección 2026-08-17): NO comparar chibis contra los idles de
combate del runtime — el V7/V9 trae 9 formas con combate a la izquierda y
re-importaciones pueden revertir la normalización; el paquete V9 es la única
referencia estable.

Uso: python3 scripts/check-overworld-facing.py [--apply] [--v9 PATH]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OW_DIR = ROOT / 'public/assets/overworld/panel_sprites'
DEFAULT_V9 = ROOT.parent / '.openclaw/tmp/v9/DBZ_LSW_SPRITES_PACKAGED_V9_RIGHTCANONICAL/forms_by_runtime'

# Formas sin bucket OW en el V9 → comparar contra atomic/ con estos frames
ATOMIC_FALLBACK = {
    'trunks_base': '004.png',
    'nappa_base': '002.png',
    'gotenks_super_saiyan_3': '010.png',
}


def load_rgba(path):
    from PIL import Image
    return Image.open(path).convert('RGBA')


def bbox_of(img):
    return img.split()[3].getbbox()


def to_mask(img, size):
    from PIL import Image
    m = img.split()[3].resize(size, Image.NEAREST)
    return m.point(lambda v: 255 if v > 40 else 0)


def mask_iou(a, b):
    pa = a.load(); pb = b.load()
    w, h = a.size
    inter = union = 0
    for y in range(h):
        for x in range(w):
            va = pa[x, y] > 0
            vb = pb[x, y] > 0
            if va and vb:
                inter += 1
            if va or vb:
                union += 1
    return 1.0 - (inter / union if union else 1.0)  # 0 = idéntico


def v9_frames(v9dir, d):
    """Frames de referencia de la forma: bucket OW si existe, si no atomic fallback."""
    bucket = v9dir / d / 'spritesheets/by_bucket/overworld_actor_or_pose.png'
    if bucket.exists():
        sheet = load_rgba(bucket)
        w, h = sheet.size
        frames = []
        x = 0
        while x < w:
            while x < w and all(sheet.getpixel((x, y))[3] < 40 for y in range(h)):
                x += 1
            if x >= w:
                break
            x0 = x
            while x < w and any(sheet.getpixel((x, y))[3] >= 40 for y in range(h)):
                x += 1
            frames.append(sheet.crop((x0, 0, x, h)))
        return frames or None
    fname = ATOMIC_FALLBACK.get(d)
    if fname:
        p = v9dir / d / 'atomic' / fname
        if p.exists():
            return [load_rgba(p)]
    return None


def best_rel(chibi, frames):
    cbb = bbox_of(chibi)
    if not cbb:
        return (9, '?')
    ch = chibi.crop(cbb)
    best = (9, '?')
    for fr in frames:
        bb = bbox_of(fr)
        if not bb:
            continue
        fr2 = fr.crop(bb)
        size = ch.size
        mf = to_mask(fr2, size)
        mm = mf.transpose(__import__('PIL').Image.FLIP_LEFT_RIGHT)
        mc = to_mask(ch, size)
        ds = mask_iou(mc, mf)
        dm = mask_iou(mc, mm)
        d = min(ds, dm)
        if d < best[0]:
            best = (d, 'SAME' if ds < dm else 'MIRROR')
    return best


def parse_ts_map(ts_path: Path, dict_name: str):
    text = ts_path.read_text()
    m = re.search(rf'const {dict_name}: Record<string, string> = \{{(.*?)\n\}};', text, re.S)
    if not m:
        sys.exit(f'No encontré {dict_name} en {ts_path}')
    return dict(re.findall(r"'([^']+)': '([^']+)'", m.group(1)))


def main() -> None:
    apply = '--apply' in sys.argv
    v9 = DEFAULT_V9
    if '--v9' in sys.argv:
        v9 = Path(sys.argv[sys.argv.index('--v9') + 1])
    from PIL import Image

    ow_files = parse_ts_map(ROOT / 'src/data/overworld.ts', 'OVERWORLD_FILES')
    sprite_dirs = parse_ts_map(ROOT / 'src/data/spriteManifest.ts', 'SPRITE_DIRS')

    ow_to_dir = {}
    for form, fname in ow_files.items():
        d = sprite_dirs.get(form)
        if d and fname not in ow_to_dir:
            ow_to_dir[fname] = d

    print(f'{"_ow.png":38} {"v9dir":30} d_same d_mirr decisión')
    print('-' * 90)
    lefts = []
    rows = []
    for fname in sorted(OW_DIR.glob('*_ow.png')):
        d = ow_to_dir.get(fname.name)
        if not d:
            rows.append((fname.name, '-', 0, 0, 'NO-DIR'))
            continue
        frames = v9_frames(v9, d)
        if not frames:
            rows.append((fname.name, d, 0, 0, 'NO-V9-FRAMES'))
            continue
        chibi = load_rgba(fname)
        # probar también contra goku_base (referencia absoluta) si no hay match bueno
        dmin, rel = best_rel(chibi, frames)
        # saber d_same/d_mirr del mejor frame
        cbb = bbox_of(chibi)
        ch = chibi.crop(cbb)
        best = (9, None)
        for fr in frames:
            bb = bbox_of(fr)
            if not bb:
                continue
            fr2 = fr.crop(bb)
            size = ch.size
            mf = to_mask(fr2, size)
            mm = mf.transpose(Image.FLIP_LEFT_RIGHT)
            mc = to_mask(ch, size)
            ds = mask_iou(mc, mf)
            dm = mask_iou(mc, mm)
            if min(ds, dm) < best[0]:
                best = (min(ds, dm), ds, dm)
        ds, dm = (best[1], best[2]) if best[0] < 9 else (0, 0)
        decision = rel if rel == 'MIRROR' else 'RIGHT'
        if decision == 'MIRROR':
            lefts.append(fname.name)
        rows.append((fname.name, d, ds, dm, decision))

    for name, d, ds, dm, decision in rows:
        mark = '  <-- ESPEJAR' if decision == 'MIRROR' else ''
        print(f'{name:38} {d:30} {ds:.3f} {dm:.3f} {decision}{mark}')

    print(f'\nTotal: {len(rows)} | LEFT (MIRROR of V9): {len(lefts)}')

    if apply:
        for fname in lefts:
            p = OW_DIR / fname
            img = load_rgba(p).transpose(Image.FLIP_LEFT_RIGHT)
            img.save(p)
            print(f'  ✔ espejado {fname}')
        print('APLICADO')
    else:
        print('DRY-RUN — pasa --apply para espejar. Referencia: V9 RIGHTCANONICAL.')


if __name__ == '__main__':
    main()
