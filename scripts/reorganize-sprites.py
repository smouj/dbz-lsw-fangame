#!/usr/bin/env python3
"""
DBZ LSW — Reorganización completa de sprites de personajes.

OBJETIVO: Crear una estructura perfecta en _output/ con:
1. Nombres de directorio canónicos (form IDs)
2. Nombres de archivo limpios y consistentes
3. Frames de aura recortados (64x56 → sprite individual con transparencia)
4. Effects integrados dentro de cada personaje
5. Manifests actualizados con los nuevos filenames
6. Sin duplicados: los frames compartidos se declaran una vez y se referencian

ESTRUCTURA DE SALIDA:
  _output/
    goku_base/
      manifest.json          ← nombres nuevos
      goku_base_idle_00.png
      goku_base_attack_fwd_00.png
      ...
      goku_base_aura_power_00.png  ← RECORTADO (antes 64x56)
      goku_base_effect_01.png     ← effects integrados
      ...
    goku_ssj/
      manifest.json
      ...
"""

import json
import os
import shutil
import hashlib
from pathlib import Path
from PIL import Image

BASE = Path('/home/local-user/.openclaw/workspace/dbz-lsw-fangame/public/assets/sprites')
OUTPUT = BASE / '_output'
EFFECTS = BASE / 'effects'

# ─── Mapping: form_id canónico → dir original ───
# Esto viene de SPRITE_DIRS en spriteManifest.ts pero invertido
# El form_id es la CLAVE, el dir es el VALOR
FORM_TO_DIR = {
    'goku_base': 'goku_base',
    'goku_ssj': 'goku_super_saiyan',
    'goku_ssj2': 'goku_super_saiyan_2',
    'goku_ssj3': 'goku_super_saiyan_3',
    'vegeta_base': 'vegeta_base',
    'vegeta_ssj': 'vegeta_super_saiyan_majin',
    'vegeta_majin': 'vegeta_super_saiyan_majin',
    'gohan_young': 'young_gohan_base',
    'gohan_young_ssj': 'young_gohan_super_saiyan',
    'gohan_young_ssj2': 'young_gohan_super_saiyan_2',
    'gohan_adult_ssj': 'gohan_super_saiyan_1_2',
    'gohan_adult_ssj2': 'gohan_super_saiyan_1_2',
    'gohan_adult_ultimate': 'gohan_ultimate',
    'trunks_kid': 'trunks_base',
    'trunks_kid_ssj': 'kid_trunks_super_saiyan',
    'trunks_future': 'future_trunks_base',
    'trunks_ssj': 'future_trunks_super_saiyan',
    'goten_base': 'goten_base',
    'goten_ssj': 'goten_super_saiyan',
    'gotenks_ssj': 'gotenks_super_saiyan',
    'gotenks_ssj3': 'gotenks_super_saiyan_3',
    'piccolo_base': 'piccolo_base',
    'piccolo_kami': 'piccolo_base',
    'piccolo_evil': 'piccolo_base',
    'krillin_base': 'krillin_base',
    'frieza_final': 'frieza_base',
    'cell_imperfect': 'cell_imperfect_form',
    'cell_semi': 'cell_semi_perfect_form',
    'cell_perfect': 'cell_perfect',
    'cell_jr': 'cell_jr_base',
    'android_16': 'android_16_base',
    'android_17': 'android_17_base',
    'android_18': 'android_18_base',
    'android_19': 'android_19_base',
    'android_20': 'android_20_base',
    'ginyu': 'ginyu_base',
    'ginyu_goku': 'ginyu_gokus_body',
    'recoome': 'recoome_base',
    'guldo': 'guldo_base',
    'jeice': 'jeice_base',
    'burter': 'burter_base',
    'nappa': 'nappa_base',
    'buu_base': 'buu_base',
    'buu_super': 'super_buu_base',
    'buu_gotenks': 'buu_gotenks_absorbed',
    'buu_gohan': 'buu_gohan_absorbed',
    'buu_kid': 'kid_buu_base',
    'vegito_ssj': 'vegito_ssj',
}

# Forms que comparten directorio (solo crear el dir una vez)
# La primera entrada es la "primaria" — las demás son alias
SHARED_DIRS = {
    'vegeta_super_saiyan_majin': ['vegeta_ssj', 'vegeta_majin'],
    'young_gohan_base': ['gohan_young'],
    'gohan_super_saiyan_1_2': ['gohan_adult_ssj', 'gohan_adult_ssj2'],
    'piccolo_base': ['piccolo_base', 'piccolo_kami', 'piccolo_evil'],
    'frieza_base': ['frieza_final'],
    'trunks_base': ['trunks_kid'],
    'kid_trunks_super_saiyan': ['trunks_kid_ssj'],
    'future_trunks_base': ['trunks_future'],
    'future_trunks_super_saiyan': ['trunks_ssj'],
    'cell_imperfect_form': ['cell_imperfect'],
    'cell_semi_perfect_form': ['cell_semi'],
    'cell_jr_base': ['cell_jr'],
    'android_16_base': ['android_16'],
    'android_17_base': ['android_17'],
    'android_18_base': ['android_18'],
    'android_19_base': ['android_19'],
    'android_20_base': ['android_20'],
    'ginyu_base': ['ginyu'],
    'ginyu_gokus_body': ['ginyu_goku'],
    'recoome_base': ['recoome'],
    'guldo_base': ['guldo'],
    'jeice_base': ['jeice'],
    'burter_base': ['burter'],
    'nappa_base': ['nappa'],
    'super_buu_base': ['buu_super'],
    'buu_gotenks_absorbed': ['buu_gotenks'],
    'buu_gohan_absorbed': ['buu_gohan'],
    'kid_buu_base': ['buu_kid'],
}


def crop_aura_frame(img_path: Path, output_path: Path):
    """Recortar un frame de aura 64x56 al sprite individual con transparencia."""
    img = Image.open(img_path).convert('RGBA')
    w, h = img.size
    
    if w != 64 or h != 56:
        # Ya está recortado o tiene tamaño inesperado — copiar tal cual
        shutil.copy2(img_path, output_path)
        return
    
    # Encontrar bounding box de píxeles no transparentes
    bbox = img.getbbox()
    if bbox is None:
        # Imagen completamente transparente — guardar vacía de 1x1
        empty = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
        empty.save(output_path)
        return
    
    # Añadir 2px de padding alrededor para no cortar el aura
    pad = 2
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(w, bbox[2] + pad)
    bottom = min(h, bbox[3] + pad)
    
    cropped = img.crop((left, top, right, bottom))
    cropped.save(output_path)


def normalize_filename(old_name: str, form_id: str, old_dir: str) -> str:
    """
    Normalizar nombre de archivo:
    - Cambiar prefijo del dir original por el form_id canónico
    - Los double underscore de effects → simple underscore
    """
    # Effects: goku_base__effect_01.png → goku_base_effect_01.png
    if '__effect_' in old_name:
        return old_name.replace('__effect_', '_effect_')
    
    # Sprites normales: goku_super_saiyan_idle_00.png → goku_ssj_idle_00.png
    # Reemplazar prefijo del directorio viejo por el form_id
    if old_name.startswith(old_dir + '_'):
        return form_id + old_name[len(old_dir):]
    
    return old_name


def build_new_manifest(old_manifest: dict, form_id: str, old_dir: str, 
                        new_files_map: dict, new_dimensions: dict) -> dict:
    """
    Construir manifest nuevo con filenames normalizados.
    
    new_files_map: {old_filename: new_filename}
    new_dimensions: {new_filename: (w, h)}
    """
    new_manifest = {}
    
    for pose_name, pose_data in old_manifest.items():
        if not isinstance(pose_data, dict) or 'frames' not in pose_data:
            continue
        
        new_frames = []
        for fr in pose_data['frames']:
            old_file = fr['file']
            new_file = new_files_map.get(old_file, old_file)
            
            # Actualizar dimensiones si el frame fue recortado
            dims = new_dimensions.get(new_file, (fr.get('w', 0), fr.get('h', 0)))
            
            new_fr = {
                'name': new_file.replace('.png', ''),
                'file': new_file,
                'w': dims[0],
                'h': dims[1],
            }
            new_frames.append(new_fr)
        
        new_manifest[pose_name] = {
            'frame_count': pose_data['frame_count'],
            'fps': pose_data['fps'],
            'loop': pose_data['loop'],
            'frames': new_frames,
        }
    
    return new_manifest


def main():
    print("🐉 DBZ LSW — Reorganización de sprites")
    print("=" * 60)
    
    # Limpiar output
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    
    # Trackear dirs ya creados (para shared dirs)
    created_dirs = set()
    
    stats = {
        'dirs_created': 0,
        'files_copied': 0,
        'files_cropped': 0,
        'effects_integrated': 0,
        'manifests_updated': 0,
    }
    
    # Procesar cada form_id → dir original
    # Primero los dirs "primarios" (donde están los archivos)
    primary_dirs = {}
    for form_id, old_dir in FORM_TO_DIR.items():
        if old_dir not in primary_dirs:
            primary_dirs[old_dir] = form_id
    
    for old_dir, primary_form in primary_dirs.items():
        src_dir = BASE / old_dir
        
        if not src_dir.exists():
            print(f"  ⚠️  Dir no encontrado: {old_dir}")
            continue
        
        # Usar el form_id primario como nombre del directorio nuevo
        new_dir_name = primary_form
        dst_dir = OUTPUT / new_dir_name
        dst_dir.mkdir(parents=True, exist_ok=True)
        created_dirs.add(old_dir)
        stats['dirs_created'] += 1
        
        print(f"\n📁 {old_dir} → {new_dir_name}/")
        
        # Cargar manifest original
        manifest_path = src_dir / 'manifest.json'
        if not manifest_path.exists():
            print(f"  ⚠️  Sin manifest!")
            continue
        
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        # Mapa de filenames viejos → nuevos
        new_files_map = {}
        new_dimensions = {}
        
        # Copiar y normalizar sprites
        for png_file in sorted(src_dir.glob('*.png')):
            old_name = png_file.name
            new_name = normalize_filename(old_name, new_dir_name, old_dir)
            dst_file = dst_dir / new_name
            
            # Verificar si es un frame de aura (64x56)
            img = Image.open(png_file)
            is_aura = (img.width == 64 and img.height == 56)
            
            if is_aura:
                # Recortar
                crop_aura_frame(png_file, dst_file)
                cropped = Image.open(dst_file)
                new_dimensions[new_name] = (cropped.width, cropped.height)
                stats['files_cropped'] += 1
                print(f"  ✂️  {old_name} → {new_name} ({img.width}x{img.height} → {cropped.width}x{cropped.height})")
            else:
                shutil.copy2(png_file, dst_file)
                stats['files_copied'] += 1
            
            new_files_map[old_name] = new_name
        
        # Integrar effects si existen
        effect_dir = EFFECTS / old_dir
        if effect_dir.exists():
            for eff_file in sorted(effect_dir.glob('*.png')):
                old_name = eff_file.name
                new_name = normalize_filename(old_name, new_dir_name, old_dir)
                dst_file = dst_dir / new_name
                
                shutil.copy2(eff_file, dst_file)
                stats['effects_integrated'] += 1
                print(f"  🎨 {old_name} → {new_name} (effect integrado)")
        
        # Generar manifest nuevo
        new_manifest = build_new_manifest(manifest, new_dir_name, old_dir, 
                                          new_files_map, new_dimensions)
        
        # Añadir effects al manifest si existen
        effect_dir = EFFECTS / old_dir
        if effect_dir.exists():
            eff_files = sorted(effect_dir.glob('*.png'))
            if eff_files:
                eff_frames = []
                for eff_file in eff_files:
                    new_name = normalize_filename(eff_file.name, new_dir_name, old_dir)
                    img = Image.open(eff_file)
                    eff_frames.append({
                        'name': new_name.replace('.png', ''),
                        'file': new_name,
                        'w': img.width,
                        'h': img.height,
                    })
                
                new_manifest['effects'] = {
                    'frame_count': len(eff_frames),
                    'fps': 10,
                    'loop': False,
                    'frames': eff_frames,
                }
        
        # Guardar manifest
        manifest_out = dst_dir / 'manifest.json'
        with open(manifest_out, 'w') as f:
            json.dump(new_manifest, f, indent=2, ensure_ascii=False)
        stats['manifests_updated'] += 1
        print(f"  📋 manifest.json actualizado ({len(new_manifest)} poses)")
    
    # ─── Forms que comparten dir (aliases) ───
    # No necesitan copiar archivos, solo referencian al dir primario
    print(f"\n🔗 Creando symlinks para formas compartidas...")
    for form_id, old_dir in FORM_TO_DIR.items():
        if form_id in primary_dirs.values():
            continue  # Ya es primario
        
        # Encontrar el form_id primario de este dir
        primary_form = primary_dirs.get(old_dir)
        if not primary_form:
            continue
        
        # Crear symlink: form_id → primary_form
        link_path = OUTPUT / form_id
        target = primary_form
        
        if not link_path.exists():
            os.symlink(target, link_path)
            print(f"  🔗 {form_id} → {primary_form}/")
    
    print(f"\n{'=' * 60}")
    print(f"✅ Reorganización completada!")
    print(f"  Directorios: {stats['dirs_created']}")
    print(f"  Archivos copiados: {stats['files_copied']}")
    print(f"  Frames de aura recortados: {stats['files_cropped']}")
    print(f"  Effects integrados: {stats['effects_integrated']}")
    print(f"  Manifests actualizados: {stats['manifests_updated']}")
    print(f"  Salida: {OUTPUT}")


if __name__ == '__main__':
    main()