#!/usr/bin/env python3
"""Extraer el BATTLE OVERWORLD según la taxonomía canónica
(docs/SPRITE_TAXONOMY.md), usando el index.csv del V6 como fuente de verdad.

El index V6 etiqueta los frames 'recovered_*' que son los componentes del
Battle Overworld:
  · 2 chibis pequeños (13-16px de alto) → actor/000_idle.png (1º por x,
    pose normal) + actor/001_gather_power_pose.png (2º, brazos arriba)
  · 1-2 gráficos grandes (24x16+) → effects/000_gather_power_aura.png
  · los 16x12 (rayo) y otras filas se EXCLUYEN (h<=12 o w>18 no es chibi)

Salida:
  public/assets/overworld/battle/<char>/<form>/battle_overworld/
    actor/000_idle.png
    actor/001_gather_power_pose.png
    effects/000_gather_power_aura.png
  + manifest.json

Uso: python3 scripts/extract-battle-overworld.py [--apply]
"""
import csv
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
V6 = ROOT / '.openclaw/tmp/v6src/DBZ_LSW_SPRITES_RECUT_V6_CANONICAL/characters'
SRC = ROOT / '.openclaw/tmp/v6src/DBZ_LSW_SPRITES_RECUT_V6_CANONICAL/source_sheets_png_transparent'
OUT = ROOT / 'public/assets/overworld/battle'

# (sheet, char_v6, form_v6) → (char, form) de nuestro proyecto
MAP = {
    ('goku.png', 'goku', 'normal'): ('goku', 'base'),
    ('goku.png', 'goku', 'super_saiyan'): ('goku', 'super_saiyan'),
    ('goku.png', 'goku', 'super_saiyan_3'): ('goku', 'super_saiyan_3'),
    ('vegeta.png', 'vegeta', 'normal'): ('vegeta', 'base'),
    ('vegeta.png', 'vegeta', 'super_saiyan_majin'): ('vegeta', 'super_saiyan'),
    ('piccolo.png', 'piccolo', 'base'): ('piccolo', 'base'),
    ('krillin.png', 'krillin', 'base'): ('krillin', 'base'),
    ('gohan.png', 'gohan', 'super_saiyan'): ('gohan', 'super_saiyan'),
    ('gohan.png', 'gohan', 'ultimate'): ('gohan', 'ultimate'),
    ('gohan.png', 'gohan', 'young_base'): ('gohan', 'young_base'),
    ('trunks_kid.png', 'trunks', 'base'): ('trunks', 'base'),
    ('trunks_future.png', 'trunks_future', 'base'): ('trunks_future', 'base'),
    ('goten.png', 'goten', 'base'): ('goten', 'base'),
    ('gotenks.png', 'gotenks', 'super_saiyan'): ('gotenks', 'super_saiyan'),
    ('frieza.png', 'frieza', 'base'): ('frieza', 'base'),
    ('cell.png', 'cell', 'perfect'): ('cell', 'perfect'),
    ('cell_jr.png', 'cell_jr', 'base'): ('cell_jr', 'base'),
    ('android_16.png', 'android_16', 'base'): ('android_16', 'base'),
    ('android_17.png', 'android_17', 'base'): ('android_17', 'base'),
    ('android_18.png', 'android_18', 'base'): ('android_18', 'base'),
    ('android_19.png', 'android_19', 'base'): ('android_19', 'base'),
    ('android_20.png', 'android_20', 'base'): ('android_20', 'base'),
    ('captain_ginyu.png', 'captain_ginyu', 'base'): ('captain_ginyu', 'base'),
    ('recoome.png', 'recoome', 'base'): ('recoome', 'base'),
    ('guldo.png', 'guldo', 'base'): ('guldo', 'base'),
    ('jeice_burter.png', 'jeice_burter', 'jeice'): ('jeice_burter', 'jeice'),
    ('jeice_burter.png', 'jeice_burter', 'burter'): ('jeice_burter', 'burter'),
    ('nappa.png', 'nappa', 'base'): ('nappa', 'base'),
    ('majin_buu.png', 'majin_buu', 'fat_buu'): ('majin_buu', 'fat_buu'),
    ('majin_buu.png', 'majin_buu', 'super_buu'): ('majin_buu', 'super_buu'),
    ('majin_buu.png', 'majin_buu', 'kid_buu'): ('majin_buu', 'kid_buu'),
    ('vegito.png', 'vegito', 'base'): ('vegito', 'base'),
}


def main():
    apply = '--apply' in sys.argv
    manifest = {}
    for (sheet, vchar, vform), (char, form) in MAP.items():
        idx = V6 / vchar / vform / 'index.csv'
        if not idx.exists():
            continue
        rows = []
        with open(idx) as f:
            for row in csv.DictReader(f):
                if 'recovered' in row.get('correction', ''):
                    rows.append(row)

        # chibis: ancho 11-18, alto 13-18 (excluye rayo 16x12 y auras 24x16)
        chibis = [r for r in rows
                  if 11 <= int(r['width']) <= 18 and 13 <= int(r['height']) <= 18]
        # auras: ancho 19-70, alto 12-22
        auras = [r for r in rows
                 if 19 <= int(r['width']) <= 70 and 12 <= int(r['height']) <= 22]
        if len(chibis) < 2 or not auras:
            continue
        chibis.sort(key=lambda r: int(r['x0']))
        auras.sort(key=lambda r: int(r['x0']))
        idle, gp = chibis[0], chibis[1]
        aura = auras[0]

        manifest.setdefault(char, {})[form] = {
            'sheet': sheet,
            'actor': {
                'idle': {k: int(idle[k]) for k in ('x0', 'y0', 'width', 'height')},
                'gather_power_pose': {k: int(gp[k]) for k in ('x0', 'y0', 'width', 'height')},
            },
            'effects': {
                'gather_power_aura': {k: int(aura[k]) for k in ('x0', 'y0', 'width', 'height')},
            },
        }

        if apply:
            out_dir = OUT / char / form / 'battle_overworld'
            (out_dir / 'actor').mkdir(parents=True, exist_ok=True)
            (out_dir / 'effects').mkdir(parents=True, exist_ok=True)
            sheet_img = Image.open(SRC / sheet).convert('RGBA')
            for name, r in [('000_idle', idle), ('001_gather_power_pose', gp)]:
                x0, y0 = int(r['x0']), int(r['y0'])
                w, h = int(r['width']), int(r['height'])
                sheet_img.crop((x0, y0, x0 + w, y0 + h)).save(out_dir / 'actor' / f'{name}.png')
            x0, y0 = int(aura['x0']), int(aura['y0'])
            w, h = int(aura['width']), int(aura['height'])
            sheet_img.crop((x0, y0, x0 + w, y0 + h)).save(out_dir / 'effects' / '000_gather_power_aura.png')

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    total = sum(len(v) for v in manifest.values())
    print(f"Battle Overworld: {total} formas en {len(manifest)} personajes")
    for char, forms in sorted(manifest.items()):
        for form, e in forms.items():
            a = e['actor']
            print(f"  {char}/{form}: idle {a['idle']['width']}x{a['idle']['height']} | "
                  f"pose {a['gather_power_pose']['width']}x{a['gather_power_pose']['height']} | "
                  f"aura {e['effects']['gather_power_aura']['width']}x{e['effects']['gather_power_aura']['height']}")
    if not apply:
        print('\nDRY-RUN — pasa --apply para extraer los PNGs')


if __name__ == '__main__':
    main()
