#!/usr/bin/env python3
"""DBZ LSW — Oxigenador de sprites: reimporta frames de OUT_frames (extracción
canónica del usuario) a public/assets/sprites/<form>/ con manifests de poses.

Estrategia: el canon semántico (sprites-source/catalog-v9/forms_by_runtime/
<form>/frame_manifest.json) define pose → frame fuente (sourceId/atomic).
Se localiza cada frame en OUT_frames por SILUETA (shape hash) y se copia con
nombre <form>_<pose>_NN.png. Las poses compuestas (punch_right, knockback_*,
beam_guard) se derivan de los frames base vía POSE_FALLBACKS del runtime.

Uso: python3 scripts/oxidize-sprites.py [--dry-run]
"""
import json, os, sys, hashlib, shutil
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SPRITES = ROOT / 'public' / 'assets' / 'sprites'
V9 = ROOT / 'sprites-source' / 'catalog-v9' / 'forms_by_runtime'
OUT = Path('/mnt/c/Users/local-user/Desktop/Sheets_Canonic_Characters_DBZ/OUT_frames')

# ── canon_form → sheet OUT (sheet correcto de cada personaje) ──
CANON_TO_SHEET = {
    'goku_base': 'goku_base_sheet', 'goku_super_saiyan': 'goku_ssj_sheet',
    'goku_super_saiyan_2': 'goku_ssj2_sheet', 'goku_super_saiyan_3': 'goku_ssj3_sheet',
    'vegeta_base': 'vegeta_base_sheet', 'vegeta_super_saiyan_majin': 'vegeto_ssj_sheet',
    'young_gohan_base': 'gohan_kid_base_sheet', 'young_gohan_super_saiyan': 'gohan_kid_ssj_sheet',
    'young_gohan_super_saiyan_2': 'gohan_kid_ssj2_sheet',
    'gohan_super_saiyan_1_2': 'gohan_adult_ssj_sheet', 'gohan_ultimate': 'gohan_adult_ssj_sheet',
    'trunks_base': 'trunks_kid_base_sheet', 'kid_trunks_super_saiyan': 'trunks_kid_ssj_sheet',
    'future_trunks_base': 'trunks_future_base_sheet', 'future_trunks_super_saiyan': 'trunks_future_ssj_sheet',
    'goten_base': 'goten_base_sheet', 'goten_super_saiyan': 'goten_ssj_sheet',
    'gotenks_super_saiyan': 'gotenks_ssj_sheet', 'gotenks_super_saiyan_3': 'gotenks_ssj3_sheet',
    'piccolo_base': 'piccolo_sheet', 'krillin_base': 'krillin_sheet', 'frieza_base': 'frieza_sheet',
    'cell_imperfect_form': 'cell_form_first_sheet', 'cell_semi_perfect_form': 'cell_form_second_sheet',
    'cell_perfect': 'cell_form_final_sheet', 'cell_jr_base': 'cell_junior_sheet',
    'android_16_base': 'c16_sheet', 'android_17_base': 'c17_sheet',
    'android_18_base': 'c18_sheet', 'android_19_base': 'c19_sheet', 'android_20_base': 'c20_sheet',
    'ginyu_base': 'ginyu_sheet', 'ginyu_gokus_body': 'ginyu_body_goku_sheet',
    'recoome_base': 'recoome_sheet', 'guldo_base': 'guldo_sheet',
    'jeice_base': 'jeice_sheet', 'burter_base': 'burter_sheet', 'nappa_base': 'nappa_sheet',
    'buu_base': 'buu_fat_sheet', 'super_buu_base': 'buu_super_base_sheet',
    'buu_gotenks_absorbed': 'buu_super_gotenks_sheet', 'buu_gohan_absorbed': 'buu_super_gohan_sheet',
    'kid_buu_base': 'buu_kid_sheet', 'vegito_ssj': 'vegito_sheet',
}

# ── forma proyecto → forma canon ─────────────────────────────
FORM_TO_CANON = {
    'goku_base': 'goku_base', 'goku_ssj': 'goku_super_saiyan',
    'goku_ssj2': 'goku_super_saiyan_2', 'goku_ssj3': 'goku_super_saiyan_3',
    'vegeta_base': 'vegeta_base', 'vegeta_ssj': 'vegeta_super_saiyan_majin',
    'vegeta_majin': 'vegeta_super_saiyan_majin',
    'gohan_young': 'young_gohan_base', 'gohan_young_ssj': 'young_gohan_super_saiyan',
    'gohan_young_ssj2': 'young_gohan_super_saiyan_2',
    'gohan_adult_ssj': 'gohan_super_saiyan_1_2', 'gohan_adult_ssj2': 'gohan_super_saiyan_1_2',
    'gohan_adult_ultimate': 'gohan_ultimate',
    'trunks_kid': 'trunks_base', 'trunks_kid_ssj': 'kid_trunks_super_saiyan',
    'trunks_future': 'future_trunks_base', 'trunks_ssj': 'future_trunks_super_saiyan',
    'goten_base': 'goten_base', 'goten_ssj': 'goten_super_saiyan',
    'gotenks_ssj': 'gotenks_super_saiyan', 'gotenks_ssj3': 'gotenks_super_saiyan_3',
    'piccolo_base': 'piccolo_base', 'piccolo_kami': 'piccolo_base', 'piccolo_evil': 'piccolo_base',
    'krillin_base': 'krillin_base', 'frieza_final': 'frieza_base',
    'cell_imperfect': 'cell_imperfect_form', 'cell_semi': 'cell_semi_perfect_form',
    'cell_perfect': 'cell_perfect', 'cell_jr': 'cell_jr_base',
    'android_16': 'android_16_base', 'android_17': 'android_17_base',
    'android_18': 'android_18_base', 'android_19': 'android_19_base', 'android_20': 'android_20_base',
    'ginyu': 'ginyu_base', 'ginyu_goku': 'ginyu_gokus_body',
    'recoome': 'recoome_base', 'guldo': 'guldo_base', 'jeice': 'jeice_base',
    'burter': 'burter_base', 'nappa': 'nappa_base',
    'buu_base': 'buu_base', 'buu_super': 'super_buu_base',
    'buu_gotenks': 'buu_gotenks_absorbed', 'buu_gohan': 'buu_gohan_absorbed',
    'buu_kid': 'kid_buu_base', 'vegito_ssj': 'vegito_ssj',
}

# ── sheet OUT preferido por forma (para las formas sin canon propio) ──
# forma → (canon_pose_source, sheet_out): usa el canon de canon_pose_source
# pero busca los frames en sheet_out (misma estructura de poses).
FORM_SHEET_OVERRIDE = {
}

# ── formas SIN canon que usan mapeo POSICIONAL (mismo layout de sheet) ──
# El sheet GBC tiene poses en posiciones fijas (fila 1 idle, fila 3 guard,
# fila 5 attack_fwd...). Para formas sin frame_manifest propio (SSJ2) se
# aplica el mapeo ordinal del canon hermano al sheet de la forma.
# Formato: (canon_pose_source, sheet_out, offset_ordinal)
POSITIONAL_OVERRIDE = {
    # SSJ2: mismo layout que SSJ pero siluetas distintas (más aura)
    'goku_ssj2': ('goku_super_saiyan', 'goku_ssj2_sheet', 0),
    # Ginyu en cuerpo de Goku: sin canon propio; el sheet ginyu_body_goku
    # tiene layout = goku_base + fila extra de 5 al inicio → offset ordinal +5
    # (idle = ordinal 5 = 007.png, cabeza de Ginyu).
    'ginyu_goku': ('goku_base', 'ginyu_body_goku_sheet', 5),
}

# ── poses del manifest y sus metadatos ───────────────────────
POSE_META = {
    'idle': {'fps': 3, 'loop': True},
    'move_front': {'fps': 6, 'loop': True},
    'move_back': {'fps': 6, 'loop': True},
    'guard': {'fps': 6, 'loop': False},
    'attack_fwd': {'fps': 7, 'loop': False},
    'attack_ud': {'fps': 7, 'loop': False},
    'hurt': {'fps': 6, 'loop': False},
    'beam_charge': {'fps': 7, 'loop': False},
    'beam_fire': {'fps': 7, 'loop': False},
    'gather_power': {'fps': 6, 'loop': False},
    'power_up': {'fps': 8, 'loop': True},
    'punch_right': {'fps': 8, 'loop': False},
    'punch_left': {'fps': 8, 'loop': False},
    'kick_right': {'fps': 8, 'loop': False},
    'knockback_back': {'fps': 6, 'loop': False},
    'knockback_up': {'fps': 6, 'loop': False},
    'knockback_down': {'fps': 6, 'loop': False},
    'beam_guard': {'fps': 6, 'loop': False},
    'evade': {'fps': 6, 'loop': False},
    'aura_power': {'fps': 6, 'loop': True},
    'aura_support': {'fps': 6, 'loop': True},
    'effects': {'fps': 6, 'loop': False},
}

# fallbacks runtime (de src/battle/spriteConfig.ts POSE_FALLBACKS)
POSE_FALLBACKS = {
    'punch_right': ['attack_fwd', 'idle'],
    'punch_left': ['attack_fwd', 'idle'],
    'kick_right': ['attack_ud', 'attack_fwd', 'idle'],
    'knockback_back': ['hurt', 'idle'],
    'knockback_up': ['hurt', 'idle'],
    'knockback_down': ['hurt', 'idle'],
    'beam_guard': ['guard', 'beam_charge', 'idle'],
    'gather_power': ['beam_charge', 'guard', 'idle'],
    'power_up': ['gather_power', 'beam_charge', 'guard', 'idle'],
    'move_back': ['move_front', 'attack_fwd', 'idle'],
    # beams sin físico en el canon → alias de la pose base (como en HEAD)
    'beam_fire': ['beam_charge', 'gather_power', 'idle'],
    'beam_charge': ['gather_power', 'guard', 'idle'],
}

# poses que se copian DIRECTAS del canon (no compuestas)
DIRECT_POSES = ['idle', 'move_front', 'move_back', 'guard', 'attack_fwd',
                'attack_ud', 'hurt', 'beam_charge', 'beam_fire', 'evade',
                'gather_power', 'power_up', 'aura_power', 'aura_support']


def shape_sig(im):
    """Hash del sprite: píxeles visibles con posición relativa Y color RGBA
    exacto. La silueta sola NO basta (Ginyu en cuerpo de Goku tiene la misma
    silueta que Goku — solo cambia la cara); el color desambigua."""
    a = np.array(im.convert('RGBA'))
    mask = a[..., 3] > 0
    if not mask.any():
        return None
    ys, xs = np.where(mask)
    x0, y0 = int(xs.min()), int(ys.min())
    pts = frozenset(
        (int(x - x0), int(y - y0), int(a[y, x, 0]), int(a[y, x, 1]), int(a[y, x, 2]), int(a[y, x, 3]))
        for x, y in zip(xs, ys))
    return hashlib.md5(repr(sorted(pts)).encode()).hexdigest()


def load_out_index(sheet_filter=None):
    """Índice de OUT_frames: shape_hash → [(sheet, path, meta)]"""
    man = json.load(open(OUT / 'manifest.json'))
    idx = {}
    for sheet, v in man.items():
        if sheet_filter and sheet not in sheet_filter:
            continue
        for f in v['frames']:
            p = OUT / f['path']
            if not p.exists():
                continue
            try:
                h = shape_sig(Image.open(p))
            except Exception:
                continue
            if h:
                idx.setdefault(h, []).append((sheet, p, f))
    return idx


def main():
    dry = '--dry-run' in sys.argv
    out_idx = load_out_index(None)
    print(f"OUT_frames index: {len(out_idx)} siluetas únicas")

    total_ok = 0
    for form, canon_form in FORM_TO_CANON.items():
        ov = FORM_SHEET_OVERRIDE.get(form)
        pov = POSITIONAL_OVERRIDE.get(form)
        if pov:
            canon_pose_source, sheet_out = pov[0], pov[1]
            offset = pov[2] if len(pov) > 2 else 0
            fm_path = V9 / canon_pose_source / 'frame_manifest.json'
            idx = load_out_index({sheet_out})
            # modo posicional: mapear por índice ORDINAL (mismo layout de sheet)
            out_man = json.load(open(OUT / 'manifest.json'))
            sheet_chars = sorted(
                [f for f in out_man[sheet_out]['frames'] if f['class'] == 'character'],
                key=lambda f: (f['y'], f['x']))
            canon_chars = sorted(
                [f for f in json.load(open(fm_path))['frames']
                 if f.get('source', {}).get('x') not in (None, '')],
                key=lambda f: (int(f['source']['y']), int(f['source']['x'])))
            # mapa pose → índice ordinal (posición en el orden canon_chars)
            pose_idxs = {}
            for ci, cf in enumerate(canon_chars):
                for pose in cf.get('runtimePoses', []):
                    if pose in DIRECT_POSES:
                        pose_idxs.setdefault(pose, set()).add(ci)
            # aplicar al sheet: índice ordinal (+ offset) → frame del sheet
            pose_out = {}
            for pose, idxs in pose_idxs.items():
                for i in sorted(idxs):
                    j = i + offset
                    if j < len(sheet_chars):
                        p = OUT / sheet_chars[j]['path']
                        pose_out.setdefault(pose, []).append(p)
            # auras support: los frames del canon no tienen coords source (son
            # derivados del sheet) → tomarlos directos del sheet OUT
            for pose, cls in (('aura_support', 'aura_support'), ('aura_power', 'aura_power')):
                if pose in pose_out and pose_out[pose]:
                    continue
                sup = sorted(
                    [OUT / f['path'] for f in out_man[sheet_out]['frames']
                     if f.get('class') == cls],
                    key=lambda p: p.name)
                if sup:
                    pose_out[pose] = sup
            # saltar la sección de silueta
            manifest = {}
            for pose, paths in pose_out.items():
                frames_meta = []
                for i, p in enumerate(sorted(paths, key=lambda x: x.name)):
                    w, h = Image.open(p).size
                    frames_meta.append({'name': f'{form}_{pose}_{i:02d}',
                                        'file': f'{form}_{pose}_{i:02d}.png',
                                        'w': w, 'h': h})
                manifest[pose] = {'frame_count': len(frames_meta),
                                  'fps': POSE_META.get(pose, {}).get('fps', 6),
                                  'loop': POSE_META.get(pose, {}).get('loop', False),
                                  'frames': frames_meta}
            for pose, fb in POSE_FALLBACKS.items():
                if pose in manifest and manifest[pose]['frame_count'] > 0:
                    continue
                for src_pose in fb:
                    if src_pose in manifest and manifest[src_pose]['frame_count'] > 0:
                        manifest[pose] = manifest[src_pose]
                        break
            target = SPRITES / form
            if dry:
                n = sum(len(v['frames']) for v in manifest.values())
                print(f"{form}: {n} frames en {len(manifest)} poses (posicional)")
                total_ok += n
                continue
            target.mkdir(parents=True, exist_ok=True)
            for f in list(target.glob('*.png')) + [target / 'manifest.json']:
                if f.exists():
                    f.unlink()
            for pose, frames_meta in manifest.items():
                if pose not in pose_out:
                    continue
                for i, fm_ in enumerate(frames_meta['frames']):
                    if i >= len(pose_out[pose]):
                        break
                    shutil.copyfile(pose_out[pose][i], target / fm_['file'])
            (target / 'manifest.json').write_text(
                json.dumps(manifest, indent=2) + '\n')
            n = sum(len(v['frames']) for v in manifest.values())
            print(f"{form}: {n} frames en {len(manifest)} poses ✓ (posicional)")
            total_ok += n
            continue
        if ov:
            canon_pose_source, sheet_out = ov
            fm_path = V9 / canon_pose_source / 'frame_manifest.json'
            # índice restringido al sheet override
            idx = load_out_index({sheet_out})
        else:
            fm_path = V9 / canon_form / 'frame_manifest.json'
            idx = out_idx
        if not fm_path.exists():
            print(f"⚠ {form}: canon {canon_form} sin frame_manifest")
            continue
        fm = json.load(open(fm_path))
        atomic_dir = V9 / canon_form / 'atomic'
        if ov:
            atomic_dir = V9 / canon_pose_source / 'atomic'
        out_man = json.load(open(OUT / 'manifest.json'))

        # construir pose → frames (del canon)
        pose_frames = {}  # pose → [path canon atomic]
        for cf in fm['frames']:
            poses = cf.get('runtimePoses') or []
            src_id = cf.get('sourceId', '')
            # el archivo atomic: basename de sourceId (001.png) o canonicalId
            fn = os.path.basename(src_id) if src_id else ''
            atomic_p = atomic_dir / fn if fn else None
            if atomic_p and atomic_p.exists():
                for pose in poses:
                    pose_frames.setdefault(pose, []).append(atomic_p)

        # localizar en OUT_frames por silueta
        # Cada frame del canon (atomic) se mapea a UN OUT frame; ese OUT alimenta
        # TODAS las poses que el canon declara para el frame (p.ej. 038.png tiene
        # beam_charge+beam_fire — un `used` global por OUT rompía la segunda pose
        # y perdía frames de beam). El `used` solo evita que DOS atomic distintos
        # mapeen al mismo OUT frame.
        pose_out = {}  # pose → [path OUT]
        used_out = set()
        # sheet preferido para esta forma (evita coger frames de otros personajes
        # con siluetas idénticas — p.ej. ginyu_body_goku vs goku_base)
        pref_sheet = CANON_TO_SHEET.get(canon_form, canon_form + '_sheet')
        # atomic → OUT path (resuelto una sola vez por frame canon)
        atomic_out = {}  # Path(atomic) → Path(OUT)
        for pose in DIRECT_POSES:
            if pose not in pose_frames:
                continue
            for ap in pose_frames[pose]:
                if ap in atomic_out:
                    continue
                h = shape_sig(Image.open(ap))
                if not h:
                    continue
                cands = idx.get(h, [])
                best = None
                for sheet, p, f in cands:
                    if p in used_out:
                        continue
                    if sheet == pref_sheet:
                        best = (sheet, p, f)
                        break
                if best is None:
                    for sheet, p, f in cands:
                        if p in used_out:
                            continue
                        best = (sheet, p, f)
                        break
                if best:
                    atomic_out[ap] = best[1]
                    used_out.add(best[1])
        for pose in DIRECT_POSES:
            if pose not in pose_frames:
                continue
            for ap in pose_frames[pose]:
                if ap in atomic_out:
                    pose_out.setdefault(pose, []).append(atomic_out[ap])

        # auras support/power: si el canon no localiza sus frames en OUT (los
        # atomic del canon pueden tener otra silueta), tomarlos directos del
        # sheet OUT preferido — los auras del sheet son los oficiales.
        for pose, cls in (('aura_support', 'aura_support'), ('aura_power', 'aura_power')):
            if pose in pose_out and pose_out[pose]:
                continue
            sheet_man = out_man.get(pref_sheet)
            if not sheet_man:
                continue
            sup = sorted(
                [OUT / f['path'] for f in sheet_man['frames']
                 if f.get('class') == cls],
                key=lambda p: p.name)
            if sup:
                pose_out[pose] = sup

        # poses compuestas (fallbacks)
        manifest = {}
        for pose, paths in pose_out.items():
            frames_meta = []
            for i, p in enumerate(sorted(paths, key=lambda x: x.name)):
                w, h = Image.open(p).size
                frames_meta.append({
                    'name': f'{form}_{pose}_{i:02d}',
                    'file': f'{form}_{pose}_{i:02d}.png',
                    'w': w, 'h': h,
                })
            manifest[pose] = {
                'frame_count': len(frames_meta),
                'fps': POSE_META.get(pose, {}).get('fps', 6),
                'loop': POSE_META.get(pose, {}).get('loop', False),
                'frames': frames_meta,
            }

        # poses requeridas que faltan → fallback
        for pose, fb in POSE_FALLBACKS.items():
            if pose in manifest and manifest[pose]['frame_count'] > 0:
                continue
            for src_pose in fb:
                if src_pose in manifest and manifest[src_pose]['frame_count'] > 0:
                    manifest[pose] = manifest[src_pose]
                    break

        # guardar
        target = SPRITES / form
        if dry:
            n = sum(len(v['frames']) for v in manifest.values())
            print(f"{form}: {n} frames en {len(manifest)} poses")
            total_ok += n
            continue

        target.mkdir(parents=True, exist_ok=True)
        # limpiar PNGs y manifest antiguos
        for f in list(target.glob('*.png')) + [target / 'manifest.json']:
            if f.exists():
                f.unlink()
        # copiar
        pose_src = {p: p for p in pose_out}  # pose → pose origen de los paths
        for pose, fb in POSE_FALLBACKS.items():
            if pose in manifest and pose not in pose_out:
                # encontrar la pose base que alimenta el fallback
                for src_pose in fb:
                    if src_pose in pose_out:
                        pose_src[pose] = src_pose
                        break
        for pose, frames_meta in manifest.items():
            src_pose = pose_src.get(pose, pose)
            if src_pose not in pose_out:
                continue
            paths = pose_out[src_pose]
            for i, fm_ in enumerate(frames_meta['frames']):
                if i >= len(paths):
                    break
                src = paths[i]
                dst = target / fm_['file']
                shutil.copyfile(src, dst)
        (target / 'manifest.json').write_text(
            json.dumps(manifest, indent=2) + '\n')
        n = sum(len(v['frames']) for v in manifest.values())
        print(f"{form}: {n} frames en {len(manifest)} poses ✓")
        total_ok += n

    print(f"\nTotal frames oxidizados: {total_ok}")


if __name__ == '__main__':
    main()
