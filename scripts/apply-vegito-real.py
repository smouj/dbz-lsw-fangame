#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════
# apply-vegito-real.py — Reemplaza los sprites de Vegito (prestados de
# Goku SSJ por el import-v6) por los frames REALES de la hoja V6.
#
# Contexto: el import-v6 puenteó vegito contra 23_goku/super_saiyan porque
# el matcher no encontró homólogos V6 (siluetas distintas) → el juego usaba
# Goku SSJ para Vegito. La hoja V6 (characters/vegito/base/) SÍ tiene los
# frames reales (naranja-rojo 240,80,0, silueta propia).
#
# Mapeo pose → frame V6 (por IoU contra las poses etiquetadas del FIXED de
# Goku + old_refs del index V6 + verificación visual):
#   idle #001 · move #011,#010,#012 · guard #003,#004,#002
#   attack_fwd #018,#022,#027,#028,#029,#030,#052
#   attack_ud #024,#026,#025,#021 · hurt #014,#015,#016,#017,#019,#023,#013
#   beam_charge #032,#037,#040,#054 · beam_fire #020,#043,#045,#048,#049
# Todos se flipean (la hoja de Vegito está espejada vs el estándar del
# juego; facing permanece 'right').
#
# Chibis overworld: V6#008 (14x15, silueta propia distinta de Goku, mirando
# derecha) para SSJ; recolor de pelo → negro para base.
#
# Uso: python3 scripts/apply-vegito-real.py <v6root>
# ═══════════════════════════════════════════════════════════════════
import sys, os, json, shutil, glob
from PIL import Image

V6_ROOT = sys.argv[1]
REPO = os.getcwd()
SPR = os.path.join(REPO, 'public/assets/sprites')
OW = os.path.join(REPO, 'public/assets/overworld/panel_sprites')
SRC = os.path.join(V6_ROOT, 'characters/vegito/base/frames')

BLACK = (40, 40, 40)

MAP = {
    'idle': [1],
    'move_front': [11, 12],
    'guard': [3, 4, 2],
    'attack_fwd': [18, 22, 27, 28, 29, 30, 52],
    'attack_ud': [24, 26, 25, 21],
    'hurt': [14, 15, 16, 17, 19, 23, 13],
    'beam_charge': [32, 37, 40, 54],
    'beam_fire': [20, 43, 45, 48, 49],
}
FPS = {'idle': 3, 'move_front': 6, 'move_back': 6, 'guard': 6, 'attack_fwd': 5,
       'attack_ud': 5, 'hurt': 6, 'beam_charge': 7, 'beam_fire': 8}
LOOP = {'idle': True, 'move_front': True, 'move_back': True, 'guard': False,
        'attack_fwd': False, 'attack_ud': False, 'hurt': False,
        'beam_charge': False, 'beam_fire': False}

def get(n):
    return Image.open(os.path.join(SRC, f'{n:03d}.png')).convert('RGBA')

def recolor_hair(img):
    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()
    n = 0
    for y in range(int(h * 0.45)):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 200 and r >= 225 and g >= 225 and b >= 150 and b <= 240:
                px[x, y] = BLACK + (255,)
                n += 1
    return img, n

def main():
    target = os.path.join(SPR, 'vegito_ssj')
    for f in glob.glob(target + '/*.png'):
        os.remove(f)
    manifest = {}
    sizes = {}
    for pose, nums in MAP.items():
        frames = []
        for i, n in enumerate(nums):
            img = get(n).transpose(Image.FLIP_LEFT_RIGHT)  # normalizar a derecha
            w, h = img.size
            name = f'vegito_ssj_{pose}_{i:02d}'
            img.save(os.path.join(target, name + '.png'))
            frames.append({'name': name, 'file': name + '.png', 'w': w, 'h': h})
            sizes[name] = (w, h)
        manifest[pose] = {'frame_count': len(frames), 'fps': FPS[pose], 'loop': LOOP[pose], 'frames': frames}
    # move_back = copia de move_front (el juego espeja con scaleX(-1))
    mf = manifest['move_front']
    mb_frames = [dict(f) for f in mf['frames']]
    for f, orig in zip(mb_frames, mf['frames']):
        f['name'] = orig['name'].replace('move_front', 'move_back')
        f['file'] = orig['file'].replace('move_front', 'move_back')
    manifest['move_back'] = {'frame_count': len(mb_frames), 'fps': FPS['move_back'],
                             'loop': LOOP['move_back'], 'frames': mb_frames}
    for f in mb_frames:
        shutil.copyfile(os.path.join(target, f['file'].replace('move_back', 'move_front')),
                        os.path.join(target, f['file']))
    with open(os.path.join(target, 'manifest.json'), 'w') as fh:
        json.dump(manifest, fh, indent=1)
        fh.write('\n')

    # vegito_base = recolor pelo → negro
    base_dir = os.path.join(SPR, 'vegito_base')
    for f in glob.glob(base_dir + '/*.png'):
        os.remove(f)
    bm = json.loads(json.dumps(manifest))  # deep copy
    total = 0
    for pose, entry in manifest.items():
        for f in entry['frames']:
            img = Image.open(os.path.join(target, f['file']))
            new_img, n = recolor_hair(img)
            total += n
            bf = f['name'].replace('vegito_ssj_', 'vegito_base_')
            new_img.save(os.path.join(base_dir, bf + '.png'))
            for bf_ent in bm[pose]['frames']:
                if bf_ent['name'] == f['name']:
                    bf_ent['name'] = bf
                    bf_ent['file'] = bf + '.png'
    with open(os.path.join(base_dir, 'manifest.json'), 'w') as fh:
        json.dump(bm, fh, indent=1)
        fh.write('\n')

    # chibis overworld: V6#008 (SSJ) + recolor (base)
    chibi = get(8)
    chibi.save(os.path.join(OW, 'vegito_ssj_ow.png'))
    base_chibi, n = recolor_hair(chibi)
    base_chibi.save(os.path.join(OW, 'vegito_base_ow.png'))

    print(f'✅ vegito_ssj: {sum(len(v["frames"]) for v in manifest.values())} frames reales V6')
    print(f'✅ vegito_base: recolor {total} px pelo → negro')
    print(f'✅ chibis: ssj={chibi.size} base={base_chibi.size} ({n} px recolor)')

if __name__ == '__main__':
    main()
