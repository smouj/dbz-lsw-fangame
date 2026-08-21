#!/usr/bin/env python3
"""Auditoría de integridad sprites/manifests (bugs de datos)."""
import json, os, re

ISSUES = []
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def add(msg):
    ISSUES.append(msg)
    print(" ", msg)

# 1. FORMS vs SPRITE_DIRS vs manifests
src = open(os.path.join(ROOT, 'src/data/roster.ts')).read()
forms = re.findall(r"^\s*'([\w]+)':\s*\{", src, re.M)

sm = open(os.path.join(ROOT, 'src/data/spriteManifest.ts')).read()
start = sm.index('const SPRITE_DIRS')
end = sm.index('};', start)
block = sm[start:end]
pairs = re.findall(r"'([\w]+)'\s*:\s*'([\w]+)'", block)
sprite_dirs = {}
for k, v in pairs:
    sprite_dirs[k] = v

sprites_root = os.path.join(ROOT, 'public/assets/sprites')
real_manifests = set(d for d in os.listdir(sprites_root) if os.path.isdir(os.path.join(sprites_root, d)))

for f in forms:
    d = sprite_dirs.get(f, f)
    if d not in real_manifests:
        add(f"FORMA {f} → dir '{d}' SIN manifest en disco")
for d in sorted(real_manifests):
    if d not in sprite_dirs.values():
        add(f"DIR '{d}' en disco sin forma que lo use (huérfano)")

# 2. SPRITE_COUNTS generado vs manifests reales
counts_src = open(os.path.join(ROOT, 'src/data/generated/spriteCounts.generated.ts')).read()
counts = {}
for m in re.finditer(r'"([\w]+)": \{\s*"frames": (\d+),\s*"poses": (\d+)\s*\}', counts_src):
    counts[m.group(1)] = (m.group(2), m.group(3))

for d in sorted(real_manifests):
    m = json.load(open(os.path.join(sprites_root, d, 'manifest.json')))
    frames = sum(len(v.get('frames', [])) for v in m.values() if isinstance(v, dict))
    poses = len(m)
    gen = counts.get(d)
    if gen != (str(frames), str(poses)):
        add(f"SPRITE_COUNTS '{d}': generado={gen} real={frames}/{poses}")

# 3. poses requeridas
req = ['idle', 'move_front', 'move_back', 'guard', 'attack_fwd', 'attack_ud',
       'hurt', 'beam_charge', 'beam_fire', 'evade', 'gather_power', 'power_up']
for d in sorted(real_manifests):
    m = json.load(open(os.path.join(sprites_root, d, 'manifest.json')))
    for pose in req:
        if pose not in m or not m.get(pose, {}).get('frames'):
            add(f"MANIFEST '{d}': falta pose requerida '{pose}'")

# 4. manifest refs a archivos inexistentes
for d in sorted(real_manifests):
    m = json.load(open(os.path.join(sprites_root, d, 'manifest.json')))
    disk = set(os.listdir(os.path.join(sprites_root, d)))
    for pose, spec in m.items():
        for fm in spec.get('frames', []):
            if fm['file'] not in disk:
                add(f"ROTA '{d}/{fm['file']}' (pose {pose})")

print(f"\nTotal issues: {len(ISSUES)} | formas={len(forms)} dirs={len(real_manifests)}")
