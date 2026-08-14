#!/usr/bin/env python3
"""
DBZ LSW — Rename poses move_left/move_right → move_front/move_back.

Motivo (petición del usuario, 2026-08-15):
  · move_right → move_front : avanzar hacia el rival (FRONT en POSITION_DATA)
  · move_left  → move_back  : retroceder (BACK)

Semántica GBC: FRONT = mirar al rival, BACK = dar la espalda (espejo).
Los nombres left/right confundían porque dependen del lado del campo.

Alcance:
  1. Renombra los PNG `<dir>_move_right_NN.png` → `<dir>_move_front_NN.png`
     y `<dir>_move_left_NN.png` → `<dir>_move_back_NN.png` (git mv).
  2. Actualiza los 44 manifest.json (claves de pose + referencias file/name).
  3. Verifica que no queden referencias move_right/move_left en src/ ni manifests.

Uso: python3 scripts/rename-move-poses.py [--apply]
(sin --apply solo muestra el plan)
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(ROOT, "public", "assets", "sprites")

POSE_MAP = {
    "move_right": "move_front",
    "move_left": "move_back",
}


def git(args, cwd=ROOT):
    r = subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  git {' '.join(args)} FAILED: {r.stderr.strip()[:200]}")
    return r


def main():
    apply = "--apply" in sys.argv
    manifests = sorted(
        d for d in os.listdir(SPRITES)
        if os.path.isdir(os.path.join(SPRITES, d))
        and os.path.exists(os.path.join(SPRITES, d, "manifest.json"))
    )
    print(f"Formas con manifest: {len(manifests)}")
    if not apply:
        print("DRY RUN — pasa --apply para ejecutar")
        print("=" * 60)

    renamed_files = 0
    manifests_touched = 0

    for form in manifests:
        mdir = os.path.join(SPRITES, form)
        mpath = os.path.join(mdir, "manifest.json")
        with open(mpath, encoding="utf-8") as f:
            manifest = json.load(f)

        changed = False
        new_manifest = {}
        for pose, data in manifest.items():
            new_pose = POSE_MAP.get(pose, pose)
            if new_pose != pose:
                changed = True
            frames = []
            for fr in data.get("frames", []):
                fname = fr["file"]
                new_fname = fname
                for old, new in POSE_MAP.items():
                    if f"_{old}_" in new_fname:
                        new_fname = new_fname.replace(f"_{old}_", f"_{new}_")
                        new_name = fr.get("name", "")
                        if new_name:
                            fr = dict(fr)
                            fr["name"] = new_name.replace(f"_{old}_", f"_{new}_")
                frames.append(dict(fr, file=new_fname))
            nd = dict(data)
            nd["frames"] = frames
            new_manifest[new_pose] = nd

        if not changed:
            continue

        manifests_touched += 1
        if not apply:
            print(f"  [manifest] {form}: {sorted(manifest.keys())} -> {sorted(new_manifest.keys())}")
            continue

        # 1) renombrar PNGs con git mv
        for old_pose, new_pose in POSE_MAP.items():
            for fr in manifest.get(old_pose, {}).get("frames", []):
                old_f = os.path.join(mdir, fr["file"])
                new_f = os.path.join(mdir, fr["file"].replace(f"_{old_pose}_", f"_{new_pose}_"))
                if os.path.exists(old_f) and not os.path.exists(new_f):
                    git(["mv", old_f, new_f])
                    renamed_files += 1
        # 2) escribir manifest
        with open(mpath, "w", encoding="utf-8") as f:
            json.dump(new_manifest, f, indent=1, ensure_ascii=False)
            f.write("\n")

    if apply:
        print(f"Renombrados {renamed_files} PNG · manifests {manifests_touched}")
    else:
        print(f"  manifests a tocar: {manifests_touched}")


if __name__ == "__main__":
    main()
