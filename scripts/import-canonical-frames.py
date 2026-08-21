#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════
# import-canonical-frames.py — INTEGRADOR DEL ZIP CANÓNICO DEFINITIVO
# ─────────────────────────────────────────────────────────────────────────
# Fuente: Canonical_Frames_Official/ (45 carpetas, 2063 frames en
# manifest.csv + 3 auras azules sueltas por personaje).
#
# Establece public/assets/sprites/<dir>/ desde el zip:
#   · UN manifest POR DIR (SPRITE_DIRS): las formas que comparten dir
#     (vegeta_ssj/vegeta_majin, piccolo_base/kami/evil…) usan el MISMO
#     manifest — sin duplicar archivos en disco
#   · poses asignadas desde el canon catalog-v9 (frame_manifest.json) por
#     shape_sig (silueta+color normalizado por bbox → inmune al recorte)
#     con fallback de tamaño (±3px)
#   · pose aura_support añadida SIEMPRE desde los 3 archivos
#     <folder>_aura_support_00..02.png (el usuario: "solo faltaría en el
#     manifest los frames de aura azul de cada character")
#   · manifest.json con fps/loop de POSE_META + POSE_FALLBACKS runtime
#   · PNGs renombrados <dir>_<pose>_NN.png (parseFrameName compatible)
#
# Uso: python3 scripts/import-canonical-frames.py [--dry-run]
# ═══════════════════════════════════════════════════════════════════════
import csv, hashlib, json, os, re, shutil, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP = os.path.join(
    os.path.dirname(ROOT),  # workspace
    '.openclaw', 'tmp', 'canonical_frames_official', 'Canonical_Frames_Official')
V9 = os.path.join(ROOT, 'sprites-source', 'catalog-v9', 'forms_by_runtime')
SPRITES = os.path.join(ROOT, 'public', 'assets', 'sprites')

# ═══ Poses y metadatos (mismos que oxidize-sprites.py) ═══
POSE_META = {
    'idle': {'fps': 3, 'loop': True}, 'move_front': {'fps': 6, 'loop': True},
    'move_back': {'fps': 6, 'loop': True}, 'guard': {'fps': 6, 'loop': False},
    'attack_fwd': {'fps': 7, 'loop': False}, 'attack_ud': {'fps': 7, 'loop': False},
    'hurt': {'fps': 6, 'loop': False}, 'beam_charge': {'fps': 7, 'loop': False},
    'beam_fire': {'fps': 7, 'loop': False}, 'gather_power': {'fps': 6, 'loop': False},
    'power_up': {'fps': 8, 'loop': True}, 'punch_right': {'fps': 8, 'loop': False},
    'punch_left': {'fps': 8, 'loop': False}, 'kick_right': {'fps': 8, 'loop': False},
    'knockback_back': {'fps': 6, 'loop': False}, 'knockback_up': {'fps': 6, 'loop': False},
    'knockback_down': {'fps': 6, 'loop': False}, 'beam_guard': {'fps': 6, 'loop': False},
    'evade': {'fps': 6, 'loop': False}, 'aura_power': {'fps': 6, 'loop': True},
    'aura_support': {'fps': 6, 'loop': True}, 'effects': {'fps': 6, 'loop': False},
}
POSE_FALLBACKS = {
    'punch_right': ['attack_fwd', 'idle'], 'punch_left': ['attack_fwd', 'idle'],
    'kick_right': ['attack_ud', 'attack_fwd', 'idle'],
    'knockback_back': ['hurt', 'idle'], 'knockback_up': ['hurt', 'idle'],
    'knockback_down': ['hurt', 'idle'], 'beam_guard': ['guard', 'beam_charge', 'idle'],
    'gather_power': ['beam_charge', 'guard', 'idle'],
    'power_up': ['gather_power', 'beam_charge', 'guard', 'idle'],
    'move_back': ['move_front', 'attack_fwd', 'idle'],
    'beam_fire': ['beam_charge', 'gather_power', 'idle'],
    'beam_charge': ['gather_power', 'guard', 'idle'],
    'aura_power': ['aura_support', 'gather_power', 'beam_charge', 'guard', 'idle'],
}
DIRECT_POSES = ['idle', 'move_front', 'move_back', 'guard', 'attack_fwd',
                'attack_ud', 'hurt', 'beam_charge', 'beam_fire', 'evade',
                'gather_power', 'power_up', 'aura_power', 'aura_support']

# ═══ Canon por forma proyecto (mismo mapa que oxidize) ═══
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

# folder del zip → dir(es) del proyecto (SPRITE_DIRS real: dirs únicos).
# El PRIMER dir de cada lista es el canónico (genera el manifest); el resto
# comparten dir físico (ya mapeado por spriteDirFor).
FOLDER_TO_DIRS = {
    'goku_base': ['goku_base'], 'goku_ssj': ['goku_ssj'], 'goku_ssj2': ['goku_ssj2'], 'goku_ssj3': ['goku_ssj3'],
    'vegeta_base': ['vegeta_base'], 'vegeta_ssj': ['vegeta_ssj'],  # + vegeta_majin (mismo dir)
    'gohan_kid_base': ['gohan_young'], 'gohan_kid_ssj': ['gohan_young_ssj'], 'gohan_kid_ssj2': ['gohan_young_ssj2'],
    'gohan_adult_base': ['gohan_adult_ultimate'],
    'gohan_adult_ssj': ['gohan_adult_ssj'],  # + gohan_adult_ssj2 (mismo dir)
    'trunks_kid_base': ['trunks_kid'], 'trunks_kid_ssj': ['trunks_kid_ssj'],
    'trunks_future_base': ['trunks_future'], 'trunks_future_ssj': ['trunks_ssj'],
    'goten_base': ['goten_base'], 'goten_ssj': ['goten_ssj'],
    'gotenks_ssj': ['gotenks_ssj'], 'gotenks_ssj3': ['gotenks_ssj3'],
    'piccolo': ['piccolo_base'],  # + piccolo_kami/evil (mismo dir)
    'krillin': ['krillin_base'], 'frieza': ['frieza_final'],
    'cell_form_first': ['cell_imperfect'], 'cell_form_second': ['cell_semi'],
    'cell_form_final': ['cell_perfect'], 'cell_junior': ['cell_jr'],
    'c16': ['android_16'], 'c17': ['android_17'], 'c18': ['android_18'],
    'c19': ['android_19'], 'c20': ['android_20'],
    'ginyu': ['ginyu'], 'ginyu_body_goku': ['ginyu_goku'],
    'recoome': ['recoome'], 'guldo': ['guldo'], 'jeice': ['jeice'],
    'burter': ['burter'], 'nappa': ['nappa'],
    'buu_fat': ['buu_base'], 'buu_super_base': ['buu_super'],
    'buu_super_gotenks': ['buu_gotenks'], 'buu_super_gohan': ['buu_gohan'],
    'buu_kid': ['buu_kid'], 'vegito': ['vegito_ssj'],
}

# formas sin canon propio que usan el canon de su cuerpo (mismas poses):
# ginyu_goku → goku_base (cuerpo de Goku), resuelto por silueta/tamaño
# sobre su folder (ginyu_body_goku). goku_ssj2 no tiene frame_manifest en
# catalog-v9 (solo named/fixed_only) → usa el canon de SSJ (mismo layout
# de sheet, siluetas cercanas; el matcher por tamaño desambigua).
FORM_TO_CANON['ginyu_goku'] = 'goku_base'
FORM_TO_CANON['goku_ssj2'] = 'goku_super_saiyan'

_SIG_CACHE = {}
_IMG_CACHE = {}


def shape_sig(im):
    key = ('exact', im.size, im.tobytes())
    if key in _SIG_CACHE:
        return _SIG_CACHE[key]
    a = np.array(im.convert('RGBA'))
    mask = a[..., 3] > 0
    if not mask.any():
        _SIG_CACHE[key] = None
        return None
    ys, xs = np.where(mask)
    x0, y0 = int(xs.min()), int(ys.min())
    pts = frozenset(
        (int(x - x0), int(y - y0), int(a[y, x, 0]), int(a[y, x, 1]), int(a[y, x, 2]), int(a[y, x, 3]))
        for x, y in zip(xs, ys))
    h = hashlib.md5(repr(sorted(pts)).encode()).hexdigest()
    _SIG_CACHE[key] = h
    return h


def shape_sig_approx(im, size=16):
    key = ('approx', size, im.size, im.tobytes())
    if key in _SIG_CACHE:
        return _SIG_CACHE[key]
    a = np.array(im.convert('RGBA'))
    mask = (a[..., 3] > 0).astype(np.uint8)
    if not mask.any():
        _SIG_CACHE[key] = None
        return None
    m = Image.fromarray(mask * 255).resize((size, size), Image.NEAREST)
    h = hashlib.md5(m.tobytes()).hexdigest()
    _SIG_CACHE[key] = h
    return h


def load_zip_index():
    """folder → {source_frame_num: [(frame_file, w, h)]}."""
    idx = {}
    with open(os.path.join(ZIP, 'manifest.csv')) as f:
        for r in csv.DictReader(f):
            mm = re.search(r'(\d+)', r['source_frame'])
            if not mm:
                continue
            n = int(mm.group(1))
            idx.setdefault(r['folder'], {}).setdefault(n, []).append(
                (r['frame'], int(r['w']), int(r['h'])))
    return idx


def folder_files(folder):
    """Todos los PNG del folder: {file: (w, h)} (manifest.csv + auras sueltas)."""
    files = {}
    entries = ZIP_INDEX.get(folder, {})
    for n, lst in entries.items():
        for (f, w, h) in lst:
            files[f] = (w, h)
    d = os.path.join(ZIP, folder)
    if os.path.isdir(d):
        for f in os.listdir(d):
            if f.endswith('.png') and f not in files:
                p = os.path.join(d, f)
                try:
                    files[f] = Image.open(p).size
                except Exception:
                    continue
    return files


def canon_pose_frames(canon_form):
    """canon → [(source_num, atomic_path, [poses directas])]."""
    fm_path = os.path.join(V9, canon_form, 'frame_manifest.json')
    if not os.path.exists(fm_path):
        return None
    fm = json.load(open(fm_path))
    atomic_dir = os.path.join(V9, canon_form, 'atomic')
    out = []
    for cf in fm['frames']:
        mm = re.search(r'/(\d+)\.png', cf.get('sourceId', ''))
        if not mm:
            continue
        n = int(mm.group(1))
        ap = os.path.join(atomic_dir, f'{n:03d}.png')
        if not os.path.exists(ap):
            continue
        poses = [p for p in (cf.get('runtimePoses') or []) if p in DIRECT_POSES]
        if poses:
            out.append((n, ap, poses))
    return out


def match_frame(ap, folder, used, tol=3):
    """Encuentra el frame del zip (folder) que corresponde a un atomic del
    canon. Prioridad: shape_sig exacto → aproximado+tamaño → tamaño."""
    files = FOLDER_FILES[folder]
    aim = _IMG_CACHE.get(ap) or Image.open(ap)
    _IMG_CACHE[ap] = aim
    h_exact = shape_sig(aim)
    h_approx = shape_sig_approx(aim)
    w, h = aim.size
    for f, (fw, fh) in files.items():
        if f in used:
            continue
        p = os.path.join(ZIP, folder, f)
        if not os.path.exists(p):
            continue
        if h_exact and shape_sig(Image.open(p)) == h_exact:
            return f, fw, fh
    for f, (fw, fh) in files.items():
        if f in used:
            continue
        if abs(fw - w) <= tol and abs(fh - h) <= tol:
            p = os.path.join(ZIP, folder, f)
            if not os.path.exists(p):
                continue
            if h_approx and shape_sig_approx(Image.open(p)) == h_approx:
                return f, fw, fh
    for f, (fw, fh) in files.items():
        if f in used:
            continue
        if abs(fw - w) <= tol and abs(fh - h) <= tol:
            return f, fw, fh
    return None, None, None


def build_dir(folder, dirname, canon_form, dry):
    """Manifest de un DIR desde el folder del zip (nombres <dir>_<pose>_NN).
    pose_frames: pose → [(rel_path_zip, w, h)] donde rel es relativo a ZIP."""
    files = folder_files(folder)
    FOLDER_FILES[folder] = files
    pose_frames = {}
    used = set()

    pov = None  # ya no hay mapeo posicional: todo por silueta/tamaño
    canon_list = canon_pose_frames(canon_form)
    if canon_list is None:
        print(f"⚠ {dirname}: canon {canon_form} sin frame_manifest")
        return None
    for n, ap, poses in sorted(canon_list, key=lambda x: x[0]):
        f, w, h = match_frame(ap, folder, used)
        if not f:
            continue
        used.add(f)
        for pose in poses:
            pose_frames.setdefault(pose, []).append(
                (os.path.join(folder, f), w, h))

    # aura_support SIEMPRE desde los 3 archivos sueltos. Las auras de un
    # personaje se llaman <sheet>_aura_support_*; pueden vivir en el folder
    # del propio sheet O en un folder hermano (ginyu_body_goku_aura_support_*
    # está dentro de ginyu/). Buscar por prefijo del sheet en todos los folders.
    prefix = folder + '_aura_support'
    auras = []
    for folder_candidate in sorted(FOLDER_FILES):
        for f in FOLDER_FILES[folder_candidate]:
            if f.startswith(prefix) and f.endswith('.png'):
                w, h = FOLDER_FILES[folder_candidate][f]
                auras.append((os.path.join(folder_candidate, f), w, h))
    if not auras:
        # fallback: auras del propio folder con 'aura_support'
        for f in sorted(files):
            if 'aura_support' in f:
                auras.append((os.path.join(folder, f), files[f][0], files[f][1]))
    if auras:
        pose_frames['aura_support'] = sorted(auras)

    for pose in pose_frames:
        seen = set()
        uniq = []
        for fr in pose_frames[pose]:
            if fr[0] in seen:
                continue
            seen.add(fr[0])
            uniq.append(fr)
        pose_frames[pose] = sorted(uniq, key=lambda x: x[0])

    manifest = {}
    # El nombre de archivo se asigna UNA vez por frame fuente (la primera pose
    # en DIRECT_POSES que lo usa). Todas las poses referencian ESE nombre.
    new_name = {}
    for pose in DIRECT_POSES:
        for i, (rel, w, h) in enumerate(pose_frames.get(pose, [])):
            if rel not in new_name:
                new_name[rel] = f'{dirname}_{pose}_{i:02d}.png'
    for pose in DIRECT_POSES:
        frames_meta = []
        for rel, w, h in pose_frames.get(pose, []):
            fname = new_name[rel]
            frames_meta.append({'name': fname.replace('.png', ''),
                                'file': fname,
                                'w': w, 'h': h})
        if frames_meta:
            manifest[pose] = {'frame_count': len(frames_meta),
                              'fps': POSE_META.get(pose, {}).get('fps', 6),
                              'loop': POSE_META.get(pose, {}).get('loop', False),
                              'frames': frames_meta}
    for pose, fb in POSE_FALLBACKS.items():
        if pose in manifest and manifest[pose]['frame_count'] > 0:
            continue
        for src_pose in fb:
            if src_pose in manifest and manifest[src_pose]['frame_count'] > 0:
                manifest[pose] = json.loads(json.dumps(manifest[src_pose]))
                break

    return manifest, pose_frames, new_name


def write_dir(folder, dirname, manifest, pose_frames, new_name, dry):
    target = os.path.join(SPRITES, dirname)
    n = sum(len(v['frames']) for v in manifest.values())
    if dry:
        print(f"{dirname}: {n} frames en {len(manifest)} poses (de {folder})")
        return
    os.makedirs(target, exist_ok=True)
    for f in list(os.scandir(target)):
        if f.name.endswith('.png') or f.name == 'manifest.json':
            os.unlink(f.path)
    for rel, fname in new_name.items():
        src = os.path.join(ZIP, rel)
        if os.path.exists(src):
            shutil.copyfile(src, os.path.join(target, fname))
    with open(os.path.join(target, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')
    print(f"{dirname}: {n} frames en {len(manifest)} poses ✓ (de {folder})")


def main():
    global ZIP_INDEX, FOLDER_FILES
    dry = '--dry-run' in sys.argv
    ZIP_INDEX = load_zip_index()
    FOLDER_FILES = {}
    total = 0
    for folder, dirs in sorted(FOLDER_TO_DIRS.items()):
        dirname = dirs[0]  # dir canónico del folder
        canon_form = FORM_TO_CANON[dirname]
        res = build_dir(folder, dirname, canon_form, dry)
        if res is None:
            continue
        manifest, pose_frames, new_name = res
        n = sum(len(v['frames']) for v in manifest.values())
        total += n
        write_dir(folder, dirname, manifest, pose_frames, new_name, dry)
    print(f"\nTOTAL: {total} frames en {len(FOLDER_TO_DIRS)} dirs (dry={'yes' if dry else 'no'})")


if __name__ == '__main__':
    main()
