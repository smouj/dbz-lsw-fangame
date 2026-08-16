#!/usr/bin/env python3
"""Amplía el V9 con los frames FIXED-only del runtime (392) — canonización total.

Los 1.952 atomic del V9 cubren las formas canónicas V7. El runtime usa además
392 frames del bridge FIXED (fallback del import original) para completar
poses (hurt/beam_charge/attack_fwd/...) que el V7 no incluye.

Este script los exporta al V9 como `fixed_only/<form>/<NNN>_<pose>.png`
(transparencia normalizada), crea aliases en `named/fixed_only_<pose>/` y
genera `catalog/fixed_only_frames.csv` (catálogo separado, sin romper los
counts QA de frame_catalog.csv = 1.952).

Resultado: el V9 cubre el 100% de los frames que el runtime reproduce.

Uso: python3 scripts/export-v9-fixed-only.py [--apply]
"""
import sys, os, json, csv, hashlib, shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
V9 = ROOT / 'sprites-source/catalog-v9/forms_by_runtime'
REPO = ROOT / 'public/assets/sprites'
CATALOG = ROOT / 'sprites-source/catalog-v9/catalog'

def shape_sig(im):
    im = im.convert('RGBA')
    px = im.load()
    pts = set()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            pts.add((x, y))
    if not pts: return None
    minx = min(p[0] for p in pts); miny = min(p[1] for p in pts)
    return frozenset((x - minx, y - miny) for x, y in pts)

def shape_hash(sig):
    return hashlib.md5(repr(sorted(sig)).encode()).hexdigest()

def normalize_transparency(img):
    img = img.convert('RGBA')
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0 and (r, g, b) != (0, 0, 0):
                px[x, y] = (0, 0, 0, 0)
    return img

def main():
    apply = '--apply' in sys.argv

    # 1) Índice V9 shapes (atomic)
    v9_shapes = {}
    for form in sorted(os.listdir(V9)):
        atomic = V9 / form / 'atomic'
        if not atomic.is_dir(): continue
        for fn in sorted(os.listdir(atomic)):
            if not fn.endswith('.png'): continue
            sig = shape_sig(Image.open(atomic / fn))
            if sig: v9_shapes.setdefault(form, set()).add(shape_hash(sig))

    # 2) Frames runtime sin match V9 (FIXED-only)
    fixed = []
    for d in sorted(os.listdir(REPO)):
        if d == 'effects': continue
        dp = REPO / d
        mp = dp / 'manifest.json'
        if not mp.exists(): continue
        m = json.load(open(mp))
        seen = set()
        for pose, spec in m.items():
            if not isinstance(spec, dict) or 'frames' not in spec: continue
            for fr in spec['frames']:
                fn = fr.get('file') if isinstance(fr, dict) else fr
                if fn in seen: continue
                seen.add(fn)
                fp = dp / fn
                if not fp.exists(): continue
                sig = shape_sig(Image.open(fp))
                if sig is None: continue
                h = shape_hash(sig)
                if h in v9_shapes.get(d, set()): continue
                fixed.append((d, pose, fn))

    print(f'frames FIXED-only detectados: {len(fixed)}')
    if not apply:
        for d, pose, fn in sorted(fixed)[:12]:
            print(f'  {d}/{pose}/{fn}')
        print('\nDRY-RUN — pasa --apply para exportar al V9')
        return

    # 3) Exportar fixed_only/<form>/<NNN>_<pose>.png + alias named/
    exported = 0
    rows = []
    for d, pose, fn in sorted(fixed):
        src = REPO / d / fn
        dst_dir = V9 / d / 'fixed_only'
        dst_dir.mkdir(parents=True, exist_ok=True)
        n = len([x for x in os.listdir(dst_dir) if x.endswith('.png')])
        dst_name = f'{n:03d}_{pose}.png'
        img = normalize_transparency(Image.open(src))
        img.save(dst_dir / dst_name)
        # alias named
        bucket = f'fixed_only_{pose}'
        alias_dir = V9 / d / 'named' / bucket
        alias_dir.mkdir(parents=True, exist_ok=True)
        alias_name = f'{d}__{bucket}__{n:03d}__src_{os.path.splitext(fn)[0]}.png'
        shutil.copy2(dst_dir / dst_name, alias_dir / alias_name)
        # fila catálogo
        rows.append({
            'runtime_dir': d, 'pose': pose, 'runtime_file': fn,
            'fixed_file': dst_name, 'path': f'forms_by_runtime/{d}/fixed_only/{dst_name}',
            'alias': alias_name, 'bucket': bucket, 'source': 'FIXED_BRIDGE',
            'w': img.size[0], 'h': img.size[1],
            'md5': hashlib.md5((dst_dir / dst_name).read_bytes()).hexdigest()[:12],
        })
        exported += 1

    # 4) Catálogo separado fixed_only_frames.csv
    with open(CATALOG / 'fixed_only_frames.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    # 5) Resumen en runtime_form_summary.csv: añadir columna? Mejor documento en README.
    print(f'exportados: {exported} frames fixed_only')
    print(f'catálogo: {CATALOG / "fixed_only_frames.csv"}')
    print('nota: frame_catalog.csv se mantiene en 1.952 (canónico V7); fixed_only es bridge FIXED.')

if __name__ == '__main__':
    main()
