#!/usr/bin/env python3
"""Normalización canónica de facing: TODOS los sprites miran a la DERECHA.

Los 9 directorios con NATIVE_STRIKE_DIR='left' (análisis windup/golpe de
docs/audit/native-strike-dir.json) se espejan horizontalmente para que su
golpe nativo pase a ser 'right'. El flip runtime (facingFlip) sigue
compensando por lado, así que el render en batalla NO cambia; lo que cambia
es la orientación canónica de los assets (panel dev, previews, consistencia).

Uso: python3 scripts/normalize-facing-right.py [--apply]
Sin --apply: dry-run (lista archivos a tocar).
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPRITES = ROOT / 'public/assets/sprites'

LEFT_DIRS = [
    'goku_super_saiyan',      # goku_ssj
    'goku_super_saiyan_3',    # goku_ssj3
    'gohan_super_saiyan_1_2', # gohan_teen_ssj / teen_ssj2
    'goten_super_saiyan',     # goten_ssj
    'gotenks_super_saiyan',   # gotenks_ssj
    'gotenks_super_saiyan_3', # gotenks_ssj3
    'piccolo_base',           # piccolo_base/kami/evil
    'super_buu_base',         # buu_super
    'kid_trunks_super_saiyan',# trunks_kid_ssj
]

def mirror_png(path: Path) -> None:
    try:
        from PIL import Image
    except ImportError:
        sys.exit('PIL no instalado: pip install pillow')
    img = Image.open(path).convert('RGBA')
    img = img.transpose(Image.FLIP_LEFT_RIGHT)
    img.save(path)

def main() -> None:
    apply = '--apply' in sys.argv
    total = 0
    for d in LEFT_DIRS:
        dpath = SPRITES / d
        if not dpath.is_dir():
            print(f'  ! falta dir: {d}')
            continue
        pngs = sorted(dpath.glob('*.png'))
        print(f'{d}: {len(pngs)} png')
        total += len(pngs)
        if apply:
            for p in pngs:
                mirror_png(p)
    print(f'\nTotal: {total} archivos')
    if not apply:
        print('DRY-RUN — pasa --apply para espejar de verdad')
    else:
        print('APLICADO: todos los sprites de esos directorios miran a la derecha')

if __name__ == '__main__':
    main()
