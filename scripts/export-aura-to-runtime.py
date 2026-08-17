#!/usr/bin/env python3
"""Exportar AURA_POWER (naranja) y AURA_SUPPORT (azul) al runtime.

Copia los 3 frames del ciclo del aura (power) y los 3 de la variante support
del catálogo V9 a public/assets/sprites/<dir>/ y añade las poses
`aura_power` y `aura_support` al manifest (fps 10, loop — mismos valores que
power_up; SIN cambiar gameplay: nadie las consume todavía).

Nomenclatura runtime: <dir>_aura_power_00..02.png / <dir>_aura_support_00..02.png
(sigue la convención <dir>_<pose>_NN.png de los manifests).

Idempotente: si la pose ya existe en el manifest, no la duplica.

Uso: python3 scripts/export-aura-to-runtime.py
"""
import json
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
V9 = REPO / 'sprites-source/catalog-v9/forms_by_runtime'
SPR = REPO / 'public/assets/sprites'

# forma canónica (dir V9) -> dir runtime; las FIXED-only no tienen dir
# propio en catalog-v9: su support vive en el catálogo de la forma FUENTE
# (goku_super_saiyan_2 → goku_super_saiyan, ginyu_gokus_body → goku_base).
FIXED_SOURCE = {
    'goku_super_saiyan_2': 'goku_super_saiyan',
    'ginyu_gokus_body': 'goku_base',
}

DIR_RUNTIME = {
    'goku_base': 'goku_base', 'goku_super_saiyan': 'goku_super_saiyan',
    'goku_super_saiyan_2': 'goku_super_saiyan_2', 'goku_super_saiyan_3': 'goku_super_saiyan_3',    'vegeta_base': 'vegeta_base', 'vegeta_super_saiyan_majin': 'vegeta_super_saiyan_majin',
    'piccolo_base': 'piccolo_base', 'krillin_base': 'krillin_base',
    'frieza_base': 'frieza_base', 'cell_jr_base': 'cell_jr_base',
    'android_16_base': 'android_16_base', 'android_17_base': 'android_17_base',
    'android_18_base': 'android_18_base', 'android_19_base': 'android_19_base',
    'android_20_base': 'android_20_base',
    'ginyu_base': 'ginyu_base', 'recoome_base': 'recoome_base', 'guldo_base': 'guldo_base',
    'jeice_base': 'jeice_base', 'burter_base': 'burter_base',
    'buu_base': 'buu_base', 'super_buu_base': 'super_buu_base', 'kid_buu_base': 'kid_buu_base',
    'gotenks_super_saiyan': 'gotenks_super_saiyan', 'gotenks_super_saiyan_3': 'gotenks_super_saiyan_3',
    'vegito_ssj': 'vegito_ssj',
    'buu_gohan_absorbed': 'buu_gohan_absorbed', 'buu_gotenks_absorbed': 'buu_gotenks_absorbed',
    'cell_imperfect_form': 'cell_imperfect_form', 'cell_perfect': 'cell_perfect',
    'cell_semi_perfect_form': 'cell_semi_perfect_form',
    'future_trunks_base': 'future_trunks_base', 'future_trunks_super_saiyan': 'future_trunks_super_saiyan',
    'ginyu_gokus_body': 'ginyu_gokus_body',
    'gohan_super_saiyan_1_2': 'gohan_super_saiyan_1_2', 'gohan_ultimate': 'gohan_ultimate',
    'goten_base': 'goten_base', 'goten_super_saiyan': 'goten_super_saiyan',
    'kid_trunks_super_saiyan': 'kid_trunks_super_saiyan', 'nappa_base': 'nappa_base',
    'trunks_base': 'trunks_base',
    'young_gohan_base': 'young_gohan_base', 'young_gohan_super_saiyan': 'young_gohan_super_saiyan',
    'young_gohan_super_saiyan_2': 'young_gohan_super_saiyan_2',
}


def main():
    n_forms = n_files = 0
    for form, rdir in DIR_RUNTIME.items():
        src_form = FIXED_SOURCE.get(form, form)
        cat_path = V9 / src_form / 'catalog.json'
        if not cat_path.exists():
            continue
        catalog = json.load(open(cat_path))
        sups = sorted([e for e in catalog if e.get('semantic_bucket') == 'aura_support' and e.get('form') == form],
                      key=lambda e: e['semantic_alias'])
        if len(sups) != 3:
            print(f'  !! {form}: {len(sups)} support (esperado 3)')
            continue
        mdir = SPR / rdir
        if not mdir.exists():
            print(f'  !! {form}: dir runtime {rdir} no existe')
            continue
        # frames power (origen del ciclo) y support
        power_files = []
        support_files = []
        for e in sups:
            sf = e['old_refs'].split('/')
            power = V9 / sf[0] / 'atomic' / sf[1]
            support = V9 / src_form / 'atomic' / e['frame']
            if not power.exists() or not support.exists():
                print(f'  !! {form}: falta {power.name} o {support.name}')
                continue
            power_files.append(power)
            support_files.append(support)
        if len(power_files) != 3:
            continue
        # escribir PNGs
        def write_pair(pose, files):
            for i, p in enumerate(files):
                im = Image.open(p).convert('RGBA')
                dst = mdir / f'{rdir}_{pose}_{i:02d}.png'
                im.save(dst)
            return [f'{rdir}_{pose}_{i:02d}.png' for i in range(3)]
        pw = write_pair('aura_power', power_files)
        sp = write_pair('aura_support', support_files)
        n_files += 6
        # manifest
        mf = mdir / 'manifest.json'
        manifest = json.load(open(mf))
        for pose, files, power in [('aura_power', pw, True), ('aura_support', sp, False)]:
            if pose in manifest:
                continue
            frames = []
            for i, f in enumerate(files):
                im = Image.open(mdir / f)
                frames.append({'name': f'{rdir}_{pose}_{i:02d}', 'file': f, 'w': im.width, 'h': im.height})
            manifest[pose] = {'frame_count': 3, 'fps': 10, 'loop': True, 'frames': frames}
        json.dump(manifest, open(mf, 'w'), indent=1, ensure_ascii=False)
        open(mf, 'a').write('\n')
        n_forms += 1
        print(f'  ✓ {form} -> {rdir}: aura_power + aura_support en manifest')
    print(f'\nDONE: {n_forms} formas, {n_files} PNGs')


if __name__ == '__main__':
    main()
