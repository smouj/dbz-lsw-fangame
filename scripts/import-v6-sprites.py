#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════
# DBZ LSW — Importador V6 CANONICAL → sprites del juego
#
# V6 CANONICAL es la fuente de verdad de PÍXELES (cortes corregidos,
# formas reasignadas, componentes de gameplay recuperados), pero NO lleva
# etiquetas de pose. Las ETIQUETAS de pose (idle/move/guard/attack/hurt/
# beam) provienen del zip FIXED (`00_manifest/animations.json`).
#
# PUENTE: para cada frame pose del FIXED se calcula una firma de píxeles
# (por FORMA, ignorando color — tolera el dithering de los GIF de V6 y la
# deriva de paleta) y se busca su homólogo en V6 (mismo personaje). Si
# coincide, se usa el PNG corregido de V6. Si no (cortes rehechos), se
# conserva el PNG del FIXED (ya correcto).
#
# Esquema de poses (AUTORITATIVO, igual que import-fixed-sprites.mjs):
#   idle, move_right, move_left, guard, attack_fwd, attack_ud, hurt,
#   beam_charge, beam_fire
#
# Tres fuentes de forma, cubriendo los 44 directorios del juego:
#   1. 40 formas puenteadas V6 ↔ FIXED.
#   2.  2 formas que V6 SÍ tiene y FIXED copiaba (future_trunks_super_saiyan,
#        vegito_base): se puentean contra la animación FIXED PRESTADA
#        (future_trunks/base y goku/super_saiyan) — mismas poses, otros
#        píxeles (pelo dorado real de SSJ).
#   3.  2 formas que V6 ELIMINÓ (goku_super_saiyan_2, ginyu_gokus_body):
#        se importan DIRECTAMENTE del FIXED (que sí tiene animación real).
#
# Los componentes "recovered" de V6 (sin old_refs) se exportan a
# public/assets/sprites/effects/<dir>/ como set de efectos (proyectiles
# de beam, impactos, auras) para consumo por id de ataque.
#
# Uso: python3 scripts/import-v6-sprites.py /abs/FIXED.zip /abs/v6root
# ═══════════════════════════════════════════════════════════
import csv
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
from collections import defaultdict

from PIL import Image

# Fondo de las hojas fuente del FIXED. Hay TRES colores de fondo distintos
# según la hoja: cian (0,183,239), verde claro (211,249,188) y cian puro
# (0,255,255). Eliminar los tres es clave para casar formas "de color"
# (Buu, Cell, SSJ…) que antes quedaban a 0%.
BG = ((0, 183, 239), (211, 249, 188), (0, 255, 255))

FIXED_ZIP = sys.argv[1]
V6_ROOT = sys.argv[2]
REPO = os.getcwd()
OUT_ROOT = os.path.join(REPO, "public/assets/sprites")

# ── Mapeos ─────────────────────────────────────────────────
# V6 (character, form) → directorio del juego (spriteManifest.ts)
V6_TO_DIR = {
    ("android_16", "base"): "android_16_base",
    ("android_17", "base"): "android_17_base",
    ("android_18", "base"): "android_18_base",
    ("android_19", "base"): "android_19_base",
    ("android_20", "base"): "android_20_base",
    ("captain_ginyu", "base"): "ginyu_base",
    ("cell", "cell_form_1"): "cell_imperfect_form",
    ("cell", "cell_form_2"): "cell_semi_perfect_form",
    ("cell", "perfect_cell"): "cell_perfect",
    ("cell_jr", "base"): "cell_jr_base",
    ("frieza", "base"): "frieza_base",
    ("gohan", "teen_gohan_normal_mystic"): "gohan_ultimate",
    ("gohan", "teen_gohan_super_saiyan"): "gohan_super_saiyan_1_2",
    ("gohan", "young_gohan_normal"): "young_gohan_base",
    ("gohan", "young_gohan_super_saiyan"): "young_gohan_super_saiyan",
    ("gohan", "young_gohan_super_saiyan_2"): "young_gohan_super_saiyan_2",
    ("goku", "normal"): "goku_base",
    ("goku", "super_saiyan"): "goku_super_saiyan",
    ("goku", "super_saiyan_3"): "goku_super_saiyan_3",
    ("goten", "normal"): "goten_base",
    ("goten", "super_saiyan"): "goten_super_saiyan",
    ("gotenks", "super_saiyan"): "gotenks_super_saiyan",
    ("gotenks", "super_saiyan_3"): "gotenks_super_saiyan_3",
    ("guldo", "base"): "guldo_base",
    ("jeice_burter", "burter"): "burter_base",
    ("jeice_burter", "jeice"): "jeice_base",
    ("krillin", "base"): "krillin_base",
    ("majin_buu", "fat_buu"): "buu_base",
    ("majin_buu", "kid_buu"): "kid_buu_base",
    ("majin_buu", "super_buu"): "super_buu_base",
    ("majin_buu", "super_buu_gohan_absorbed"): "buu_gohan_absorbed",
    ("majin_buu", "super_buu_gotenks_absorbed"): "buu_gotenks_absorbed",
    ("nappa", "base"): "nappa_base",
    ("piccolo", "base"): "piccolo_base",
    ("recoome", "base"): "recoome_base",
    ("trunks_future", "future_trunks_normal"): "future_trunks_base",
    ("trunks_future", "future_trunks_super_saiyan"): "future_trunks_super_saiyan",
    ("trunks_kid", "kid_trunks_normal"): "trunks_base",
    ("trunks_kid", "kid_trunks_super_saiyan"): "kid_trunks_super_saiyan",
    ("vegeta", "normal"): "vegeta_base",
    ("vegeta", "super_saiyan_majin"): "vegeta_super_saiyan_majin",
    ("vegito", "base"): "vegito_base",
}

# V6 (character, form) → forma del FIXED (clave de animations.json).
# 40 nativas + 2 prestadas (future_trunks_super_saiyan y vegito_base usan
# la estructura de poses de future_trunks/base y goku/super_saiyan).
V6_TO_FIXED = {
    ("android_16", "base"): "01_android_16/base",
    ("android_17", "base"): "02_android_17/base",
    ("android_18", "base"): "03_android_18/base",
    ("android_19", "base"): "04_android_19/base",
    ("android_20", "base"): "05_android_20/base",
    ("captain_ginyu", "base"): "16_ginyu/base",
    ("cell", "cell_form_1"): "10_cell/imperfect_form",
    ("cell", "cell_form_2"): "12_cell/semi_perfect_form",
    ("cell", "perfect_cell"): "11_cell/perfect",
    ("cell_jr", "base"): "13_cell_jr/base",
    ("frieza", "base"): "14_frieza/base",
    ("gohan", "teen_gohan_normal_mystic"): "19_gohan/ultimate",
    ("gohan", "teen_gohan_super_saiyan"): "18_gohan/super_saiyan_1_2",
    ("gohan", "young_gohan_normal"): "40_young_gohan/base",
    ("gohan", "young_gohan_super_saiyan"): "42_young_gohan/super_saiyan",
    ("gohan", "young_gohan_super_saiyan_2"): "41_young_gohan/super_saiyan_2",
    ("goku", "normal"): "20_goku/base",
    ("goku", "super_saiyan"): "23_goku/super_saiyan",
    ("goku", "super_saiyan_3"): "22_goku/super_saiyan_3",
    ("goten", "normal"): "24_goten/base",
    ("goten", "super_saiyan"): "25_goten/super_saiyan",
    ("gotenks", "super_saiyan"): "27_gotenks/super_saiyan",
    ("gotenks", "super_saiyan_3"): "26_gotenks/super_saiyan_3",
    ("guldo", "base"): "28_guldo/base",
    ("jeice_burter", "burter"): "06_burter/base",
    ("jeice_burter", "jeice"): "29_jeice/base",
    ("krillin", "base"): "31_krillin/base",
    ("majin_buu", "fat_buu"): "07_buu/base",
    ("majin_buu", "kid_buu"): "30_kid_buu/base",
    ("majin_buu", "super_buu"): "35_super_buu/base",
    ("majin_buu", "super_buu_gohan_absorbed"): "08_buu/gohan_absorbed",
    ("majin_buu", "super_buu_gotenks_absorbed"): "09_buu/gotenks_absorbed",
    ("nappa", "base"): "32_nappa/base",
    ("piccolo", "base"): "33_piccolo/base",
    ("recoome", "base"): "34_recoome/base",
    ("trunks_future", "future_trunks_normal"): "15_future_trunks/base",
    ("trunks_kid", "kid_trunks_normal"): "36_trunks/base",
    ("trunks_kid", "kid_trunks_super_saiyan"): "37_trunks/super_saiyan",
    ("vegeta", "normal"): "38_vegeta/base",
    ("vegeta", "super_saiyan_majin"): "39_vegeta/super_saiyan_majin",
    # ── Prestadas (V6 sí las tiene, FIXED las copiaba) ──────
    ("trunks_future", "future_trunks_super_saiyan"): "15_future_trunks/base",
    ("vegito", "base"): "23_goku/super_saiyan",
}

# Formas que V6 ELIMINÓ (goku_super_saiyan_2, ginyu_gokus_body) → importar
# directamente del FIXED, que sí tiene animación real para ellas.
FIXED_ONLY = {
    "21_goku/super_saiyan_2": "goku_super_saiyan_2",
    "17_ginyu/gokus_body": "ginyu_gokus_body",
}

# Categoría FIXED → pose del juego + fps/loop.
POSE_MAP = {
    "idle": ("idle", 3, True),
    "movement": ("move_right", 6, True),
    "guard": ("guard", 6, False),
    "attack_forward": ("attack_fwd", 5, False),
    "attack_vertical": ("attack_ud", 5, False),
    "hurt": ("hurt", 6, False),
}
BEAM_CHARGE = ("beam_charge", 7, False)
BEAM_FIRE = ("beam_fire", 8, False)
POSE_ORDER = ["idle", "move_right", "move_left", "guard", "attack_fwd",
              "attack_ud", "hurt", "beam_charge", "beam_fire"]


# ── Utilidades ─────────────────────────────────────────────
def sig_from_bytes(b, flip=False):
    """Firma por COLOR cuantizado a 4 bits/canal (para casar exacto y
    desambiguar). Devuelve None si vacío."""
    im = Image.open(io.BytesIO(b)).convert("RGBA")
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    px = im.load()
    pts = []
    for y in range(im.height):
        for x in range(im.width):
            r, g, bl, a = px[x, y]
            if a == 0 or (r, g, bl) in BG:
                continue
            pts.append((x, y, r >> 4, g >> 4, bl >> 4))
    if not pts:
        return None
    minx = min(p[0] for p in pts)
    miny = min(p[1] for p in pts)
    return tuple(sorted((x - minx, y - miny, r, g, bl) for x, y, r, g, bl in pts))


def shape_from_bytes(b, flip=False):
    """Firma por FORMA (solo posiciones de píxeles opacos, sin color).
    Tolera el dithering de los GIF de V6 (un color de FIXED aparece partido
    en dos tonos en V6) y la deriva de paleta. Devuelve None si vacío."""
    im = Image.open(io.BytesIO(b)).convert("RGBA")
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    px = im.load()
    pts = set()
    for y in range(im.height):
        for x in range(im.width):
            r, g, bl, a = px[x, y]
            if a == 0 or (r, g, bl) in BG:
                continue
            pts.add((x, y))
    if not pts:
        return None
    minx = min(p[0] for p in pts)
    miny = min(p[1] for p in pts)
    return frozenset((x - minx, y - miny) for x, y in pts)


def png_size(path):
    with Image.open(path) as im:
        return im.size  # (w, h)


def clean_fixed_png(src, dst):
    """Copia un PNG del FIXED a dst eliminando el fondo verde claro
    (211,249,188) residual. Ese tono es fondo de hoja del FIXED y NUNCA
    aparece como color de sprite en V6 (verificado: 0 px en 1952 frames),
    así que es 100% seguro eliminarlo. Los fondos cian (0,183,239) y
    (0,255,255) NO se tocan (son colores de sprite legítimos: gi de Gohan,
    piel de Piccolo, energía de beam)."""
    im = Image.open(src).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a > 0 and (r, g, b) == (211, 249, 188):
                px[x, y] = (0, 0, 0, 0)
    im.save(dst)
    return im.size


def clean_dir(d):
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        if f.endswith(".png") or f == "manifest.json":
            os.remove(os.path.join(d, f))


def write_manifest(game_dir, poses):
    manifest = {}
    for pose_name in POSE_ORDER:
        entry = poses.get(pose_name)
        if not entry:
            continue
        frames = []
        for i, f in enumerate(entry["frames"]):
            name = f"{game_dir}_{pose_name}_{i:02d}"
            frames.append({"name": name, "file": f"{name}.png", "w": f["w"], "h": f["h"]})
        manifest[pose_name] = {
            "frame_count": len(frames),
            "fps": entry["fps"],
            "loop": entry["loop"],
            "frames": frames,
        }
    with open(os.path.join(OUT_ROOT, game_dir, "manifest.json"), "w") as fh:
        fh.write(json.dumps(manifest, indent=2) + "\n")


# ── Extraer FIXED ──────────────────────────────────────────
tmp = tempfile.mkdtemp(prefix="dbz-lsw-v6-")
try:
    subprocess.run(["unzip", "-q", "-o", FIXED_ZIP, "-d", tmp], check=True)
    anim_path = os.path.join(tmp, "00_manifest", "animations.json")
    animations = json.load(open(anim_path, encoding="utf-8"))["animations"]

    # source_y de FIXED (autoridad para el corte beam charge→fire).
    sprites_csv = list(csv.DictReader(
        open(os.path.join(tmp, "00_manifest", "sprites.csv"), encoding="utf-8-sig")))
    source_y_map = {}
    for row in sprites_csv:
        if row.get("asset_kind") == "frame":
            source_y_map[row["path"]] = int(row["source_y"])

    # ── Construir índice V6 por (personaje, forma) ─────────
    v6_index = defaultdict(lambda: defaultdict(list))   # color 4-bit -> frames
    v6_shape = defaultdict(lambda: defaultdict(list))   # forma -> frames
    v6_meta = {}  # (char, form, frame) -> {y0, correction, w, h, rel, abs}
    manifest_rows = list(csv.DictReader(
        open(os.path.join(V6_ROOT, "manifest.csv"), encoding="utf-8-sig")))
    for r in manifest_rows:
        ch, form, frame = r["character"], r["form"], r["frame"]
        rel = os.path.join("characters", ch, form, "frames", frame)
        abs_path = os.path.join(V6_ROOT, rel)
        raw = open(abs_path, "rb").read()
        sig = sig_from_bytes(raw)
        shp = shape_from_bytes(raw)
        key = (ch, form, frame)
        v6_meta[key] = {
            "y0": int(r["y0"]), "correction": r["correction"],
            "w": int(r["width"]), "h": int(r["height"]),
            "rel": rel, "abs": abs_path,
        }
        if sig is not None:
            v6_index[(ch, form)][sig].append(key)
        if shp is not None:
            v6_shape[(ch, form)][shp].append(key)

    used_v6 = set()
    stats = {"matched": 0, "fallback_fixed": 0, "effects": 0, "imported": 0}

    def match_fixed_frame(ch, form, fixed_bytes):
        """Devuelve (key, flipped) — la clave V6 (ch,form,frame) que casa, o
        (None, False). 1º color 4-bit exacto; 2º forma (tolera dithering)."""
        sig = sig_from_bytes(fixed_bytes)
        if sig is not None:
            for cand in v6_index[(ch, form)].get(sig, []):
                if cand not in used_v6:
                    return cand, False
        sig_f = sig_from_bytes(fixed_bytes, flip=True)
        if sig_f is not None and sig_f != sig:
            for cand in v6_index[(ch, form)].get(sig_f, []):
                if cand not in used_v6:
                    return cand, True
        shp = shape_from_bytes(fixed_bytes)
        if shp is not None:
            for cand in v6_shape[(ch, form)].get(shp, []):
                if cand not in used_v6:
                    return cand, False
        shp_f = shape_from_bytes(fixed_bytes, flip=True)
        if shp_f is not None and shp_f != shp:
            for cand in v6_shape[(ch, form)].get(shp_f, []):
                if cand not in used_v6:
                    return cand, True
        return None, False

    def copy_v6_frame(key, flipped, target_dir, dest_name):
        src = v6_meta[key]["abs"]
        dst = os.path.join(target_dir, dest_name)
        if flipped:
            im = Image.open(src).convert("RGBA")
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
            im.save(dst)
        else:
            shutil.copyfile(src, dst)
        used_v6.add(key)
        return v6_meta[key]["w"], v6_meta[key]["h"]

    def process_form(game_dir, fixed_key, v6_form):
        """Procesa una forma: estructura de poses de animations[fixed_key];
        píxeles de v6_form (bridge) o del FIXED (fallback / FIXED_ONLY)."""
        target = os.path.join(OUT_ROOT, game_dir)
        clean_dir(target)
        anim = animations[fixed_key]
        poses = {}

        def resolve(fixed_bytes):
            if v6_form is None:
                return None, False
            return match_fixed_frame(v6_form[0], v6_form[1], fixed_bytes)

        def copy_frame(resolved, flipped, fixed_abs, target_dir, dest):
            key = resolved
            if key:
                w, h = copy_v6_frame(key, flipped, target_dir, dest)
                stats["matched"] += 1
            else:
                w, h = clean_fixed_png(fixed_abs, os.path.join(target_dir, dest))
                stats["fallback_fixed"] += 1
            return w, h

        for category, (pose, fps, loop) in POSE_MAP.items():
            rel_paths = anim.get(category, {}).get("frames", [])
            if not rel_paths:
                continue
            frames = []
            for i, rel_path in enumerate(rel_paths):
                fixed_abs = os.path.join(tmp, rel_path)
                if not os.path.exists(fixed_abs):
                    raise RuntimeError(f"Falta frame FIXED: {rel_path}")
                fixed_bytes = open(fixed_abs, "rb").read()
                key, flipped = resolve(fixed_bytes)
                dest = f"{game_dir}_{pose}_{i:02d}.png"
                w, h = copy_frame(key, flipped, fixed_abs, target, dest)
                frames.append({"w": w, "h": h})
            poses[pose] = {"frames": frames, "fps": fps, "loop": loop}

        # beam → beam_charge + beam_fire (partir por salto de y0 de V6)
        beam_rel = anim.get("beam", {}).get("frames", [])
        if beam_rel:
            matched = []
            ys = []
            for rel_path in beam_rel:
                fixed_abs = os.path.join(tmp, rel_path)
                fixed_bytes = open(fixed_abs, "rb").read()
                key, flipped = resolve(fixed_bytes)
                matched.append((key, flipped, fixed_abs))
                ys.append(source_y_map.get(rel_path))
            split = -1
            for i in range(1, len(ys)):
                if ys[i] is not None and ys[i - 1] is not None and ys[i] - ys[i - 1] > 20:
                    split = i
                    break

            def copy_beam(slice_items, meta_pose):
                frames = []
                for i, (key, flipped, fixed_abs) in enumerate(slice_items):
                    dest = f"{game_dir}_{meta_pose[0]}_{i:02d}.png"
                    w, h = copy_frame(key, flipped, fixed_abs, target, dest)
                    frames.append({"w": w, "h": h})
                poses[meta_pose[0]] = {"frames": frames, "fps": meta_pose[1], "loop": meta_pose[2]}

            charge = matched[:split] if split > 0 else matched
            fire = matched[split:] if split > 0 else []
            copy_beam(charge, BEAM_CHARGE)
            if fire:
                copy_beam(fire, BEAM_FIRE)

        # move_right → move_left (duplicado; el juego espeja con scaleX(-1))
        if "move_right" in poses:
            right = poses["move_right"]
            left_frames = []
            for i, f in enumerate(right["frames"]):
                src = os.path.join(target, f"{game_dir}_move_right_{i:02d}.png")
                dst = os.path.join(target, f"{game_dir}_move_left_{i:02d}.png")
                if os.path.exists(src):
                    shutil.copyfile(src, dst)
                left_frames.append(dict(f))
            poses["move_left"] = {"frames": left_frames, "fps": right["fps"], "loop": right["loop"]}

        write_manifest(game_dir, poses)
        stats["imported"] += 1
        total = sum(len(p["frames"]) for p in poses.values())
        print(f"{game_dir}: {total} frames")

    # ── Procesar las 42 formas V6 (40 nativas + 2 prestadas) ─
    for (ch, form), fixed_key in V6_TO_FIXED.items():
        process_form(V6_TO_DIR[(ch, form)], fixed_key, (ch, form))

    # ── Procesar las 2 formas que V6 eliminó (directo de FIXED) ─
    for fixed_key, game_dir in FIXED_ONLY.items():
        process_form(game_dir, fixed_key, None)
        print(f"{game_dir}: importado directo de FIXED ({fixed_key})")

    # ── Exportar efectos recovered ─────────────────────────
    effects_root = os.path.join(OUT_ROOT, "effects")
    shutil.rmtree(effects_root, ignore_errors=True)
    effects_manifest = {}
    for (ch, form), game_dir in V6_TO_DIR.items():
        items = []
        for key, meta in v6_meta.items():
            c, f, frame = key
            if c != ch or f != form:
                continue
            if not meta["correction"].startswith("recovered"):
                continue
            if key in used_v6:
                continue
            e_dir = os.path.join(effects_root, game_dir)
            os.makedirs(e_dir, exist_ok=True)
            name = f"{game_dir}__effect_{len(items):02d}"
            shutil.copyfile(meta["abs"], os.path.join(e_dir, name + ".png"))
            items.append({
                "name": name, "file": f"{game_dir}/{name}.png",
                "w": meta["w"], "h": meta["h"],
                "correction": meta["correction"],
                "source_frame": frame,
            })
            stats["effects"] += 1
        if items:
            effects_manifest[game_dir] = {"count": len(items), "frames": items}
            print(f"effects/{game_dir}: {len(items)} efectos recovered")
    open(os.path.join(effects_root, "manifest.json"), "w").write(
        json.dumps(effects_manifest, indent=2) + "\n")

    print("\n✓ Importadas %d formas (42 V6 + %d FIXED-only)" % (
        stats["imported"], len(FIXED_ONLY)))
    print("✓ Frames casados V6↔FIXED:", stats["matched"])
    print("✓ Frames fallback a FIXED (cortes rehechos):", stats["fallback_fixed"])
    print("✓ Efectos recovered exportados:", stats["effects"])
finally:
    shutil.rmtree(tmp, ignore_errors=True)
