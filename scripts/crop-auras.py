#!/usr/bin/env python3
"""
DBZ LSW — Recorte inteligente de aura frames.

Los frames de aura_power y aura_support son tiles GBC completos (64x56)
que contienen el personaje + efecto de aura sin recortar.
Este script recorta cada frame al bounding box de sus píxeles opacos
con un padding de 1px, y actualiza el manifest con las nuevas dimensiones.
"""

import json
import os
from pathlib import Path
from PIL import Image

BASE = Path('/home/local-user/.openclaw/workspace/dbz-lsw-fangame/public/assets/sprites/_output')

AURA_POSES = {'aura_power', 'aura_support'}
PAD = 1  # Padding en píxeles

def smart_crop(img_path: Path, output_path: Path) -> tuple[int, int]:
    """Recortar al bounding box de píxeles opacos con padding."""
    img = Image.open(img_path).convert('RGBA')
    w, h = img.size
    
    # Si ya está bien recortado (no es 64x56), copiar tal cual
    if w != 64 or h != 56:
        img.save(output_path)
        return (w, h)
    
    # Encontrar bounding box de píxeles con alpha > 0
    alpha = img.split()[3]
    bbox = alpha.getbbox()
    if bbox is None:
        # Completamente transparente
        empty = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
        empty.save(output_path)
        return (1, 1)
    
    # Aplicar padding
    left = max(0, bbox[0] - PAD)
    top = max(0, bbox[1] - PAD)
    right = min(w, bbox[2] + PAD)
    bottom = min(h, bbox[3] + PAD)
    
    cropped = img.crop((left, top, right, bottom))
    cropped.save(output_path)
    return (cropped.width, cropped.height)


def main():
    print("✂️  Recortando aura frames...")
    stats = {'cropped': 0, 'skipped': 0, 'total': 0}
    
    for dir_path in sorted(BASE.iterdir()):
        if not dir_path.is_dir():
            continue
        if dir_path.is_symlink():
            continue
            
        manifest_path = dir_path / 'manifest.json'
        if not manifest_path.exists():
            continue
        
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        modified = False
        
        for pose_name, pose_data in manifest.items():
            if not isinstance(pose_data, dict) or 'frames' not in pose_data:
                continue
            
            if pose_name not in AURA_POSES:
                continue
            
            for i, fr in enumerate(pose_data['frames']):
                old_file = fr['file']
                old_path = dir_path / old_file
                
                if not old_path.exists():
                    continue
                
                img = Image.open(old_path)
                stats['total'] += 1
                
                # Solo recortar si es 64x56 (tile sin recortar)
                if img.width == 64 and img.height == 56:
                    new_w, new_h = smart_crop(old_path, old_path)  # In-place
                    fr['w'] = new_w
                    fr['h'] = new_h
                    modified = True
                    stats['cropped'] += 1
                    print(f"  ✂️  {dir_path.name}/{old_file}: 64x56 → {new_w}x{new_h}")
                else:
                    stats['skipped'] += 1
        
        if modified:
            with open(manifest_path, 'w') as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Recorte completado!")
    print(f"  Total aura frames: {stats['total']}")
    print(f"  Recortados: {stats['cropped']}")
    print(f"  Ya recortados: {stats['skipped']}")


if __name__ == '__main__':
    main()