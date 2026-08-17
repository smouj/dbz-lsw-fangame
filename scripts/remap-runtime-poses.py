#!/usr/bin/env python3
"""Re-mapea poses runtime usando FIXED (autoridad de poses) + V9 forms_by_runtime
(autoridad de píxeles). Estrategia FUSIÓN: los frames que casan con una pose
FIXED se re-asignan a la pose correcta; los que no casan se conservan.

Bridge GLOBAL (no por forma): el FIXED indexa TODAS sus formas con flip, así
las formas prestadas (vegito←goku_ssj) y espejadas (facing) también casan.

Uso: python3 scripts/remap-runtime-poses.py [--apply] [--form goku_base]
"""
import sys, os, json, hashlib
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT / 'public/assets/sprites'
V9 = ROOT / 'sprites-source/catalog-v9/forms_by_runtime'
FIXED = ROOT.parent / '.openclaw/tmp/fixed-src'
BG = {(211, 249, 188), (0, 0, 0)}

POSE_FROM_FIXED = {
    'idle': 'idle',
    'move_front': 'movement',
    'move_back': 'movement',
    'guard': 'guard',
    'attack_fwd': 'attack_forward',
    'attack_ud': 'attack_vertical',
    'hurt': 'hurt',
    'beam_charge': 'beam',
    'beam_fire': 'beam',
}
FIXED_POSES = ['idle', 'movement', 'guard', 'attack_forward',
               'attack_vertical', 'hurt', 'beam']
BASE_RUNTIME_POSES = list(POSE_FROM_FIXED.keys())

def shape_sig(im, flip=False):
    im = im.convert('RGBA')
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    px = im.load()
    pts = set()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0 or (r, g, b) in BG:
                continue
            pts.add((x, y))
    if not pts:
        return None
    x0 = min(p[0] for p in pts)
    y0 = min(p[1] for p in pts)
    return frozenset((x - x0, y - y0) for x, y in pts)

def shape_hash(sig):
    return hashlib.md5(repr(sorted(sig)).encode()).hexdigest()

def build_fixed_global():
    """shape hash -> [pose] para TODAS las formas FIXED (con flip)."""
    idx = {}
    for root, dirs, files in os.walk(FIXED):
        if '00_manifest' in root or '98_qa' in root or '99_source_sheets' in root:
            continue
        pose = os.path.basename(root)
        if pose not in FIXED_POSES:
            continue
        for fn in files:
            if not fn.endswith('.png'):
                continue
            if '_pose' in fn or '_effect' in fn:
                continue  # duplicados de revisión
            try:
                im = Image.open(os.path.join(root, fn))
                for flip in (False, True):
                    sig = shape_sig(im, flip=flip)
                    if sig is not None:
                        idx.setdefault(shape_hash(sig), []).append(pose)
            except Exception:
                pass
    return idx

def classify_atomic(rt, fixed_idx):
    """Clasifica cada atomic V9 de una forma -> pose FIXED (o None)."""
    atomic = V9 / rt / 'atomic'
    out = {}  # atomic file -> pose
    if not atomic.is_dir():
        return out
    for fn in sorted(os.listdir(atomic)):
        if not fn.endswith('.png'):
            continue
        try:
            sig = shape_sig(Image.open(atomic / fn))
            if sig is None:
                continue
            hits = fixed_idx.get(shape_hash(sig), [])
            out[fn] = hits[0] if hits else None
        except Exception:
            out[fn] = None
    return out

def main():
    apply = '--apply' in sys.argv
    only_form = None
    if '--form' in sys.argv:
        only_form = sys.argv[sys.argv.index('--form') + 1]

    fixed_idx = build_fixed_global()
    print(f'FIXED global indexado: {len(fixed_idx)} firmas')

    stats = {'remapped': 0, 'kept': 0}
    for rt in sorted(os.listdir(V9)):
        if only_form and rt != only_form:
            continue
        mp = REPO / rt / 'manifest.json'
        if not mp.exists():
            continue
        manifest = json.load(open(mp))
        classif = classify_atomic(rt, fixed_idx)

        # Agrupar atomic por pose FIXED
        by_pose = {}
        for atom, pose in classif.items():
            if pose:
                by_pose.setdefault(pose, []).append(atom)

        changed = 0
        for rpose in BASE_RUNTIME_POSES:
            fpose = POSE_FROM_FIXED[rpose]
            atoms = by_pose.get(fpose, [])
            if not atoms:
                continue
            spec = manifest.get(rpose)
            if not spec or not isinstance(spec, dict):
                continue
            # Nuevos frames a partir de atomic V9
            new_frames = []
            for i, atom in enumerate(atoms):
                im = Image.open(V9 / rt / 'atomic' / atom).convert('RGBA')
                w, h = im.size
                new_frames.append({
                    'name': f'{rt}_{rpose}_{i:02d}',
                    'file': f'{rt}_{rpose}_{i:02d}.png',
                    'w': w, 'h': h,
                })
                if apply:
                    im.save(REPO / rt / f'{rt}_{rpose}_{i:02d}.png')
            spec['frames'] = new_frames
            spec['frame_count'] = len(new_frames)
            stats['remapped'] += len(new_frames)
            changed += 1

        # move_back = move_front (el GBC espeja con scaleX)
        if 'move_front' in manifest and 'move_back' in manifest and not apply:
            pass  # ya se re-mapea por separado (mismos atomic movement)

        if changed:
            if apply:
                json.dump(manifest, open(mp, 'w'), indent=2, ensure_ascii=False)
                print(f'  {rt}: re-mapeadas {changed} poses')
            else:
                print(f'  {rt}: {changed} poses a re-mapear (dry-run)')
        else:
            stats['kept'] += 1

    print(f"\nResumen: {stats['remapped']} frames re-mapeados, {stats['kept']} formas sin cambios")
    if not apply:
        print('DRY-RUN — pasa --apply para escribir manifests y copiar PNGs')

if __name__ == '__main__':
    main()
