#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════
# sync-battle-ow-power.py — Auditoría + sync de actores de power-up
# del Battle Overworld contra el paquete V9 RIGHTCANONICAL.
#
# Regla canónica (formas bien configuradas): el actor de GATHER POWER
# es el 2º frame de overworld_actor_or_pose (el "walk"/grito), recortado
# al bbox — NUNCA el chibi idle (1er frame) ni el idle de combate.
#
# - Modo lectura (sin --apply): reporta qué formas usan idle (BUG),
#   walk (OK) o no tienen walk (documentado).
# - Modo --apply: reescribe los actores de power desde el walk V9
#   recortado al bbox (idempotente: solo escribe si difiere).
#
# Uso: python3 scripts/sync-battle-ow-power.py [--apply]
# ═══════════════════════════════════════════════════════════════════
import hashlib, sys
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
V9 = REPO / 'sprites-source/catalog-v9/forms_by_runtime'
BATTLE = REPO / 'public/assets/overworld/battle'

# formId (roster) → dir canónico V9
FORM_V9 = {
    'goku_base': 'goku_base', 'goku_ssj': 'goku_super_saiyan',
    'goku_ssj2': 'goku_super_saiyan_2', 'goku_ssj3': 'goku_super_saiyan_3',
    'vegeta_base': 'vegeta_base', 'vegeta_ssj': 'vegeta_super_saiyan_majin',
    'vegeta_majin': 'vegeta_super_saiyan_majin',
    'piccolo_base': 'piccolo_base', 'krillin_base': 'krillin_base',
    'frieza_final': 'frieza_base', 'cell_jr': 'cell_jr_base',
    'android_16': 'android_16_base', 'android_17': 'android_17_base',
    'android_18': 'android_18_base', 'android_19': 'android_19_base',
    'android_20': 'android_20_base',
    'ginyu': 'ginyu_base', 'recoome': 'recoome_base', 'guldo': 'guldo_base',
    'jeice': 'jeice_base', 'burter': 'burter_base',
    'buu_base': 'buu_base', 'buu_super': 'super_buu_base', 'buu_kid': 'kid_buu_base',
    'gotenks_ssj': 'gotenks_super_saiyan', 'gotenks_ssj3': 'gotenks_super_saiyan_3',
    'vegito_ssj': 'vegito_ssj',
    'buu_gohan': 'buu_gohan_absorbed', 'buu_gotenks': 'buu_gotenks_absorbed',
    'cell_imperfect': 'cell_imperfect_form', 'cell_perfect': 'cell_perfect',
    'cell_semi': 'cell_semi_perfect_form',
    'trunks_future': 'future_trunks_base', 'trunks_ssj': 'future_trunks_super_saiyan',
    'ginyu_goku': 'ginyu_gokus_body',
    'gohan_adult_ssj': 'gohan_super_saiyan_1_2',
    'gohan_adult_ssj2': 'gohan_super_saiyan_1_2',
    'gohan_adult_ultimate': 'gohan_ultimate',
    'goten_base': 'goten_base', 'goten_ssj': 'goten_super_saiyan',
    'trunks_kid_ssj': 'kid_trunks_super_saiyan', 'nappa': 'nappa_base',
    'trunks_kid': 'trunks_base',
    'gohan_young': 'young_gohan_base', 'gohan_young_ssj': 'young_gohan_super_saiyan',
    'gohan_young_ssj2': 'young_gohan_super_saiyan_2',
}

# Formas FIXED-only sin OW propio: el arte del actor se toma del dir que
# comparte sprites (verificado 2026-08-17, commit 4dbdeeb).
WALK_FALLBACK = {
    'goku_ssj2': 'goku_super_saiyan',   # arte SSJ compartido
    'ginyu_goku': 'goku_base',          # arte Goku base compartido
}

# formId → char/form del battle OW (duplicado del manifest real)
FORM_BATTLE = {
    'goku_base': ('goku', 'base'), 'goku_ssj': ('goku', 'super_saiyan'),
    'goku_ssj2': ('goku', 'super_saiyan_2'), 'goku_ssj3': ('goku', 'super_saiyan_3'),
    'vegeta_base': ('vegeta', 'base'), 'vegeta_ssj': ('vegeta', 'super_saiyan'),
    'vegeta_majin': ('vegeta', 'super_saiyan'),
    'piccolo_base': ('piccolo', 'base'), 'krillin_base': ('krillin', 'base'),
    'frieza_final': ('frieza', 'base'), 'cell_jr': ('cell_jr', 'base'),
    'android_16': ('android_16', 'base'), 'android_17': ('android_17', 'base'),
    'android_18': ('android_18', 'base'), 'android_19': ('android_19', 'base'),
    'android_20': ('android_20', 'base'),
    'ginyu': ('captain_ginyu', 'base'), 'recoome': ('recoome', 'base'),
    'guldo': ('guldo', 'base'), 'jeice': ('jeice_burter', 'jeice'),
    'burter': ('jeice_burter', 'burter'),
    'buu_base': ('majin_buu', 'fat_buu'), 'buu_super': ('majin_buu', 'super_buu'),
    'buu_kid': ('majin_buu', 'kid_buu'),
    'gotenks_ssj': ('gotenks', 'super_saiyan'), 'gotenks_ssj3': ('gotenks', 'super_saiyan_3'),
    'vegito_ssj': ('vegito', 'base'),
    'buu_gohan': ('majin_buu', 'gohan_absorbed'), 'buu_gotenks': ('majin_buu', 'gotenks_absorbed'),
    'cell_imperfect': ('cell', 'imperfect'), 'cell_perfect': ('cell', 'perfect'),
    'cell_semi': ('cell', 'semi_perfect'),
    'trunks_future': ('future_trunks', 'base'), 'trunks_ssj': ('future_trunks', 'super_saiyan'),
    'ginyu_goku': ('ginyu', 'gokus_body'),
    'gohan_adult_ssj': ('gohan_adult', 'super_saiyan'),
    'gohan_adult_ssj2': ('gohan_adult', 'super_saiyan'),
    'gohan_adult_ultimate': ('gohan_adult', 'ultimate'),
    'goten_base': ('goten', 'base'), 'goten_ssj': ('goten', 'super_saiyan'),
    'trunks_kid_ssj': ('kid_trunks', 'super_saiyan'), 'nappa': ('nappa', 'base'),
    'trunks_kid': ('trunks_kid', 'base'),
    'gohan_young': ('young_gohan', 'base'), 'gohan_young_ssj': ('young_gohan', 'super_saiyan'),
    'gohan_young_ssj2': ('young_gohan', 'super_saiyan_2'),
}


def sig(p: Path):
    im = Image.open(p).convert('RGBA')
    px = im.load(); w, h = im.size
    vis = bytearray()
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0:
                vis += bytes((r >> 4, g >> 4, b >> 4))
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    bbox = None if maxx < 0 else (minx, miny, maxx, maxy)
    return (w, h, bbox, hashlib.md5(bytes(vis)).hexdigest())


def crop_bbox(p: Path) -> Image.Image | None:
    im = Image.open(p).convert('RGBA')
    px = im.load(); w, h = im.size
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 0:
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    if maxx < 0:
        return None
    return im.crop((minx, miny, maxx + 1, maxy + 1))


def v9_ow_frames(v9dir: str):
    d = V9 / v9dir / 'named/overworld_actor_or_pose'
    if not d.exists():
        return []
    return sorted(d.glob('*.png'))


def resolve_walk(form_id: str, v9dir: str):
    """Walk V9 de la forma, o del dir con arte compartido si no tiene OW propio."""
    ows = v9_ow_frames(v9dir)
    if len(ows) >= 2:
        return ows[1]
    if form_id in WALK_FALLBACK:
        fb = v9_ow_frames(WALK_FALLBACK[form_id])
        if len(fb) >= 2:
            return fb[1]
    return None


def main():
    apply = '--apply' in sys.argv
    problems, fixed, ok, nowalk = [], [], [], []
    for form_id, v9dir in FORM_V9.items():
        char, form = FORM_BATTLE[form_id]
        actor = BATTLE / char / form / 'battle_overworld/actor/001_gather_power_pose.png'
        if not actor.exists():
            continue  # sin battle OW en disco (p.ej. piccolo_evil/kami)
        ows = v9_ow_frames(v9dir)
        idle_f, walk_f = (ows + [None, None])[:2]
        a_sig = sig(actor)
        walk_src = None
        if walk_f is not None:
            walk_sig = sig(walk_f)
            if a_sig[3] == walk_sig[3] and a_sig[0] == walk_sig[0] and a_sig[1] == walk_sig[1]:
                ok.append(form_id)
                continue
            # ¿es el walk recortado al bbox?
            cr = crop_bbox(walk_f)
            if cr is not None and sig_bytes(cr) == a_sig[3]:
                ok.append(form_id)
                continue
            walk_src = walk_f
        if idle_f is not None and a_sig[3] == sig(idle_f)[3]:
            problems.append((form_id, 'actor == IDLE'))
        else:
            problems.append((form_id, 'actor != walk (sin match)'))
        if walk_src is None:
            nowalk.append(form_id)
            continue
        fixed.append((form_id, walk_src))
        if apply:
            cropped = crop_bbox(walk_src)
            if cropped is None:
                print(f'  !! {form_id}: walk sin píxeles, SKIP')
                continue
            actor.parent.mkdir(parents=True, exist_ok=True)
            cropped.save(actor)
            print(f'  ✓ {form_id}: actor ← walk V9 {walk_src.name} ({cropped.size[0]}x{cropped.size[1]})')
    print(f'\nOK (actor == walk V9): {len(ok)}')
    print(f'PROBLEMAS: {len(problems)}')
    for fid, why in problems:
        tag = 'NO-WALK (documentado)' if fid in nowalk else why
        print(f'  - {fid}: {tag}')
    print(f'CORREGIDOS/por corregir: {len(fixed)}')
    if not apply and fixed:
        print('\n(usa --apply para escribir)')
    return 0 if not problems else 1


def sig_bytes(im: Image.Image):
    px = im.convert('RGBA').load(); w, h = im.size
    vis = bytearray()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0:
                vis += bytes((r >> 4, g >> 4, b >> 4))
    return hashlib.md5(bytes(vis)).hexdigest()


if __name__ == '__main__':
    raise SystemExit(main())
