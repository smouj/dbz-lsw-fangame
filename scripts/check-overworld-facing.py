#!/usr/bin/env python3
"""Overworld facing v3: orientación NATIVA de cada chibi *_ow.png.

Método (objetivo, sin visión; chibis ≤16px engañan al ojo humano y al modelo):

El RGB entre chibi y sprite de combate es RUIDO (el chibi es arte redibujado
con paleta GBC reducida). Solo se usa la SILUETA (máscara binaria, IoU).

Fuentes de verdad, por orden de fiabilidad:
  A) git-check (9 dirs de combate espejados hoy): el sprite ORIGINAL de HEAD
     era 'left'; el normalizado es 'right'. El chibi que coincida mejor con
     el original (en silueta de cabeza) mira a la izquierda → espejar.
  B) Multi-corte IoU contra el idle de combate homólogo (normalizado):
     voto por cortes de cabeza 40/50/60%.
  C) Intra-personaje: chibis de formas del MISMO personaje comparten pose
     base → misma orientación. Si uno está verificado, arrastra a los otros.
  D) goku_base_ow está VERIFICADO en vivo mirando a la derecha (referencia).

Decisión LEFT (espejar) solo si:
  · git-check dice left (para los 9 dirs), O
  · voto B mayoritario LEFT con margen claro, O
  · consistente con C (mismo personaje).

Uso: python3 scripts/check-overworld-facing.py [--apply] [--git-check]
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OW_DIR = ROOT / 'public/assets/overworld/panel_sprites'
SPRITES = ROOT / 'public/assets/sprites'

HEAD_CUTS = (0.40, 0.50, 0.60)
MARGIN = 0.02

MIRRORED_COMBAT_DIRS = {
    'goku_super_saiyan', 'goku_super_saiyan_3', 'gohan_super_saiyan_1_2',
    'goten_super_saiyan', 'gotenks_super_saiyan', 'gotenks_super_saiyan_3',
    'piccolo_base', 'super_buu_base', 'kid_trunks_super_saiyan',
}

# Chibis verificados en vivo mirando a la DERECHA (Battle Lab, sesión previa)
KNOWN_RIGHT = {'goku_base_ow.png', 'young_gohan_base_ow.png'}


def load_rgba(path):
    from PIL import Image
    return Image.open(path).convert('RGBA')


def bbox_of(img):
    return img.split()[3].getbbox()


def crop_head(img, frac):
    x0, y0, x1, y1 = bbox_of(img)
    return img.crop((x0, y0, x1, y0 + int((y1 - y0) * frac)))


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


def parse_ts_map(ts_path: Path, dict_name: str):
    text = ts_path.read_text()
    m = re.search(rf'const {dict_name}: Record<string, string> = \{{(.*?)\n\}};', text, re.S)
    if not m:
        sys.exit(f'No encontré {dict_name} en {ts_path}')
    return dict(re.findall(r"'([^']+)': '([^']+)'", m.group(1)))


def git_head_bytes(rel_path: str):
    try:
        out = subprocess.run(
            ['git', '-C', str(ROOT), 'show', f'HEAD:{rel_path}'],
            capture_output=True, check=True, timeout=10,
        ).stdout
        return out if out else None
    except Exception:
        return None


def main() -> None:
    apply = '--apply' in sys.argv
    git_check = '--git-check' in sys.argv
    from PIL import Image
    from io import BytesIO

    ow_files = parse_ts_map(ROOT / 'src/data/overworld.ts', 'OVERWORLD_FILES')
    sprite_dirs = parse_ts_map(ROOT / 'src/data/spriteManifest.ts', 'SPRITE_DIRS')

    ow_to_forms = {}
    for form, fname in ow_files.items():
        ow_to_forms.setdefault(fname, []).append(form)

    combat_ref = {}
    for fname, forms in ow_to_forms.items():
        for form in forms:
            sdir = sprite_dirs.get(form)
            if not sdir:
                continue
            idle = SPRITES / sdir / f'{sdir}_idle_00.png'
            if idle.exists():
                combat_ref[fname] = (sdir, idle)
                break

    # ── A: git-check (solo dirs espejados) — fuente de verdad ──
    git_verdict = {}
    if git_check:
        for fname, (sdir, idle_path) in combat_ref.items():
            if sdir not in MIRRORED_COMBAT_DIRS:
                continue
            orig = git_head_bytes(f'public/assets/sprites/{sdir}/{sdir}_idle_00.png')
            if not orig:
                continue
            try:
                chibi = load_rgba(OW_DIR / fname)
                new_img = load_rgba(idle_path)
                old_img = Image.open(BytesIO(orig)).convert('RGBA')
                ch = crop_head(chibi, 0.5)
                size = ch.size
                m_new = to_mask(crop_head(new_img, 0.5), size)
                m_old = to_mask(crop_head(old_img, 0.5), size)
                m_ch = to_mask(ch, size)
                d_new = mask_iou(m_ch, m_new)
                d_old = mask_iou(m_ch, m_old)
                git_verdict[fname] = 'left' if d_old < d_new else 'right'
            except Exception:
                git_verdict[fname] = 'error'

    # ── B: voto multi-corte IoU ──
    votes = {}
    for fname, (sdir, idle_path) in combat_ref.items():
        chibi = load_rgba(OW_DIR / fname)
        combat = load_rgba(idle_path)
        vr = vl = 0
        for cut in HEAD_CUTS:
            ch = crop_head(chibi, cut)
            cm = crop_head(combat, cut)
            size = ch.size
            m_same = to_mask(cm, size)
            m_mirr = m_same.transpose(Image.FLIP_LEFT_RIGHT)
            m_ch = to_mask(ch, size)
            d_same = mask_iou(m_ch, m_same)
            d_mirr = mask_iou(m_ch, m_mirr)
            if d_mirr - d_same > MARGIN:
                vr += 1
            elif d_same - d_mirr > MARGIN:
                vl += 1
        votes[fname] = (vr, vl)

    # ── C: agrupar por personaje (prefijo) ──
    def person(fname):
        p = fname.replace('_base_ow.png', '').replace('_ow.png', '')
        p = p.replace('goku_super_saiyan_2', 'goku').replace('goku_super_saiyan_3', 'goku')
        p = p.replace('goku_super_saiyan', 'goku').replace('young_gohan_super_saiyan_2', 'young_gohan')
        p = p.replace('young_gohan_super_saiyan', 'young_gohan').replace('young_gohan_base', 'young_gohan')
        p = p.replace('gohan_super_saiyan_1_2', 'gohan_teen').replace('gohan_ultimate', 'gohan')
        p = p.replace('gotenks_super_saiyan_3', 'gotenks').replace('gotenks_super_saiyan', 'gotenks')
        p = p.replace('goten_super_saiyan', 'goten').replace('super_buu_base', 'buu')
        p = p.replace('kid_buu_base', 'buu').replace('buu_base', 'buu')
        p = p.replace('buu_gohan_absorbed', 'buu').replace('buu_gotenks_absorbed', 'buu')
        p = p.replace('cell_imperfect_form', 'cell').replace('cell_semi_perfect_form', 'cell')
        p = p.replace('cell_perfect', 'cell').replace('cell_jr_base', 'cell_jr')
        p = p.replace('trunks_super_saiyan', 'trunks').replace('trunks_base', 'trunks')
        p = p.replace('future_trunks_base', 'future_trunks')
        p = p.replace('vegeta_super_saiyan_majin', 'vegeta').replace('vegito_ssj', 'vegito').replace('vegito_base', 'vegito')
        p = p.replace('android_16_base', 'android_16').replace('android_17_base', 'android_17')
        p = p.replace('android_18_base', 'android_18').replace('android_19_base', 'android_19').replace('android_20_base', 'android_20')
        p = p.replace('ginyu_gokus_body', 'ginyu_goku').replace('ginyu_base', 'ginyu')
        p = p.replace('recoome_base', 'recoome').replace('guldo_base', 'guldo').replace('jeice_base', 'jeice').replace('burter_base', 'burter')
        return p

    print(f'{"_ow.png":38} {"git":6} {"voto":6} {"personaje":14} decisión')
    print('-' * 80)
    lefts = []
    details = []
    for fname in sorted(combat_ref):
        vr, vl = votes.get(fname, (0, 0))
        gv = git_verdict.get(fname, '-')
        per = person(fname)
        # Decisión
        if gv == 'left':
            decision = 'LEFT'
        elif gv == 'right':
            decision = 'RIGHT'
        elif vl > vr and (vl - vr) >= 1:
            decision = 'LEFT'
        else:
            decision = 'RIGHT'
        # C: si algún chibi del mismo personaje es LEFT y este es dudoso → LEFT
        # (se resuelve tras primera pasada; aquí solo informativo)
        if fname in KNOWN_RIGHT and decision == 'LEFT':
            decision = 'RIGHT(known)'
        if decision.startswith('LEFT'):
            lefts.append(fname)
        details.append((fname, gv, vr, vl, per, decision))

    # Pasada C: arrastre intra-personaje (si el personaje tiene algún LEFT,
    # los AMBIGUOUS del mismo personaje con voto 0-0 se marcan como LEFT)
    person_left = {}
    for fname, gv, vr, vl, per, decision in details:
        if decision.startswith('LEFT'):
            person_left[per] = True
    final = []
    for fname, gv, vr, vl, per, decision in details:
        if decision == 'RIGHT' and vl == 0 and vr == 0 and person_left.get(per):
            decision = 'LEFT(grp)'
            lefts.append(fname)
        final.append((fname, gv, vr, vl, per, decision))

    for fname, gv, vr, vl, per, decision in final:
        mark = '  <-- ESPEJAR' if decision.startswith('LEFT') else ''
        print(f'{fname:38} {gv:6} {vr}-{vl:<4} {per:14} {decision}{mark}')

    print(f'\nTotal: {len(final)} | LEFT: {len(lefts)}')

    if apply:
        for fname in lefts:
            p = OW_DIR / fname
            img = load_rgba(p).transpose(Image.FLIP_LEFT_RIGHT)
            img.save(p)
            print(f'  ✔ espejado {fname}')
        print('APLICADO')
    else:
        print('DRY-RUN — pasa --apply para espejar (--git-check añade verificación HEAD)')

if __name__ == '__main__':
    main()
