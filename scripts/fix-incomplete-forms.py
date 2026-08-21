#!/usr/bin/env python3
"""Corrige las 2 formas con sprites incompletos (sin atomic_sheet V9):
   - goku_ssj2  → copia completa de goku_ssj  (el ROM no tiene sprites propios de SSJ2)
   - ginyu_goku → copia completa de goku_base (Ginyu en cuerpo de Goku = sprites de Goku)
Patrón canónico del proyecto: gohan_adult_ssj2 usa gohan_adult_ssj, piccolo_kami/evil
usan piccolo_base, vegeta_majin usa vegeta_ssj → formas sin sprites propios comparten.
"""
import os, json, shutil

def clone(src_form: str, dst_form: str, src_prefix: str, dst_prefix: str):
    src = f'public/assets/sprites/{src_form}'
    dst = f'public/assets/sprites/{dst_form}'
    shutil.copy(f'{dst}/manifest.json', f'{dst}/manifest.json.bak-incompleto')
    n = 0
    for f in os.listdir(src):
        if f.endswith('.png'):
            new = f.replace(src_prefix, dst_prefix, 1)
            shutil.copy(f'{src}/{f}', f'{dst}/{new}')
            n += 1
    m = json.load(open(f'{src}/manifest.json'))
    def rename_ref(fr):
        fr = dict(fr)
        fr['file'] = fr['file'].replace(src_prefix, dst_prefix, 1)
        return fr
    for v in m.values():
        if 'frames' in v:
            v['frames'] = [rename_ref(fr) for fr in v['frames']]
    json.dump(m, open(f'{dst}/manifest.json', 'w'), indent=2, ensure_ascii=False)
    print(f'{dst_form}: {n} PNGs copiados de {src_form}, manifest {len(m)} poses')

clone('goku_ssj', 'goku_ssj2', 'goku_ssj_', 'goku_ssj2_')
clone('goku_base', 'ginyu_goku', 'goku_base_', 'ginyu_goku_')
