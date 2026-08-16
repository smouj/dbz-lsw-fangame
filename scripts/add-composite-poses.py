#!/usr/bin/env python3
"""
DBZ LSW — Reconstruir poses compuestas en manifests tras importar V6.1.

El importador V6.1 regenera manifests con SOLO las 9 poses base
(idle/move/guard/attack_fwd/attack_ud/hurt/beam_charge/beam_fire).
Este script re-añade las poses compuestas del contrato V1
(docs/FRAMES_ACTIONS_SPEC.md) usando los PNG físicos existentes:

  move_front      = [idle_00, move_front_01]   (2 frames, 6fps loop)
  move_back       = [idle_00, move_back_01]
  punch_right     = [idle_00, attack_fwd_00..02]
  punch_left      = [idle_00, attack_fwd_03..06]
  kick_right      = [idle_00, attack_ud_00..03]
  knockback_back  = [hurt_00..05]
  knockback_up    = [hurt_00,01,02,05]
  knockback_down  = [hurt_02,03,04,05]
  beam_guard      = [guard_00..02]
  evade           = [idle_00, guard_01, idle_00]
  gather_power    = [beam_charge_00..03]  (6fps loop)
  power_up        = [beam_charge_00..03]  (10fps loop)
  beam_ray        = frames beam_ray_00..NN si existen
  beam_ray_tip    = frames beam_ray_tip_00..NN si existen

Uso: python3 scripts/add-composite-poses.py [--apply]
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(ROOT, "public", "assets", "sprites")

# fps/loop por pose compuesta (contrato runtime, spriteConfig.ts)
POSE_CONTRACT = {
    'move_front': {'fps': 6, 'loop': True},
    'move_back': {'fps': 6, 'loop': True},
    'punch_right': {'fps': 7, 'loop': False},
    'punch_left': {'fps': 7, 'loop': False},
    'kick_right': {'fps': 7, 'loop': False},
    'knockback_back': {'fps': 7, 'loop': False},
    'knockback_up': {'fps': 7, 'loop': False},
    'knockback_down': {'fps': 7, 'loop': False},
    'beam_guard': {'fps': 6, 'loop': False},
    'evade': {'fps': 10, 'loop': False},
    'gather_power': {'fps': 6, 'loop': True},
    'power_up': {'fps': 10, 'loop': True},
    'beam_ray': {'fps': 7, 'loop': False},
    'beam_ray_tip': {'fps': 7, 'loop': False},
}


def file_exists(d, name):
    return os.path.exists(os.path.join(d, name))


def frames_for(d, prefix, indexes):
    """Devuelve [{name, file, w, h}] para los índices existentes."""
    out = []
    for i in indexes:
        fn = f"{prefix}_{i:02d}.png"
        if not file_exists(d, fn):
            continue
        from PIL import Image
        im = Image.open(os.path.join(d, fn))
        out.append({"name": fn.replace('.png', ''), "file": fn, "w": im.width, "h": im.height})
    return out


def build_pose(d, prefix, spec):
    """spec: lista de (familia, [indices]) → frames concatenados."""
    frames = []
    for fam, idxs in spec:
        frames.extend(frames_for(d, fam, idxs))
    return frames


def main():
    apply = '--apply' in sys.argv
    total_poses = 0
    for form_dir in sorted(os.listdir(SPRITES)):
        mpath = os.path.join(SPRITES, form_dir, 'manifest.json')
        if not os.path.exists(mpath):
            continue
        d = os.path.join(SPRITES, form_dir)
        m = json.load(open(mpath))
        changed = False

        # Limpieza: eliminar frames que referencian PNG inexistentes (la V6.1
        # eliminó beam_ray/beam_ray_tip y otros). Si una pose queda sin frames
        # tras limpiar, se elimina la pose entera. Además se RECALCULA w/h real
        # de cada frame (los PNG V6.1 tienen tamaños distintos a los viejos).
        from PIL import Image
        for pose in list(m.keys()):
            if not isinstance(m[pose], dict) or 'frames' not in m[pose]:
                continue
            frames = []
            for f in m[pose]['frames']:
                if not file_exists(d, f['file']):
                    continue
                im = Image.open(os.path.join(d, f['file']))
                frames.append({'name': f['file'].replace('.png', ''), 'file': f['file'],
                               'w': im.width, 'h': im.height})
            if len(frames) != len(m[pose]['frames']):
                changed = True
            if frames:
                m[pose]['frames'] = frames
                m[pose]['frame_count'] = len(frames)
            else:
                del m[pose]
                changed = True

        # idle_00 como base para poses que lo necesitan (punch/kick)
        idle0 = frames_for(d, f"{form_dir}_idle", [0])

        # ── move: convención V6.1 (move_00 pose inicial + move_01 paso) ──
        # La V6.1 NO reutiliza idle_00: tiene move_front_00 (pose de pie
        # propia) + move_front_01 (paso). El contrato V1 antiguo (idle+step)
        # ya no aplica a la nueva fuente de píxeles.
        for pose, step_fam in [('move_front', 'move_front'), ('move_back', 'move_back')]:
            frames = frames_for(d, f"{form_dir}_{step_fam}", [0, 1])
            if not frames:
                frames = frames_for(d, f"{form_dir}_{step_fam}", [0])
            if frames:
                m[pose] = {"frame_count": len(frames), "fps": 6, "loop": True, "frames": frames}
                changed = True
                total_poses += 1

        # ── punch/kick/knockback/beam_guard/evade ──
        comp = {
            'punch_right': [(f"{form_dir}_idle", [0]), (f"{form_dir}_attack_fwd", [0, 1, 2])],
            'punch_left': [(f"{form_dir}_idle", [0]), (f"{form_dir}_attack_fwd", [3, 4, 5, 6])],
            'kick_right': [(f"{form_dir}_idle", [0]), (f"{form_dir}_attack_ud", [0, 1, 2, 3, 4, 5])],
            'knockback_back': [(f"{form_dir}_hurt", [0, 1, 2, 3, 4, 5, 6])],
            'knockback_up': [(f"{form_dir}_hurt", [0, 1, 2, 5])],
            'knockback_down': [(f"{form_dir}_hurt", [2, 3, 4, 5])],
            'beam_guard': [(f"{form_dir}_guard", [0, 1, 2])],
        }
        for pose, spec in comp.items():
            frames = build_pose(d, form_dir, spec)
            if frames:
                m[pose] = {"frame_count": len(frames), "fps": POSE_CONTRACT[pose]['fps'],
                           "loop": POSE_CONTRACT[pose]['loop'], "frames": frames}
                changed = True
                total_poses += 1

        # ── evade: move_back_00 → guard → move_back_00 (parpadeo defensivo) ──
        base = frames_for(d, f"{form_dir}_move_back", [0]) or idle0
        g1 = frames_for(d, f"{form_dir}_guard", [1]) or frames_for(d, f"{form_dir}_guard", [0])
        frames = base + g1 + base
        if frames:
            m['evade'] = {"frame_count": len(frames), "fps": 10, "loop": False, "frames": frames}
            changed = True
            total_poses += 1

        # ── gather_power / power_up: beam_charge (dedup por contenido) ──
        for pose, fps, loop in [('gather_power', 6, True), ('power_up', 10, True)]:
            frames = frames_for(d, f"{form_dir}_beam_charge", [0, 1, 2, 3])
            if not frames:
                frames = frames_for(d, f"{form_dir}_beam_charge", [0, 1, 2, 3, 4, 5])
            if frames:
                # dedup: quitar frames byte-idénticos consecutivos (mismo MD5)
                import hashlib
                uniq = []
                seen = set()
                for fr in frames:
                    h = hashlib.md5(open(os.path.join(d, fr['file']), 'rb').read()).hexdigest()
                    if h not in seen:
                        seen.add(h)
                        uniq.append(fr)
                m[pose] = {"frame_count": len(uniq), "fps": fps, "loop": loop, "frames": uniq}
                changed = True
                total_poses += 1

        # ── beam_ray / beam_ray_tip: frames existentes (V6.1 no los tiene) ──
        for pose in ['beam_ray', 'beam_ray_tip']:
            frames = []
            i = 0
            while True:
                fn = f"{form_dir}_{pose}_{i:02d}.png"
                if not file_exists(d, fn):
                    if i > 0:
                        break
                    i += 1
                    if i > 8:
                        break
                    continue
                from PIL import Image
                im = Image.open(os.path.join(d, fn))
                frames.append({"name": fn.replace('.png', ''), "file": fn, "w": im.width, "h": im.height})
                i += 1
            if frames:
                m[pose] = {"frame_count": len(frames), "fps": 7, "loop": False, "frames": frames}
                changed = True
                total_poses += 1

        if changed:
            if apply:
                json.dump(m, open(mpath, 'w'), indent=2, ensure_ascii=False)
                print(f"{form_dir}: poses compuestas añadidas")
            else:
                print(f"{form_dir}: pendiente ({len(m)} poses)")

    print(f"\n{total_poses} poses compuestas {'APLICADAS' if apply else 'pendientes'}")
    if not apply:
        print("Pasa --apply para escribir los manifests")


if __name__ == '__main__':
    main()
