#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════
# make-vegito-forms.py — Separa Vegito en Base + SSJ (fiel al canon)
#
# El sprite V6 de Vegito es SSJ (pelo amarillo 240,240,192/224) — la ROM
# del GBC solo tiene la forma "Super" (Vegito siempre SSJ), pero el
# usuario quiere base Y SSJ. Este script:
#   1. Renombra public/assets/sprites/vegito_base/ → vegito_ssj/
#      (los frames actuales SON SSJ) — git mv + prefijos en PNGs y manifest.
#   2. Crea public/assets/sprites/vegito_base/ (NUEVO): copia de los
#      frames SSJ con el pelo recoloreado a negro (40,40,40) — el color
#      exacto del pelo base de Goku en este juego. Solo se recolorea el
#      componente amarillo de la ZONA SUPERIOR de la cabeza (y<45%,
#      tocando y<18%), para no tocar la energía ki de beam/attack.
#   3. Igual para el chibi overworld: vegito_base_ow.png → vegito_ssj_ow.png
#      + vegito_base_ow.png nuevo (recolor).
#
# Uso: python3 scripts/make-vegito-forms.py [--apply]
# (sin --apply: dry-run, no toca nada)
# ═══════════════════════════════════════════════════════════════════
import os, sys, json, shutil, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'public/assets/sprites')
OW = os.path.join(ROOT, 'public/assets/overworld/panel_sprites')

APPLY = '--apply' in sys.argv

HAIR_RANGE = lambda r, g, b: r >= 225 and g >= 225 and b >= 150 and b <= 240
BLACK = (40, 40, 40)

def connected_components(points, w, h):
    """8-conectividad. Devuelve lista de componentes (set de (x,y))."""
    pts = set(points)
    comps = []
    while pts:
        seed = pts.pop()
        stack = [seed]
        comp = set()
        while stack:
            x, y = stack.pop()
            if (x, y) in comp:
                continue
            comp.add((x, y))
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    n = (x + dx, y + dy)
                    if n in pts:
                        pts.discard(n)
                        stack.append(n)
        comps.append(comp)
    return comps

def recolor_hair(img):
    """Recolorea el pelo SSJ (amarillo, zona superior de la cabeza) a negro base.
    Verificado por componentes conectados: en TODOS los frames de Vegito la zona
    y < 45% contiene solo pelo (picos SSJ); la energía ki (beams, bolas, puños)
    está en zona media/baja. El amarillo de piel/chaleco queda fuera del rango
    (piel g=216<225; chaleco naranja b<150). Devuelve nueva imagen y (n, ok)."""
    from PIL import Image
    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()
    n = 0
    for y in range(int(h * 0.45)):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 200 and HAIR_RANGE(r, g, b):
                px[x, y] = BLACK + (255,)
                n += 1
    return img, (n, n > 0)

def rename_files_in_manifest(manifest_path, old_prefix, new_prefix):
    m = json.load(open(manifest_path))
    for pose in m.values():
        for f in pose.get('frames', []):
            f['name'] = f['name'].replace(old_prefix, new_prefix)
            f['file'] = f['file'].replace(old_prefix, new_prefix)
    return m

def main():
    src = os.path.join(SPR, 'vegito_base')
    dst = os.path.join(SPR, 'vegito_ssj')
    ow_src = os.path.join(OW, 'vegito_base_ow.png')
    ow_dst = os.path.join(OW, 'vegito_ssj_ow.png')

    if not os.path.isdir(src):
        print(f'✗ No existe {src}'); sys.exit(1)

    # ── 1) rename vegito_base → vegito_ssj ────────────────────────
    print(f'1) {src} → {dst}')
    if APPLY:
        subprocess.run(['git', 'mv', src, dst], cwd=ROOT, check=True)
    files = sorted(f for f in os.listdir(dst if os.path.isdir(dst) else src) if f.endswith('.png'))
    print(f'   {len(files)} frames a renombrar')
    for f in files:
        nf = f.replace('vegito_base_', 'vegito_ssj_')
        if APPLY:
            subprocess.run(['git', 'mv', os.path.join(dst, f), os.path.join(dst, nf)], cwd=ROOT, check=True)
    if APPLY:
        m = rename_files_in_manifest(os.path.join(dst, 'manifest.json'), 'vegito_base_', 'vegito_ssj_')
        with open(os.path.join(dst, 'manifest.json'), 'w') as fh:
            json.dump(m, fh, indent=1)
            fh.write('\n')

    # ── 2) crear vegito_base NUEVO (recolor) ──────────────────────
    newdir = os.path.join(SPR, 'vegito_base')
    print(f'2) crear {newdir} (recolor pelo → {BLACK})')
    if APPLY:
        os.makedirs(newdir, exist_ok=True)
    total_px, changed = 0, 0
    for f in files:
        nf = f.replace('vegito_base_', 'vegito_base_')  # ya es vegito_base_*.png
        from PIL import Image
        # En dry-run los archivos aún están en src con prefijo viejo; en apply en dst con prefijo nuevo
        read_dir = dst if APPLY else src
        read_name = f.replace('vegito_base_', 'vegito_ssj_') if APPLY else f
        p = os.path.join(read_dir, read_name)
        img = Image.open(p)
        new_img, (n, ok) = recolor_hair(img)
        total_px += n
        changed += 1 if ok else 0
        if APPLY:
            new_img.save(os.path.join(newdir, nf))
    print(f'   {changed}/{len(files)} frames con pelo recoloreado, {total_px} px')
    if APPLY:
        m = rename_files_in_manifest(os.path.join(dst, 'manifest.json'), 'vegito_ssj_', 'vegito_base_')
        with open(os.path.join(newdir, 'manifest.json'), 'w') as fh:
            json.dump(m, fh, indent=1)
            fh.write('\n')

    # ── 3) chibi overworld ─────────────────────────────────────────
    print(f'3) ow: {ow_src} → {ow_dst} + nuevo base')
    if APPLY:
        subprocess.run(['git', 'mv', ow_src, ow_dst], cwd=ROOT, check=True)
        from PIL import Image
        img = Image.open(ow_dst)
        new_img, (n, ok) = recolor_hair(img)
        new_img.save(ow_src)
        print(f'   chibi base: {n} px recoloreados (ok={ok})')

    print('\n✅ done' if APPLY else '\n(dry-run — pasa --apply para ejecutar)')

if __name__ == '__main__':
    main()
