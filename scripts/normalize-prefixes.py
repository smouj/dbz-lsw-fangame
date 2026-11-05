#!/usr/bin/env python3
"""
Normalize all sprite filenames so prefix matches the directory (form_id).
Also updates manifest.json files to reflect the new filenames.

Categories of fixes:
1. Shared-form copies (vegeta_majin uses vegeta_ssj_ prefix → vegeta_majin_)
2. Effects with ROM names (goku_super_saiyan_effect → goku_ssj_effect)
3. All other mismatched prefixes

This script:
- Renames PNG files on disk
- Updates manifest.json frame references
- Reports all changes
"""

import os, json, shutil

SPRITES_DIR = 'public/assets/sprites'

# Mapping of old_prefix → new_prefix for each directory
# The key is the directory name (form_id), value is what the files currently start with
PREFIX_MAP = {
    # Shared-form copies: files use the source form's prefix
    'gohan_adult_ssj2': ('gohan_adult_ssj', 'gohan_adult_ssj2'),
    'piccolo_evil': ('piccolo_base', 'piccolo_evil'),
    'piccolo_kami': ('piccolo_base', 'piccolo_kami'),
    'vegeta_majin': ('vegeta_ssj', 'vegeta_majin'),
    
    # Effects with ROM names
    'buu_kid': ('kid_buu_base', 'buu_kid'),      # effect files
    'buu_super': ('super_buu_base', 'buu_super'),  # effect files
    'frieza_final': ('frieza_base', 'frieza_final'), # effect files (partial)
    'gohan_adult_ssj': ('gohan_super_saiyan_1_2', 'gohan_adult_ssj'),  # effect files
    'gohan_adult_ultimate': ('gohan_ultimate', 'gohan_adult_ultimate'), # effect files
    'gohan_young': ('young_gohan_base', 'gohan_young'),  # effect files
    'gohan_young_ssj': ('young_gohan_super_saiyan', 'gohan_young_ssj'),  # effect files
    'gohan_young_ssj2': ('young_gohan_super_saiyan_2', 'gohan_young_ssj2'),  # effect files
    'goku_ssj': ('goku_super_saiyan', 'goku_ssj'),  # effect files
    'goku_ssj3': ('goku_super_saiyan_3', 'goku_ssj3'),  # effect files
    'goten_ssj': ('goten_super_saiyan', 'goten_ssj'),  # effect files
    'gotenks_ssj': ('gotenks_super_saiyan', 'gotenks_ssj'),  # effect files
    'gotenks_ssj3': ('gotenks_super_saiyan_3', 'gotenks_ssj3'),  # effect files
    'trunks_future': ('future_trunks_base', 'trunks_future'),  # effect files
    'trunks_kid': ('trunks_base', 'trunks_kid'),  # effect files (partial)
    'trunks_kid_ssj': ('kid_trunks_super_saiyan', 'trunks_kid_ssj'),  # effect files
    'trunks_ssj': ('future_trunks_super_saiyan', 'trunks_ssj'),  # effect files
    'vegeta_ssj': ('vegeta_super_saiyan_majin', 'vegeta_ssj'),  # effect files (partial - majin effect)
}

def rename_files_in_dir(dir_name, old_prefix, new_prefix):
    """Rename all files in dir that start with old_prefix to start with new_prefix."""
    dir_path = os.path.join(SPRITES_DIR, dir_name)
    if not os.path.isdir(dir_path):
        print(f"  SKIP: {dir_name} directory not found")
        return []
    
    changes = []
    pngs = [f for f in os.listdir(dir_path) if f.endswith('.png')]
    
    for old_name in sorted(pngs):
        if old_name.startswith(old_prefix + '_'):
            # Replace old_prefix with new_prefix
            new_name = new_prefix + old_name[len(old_prefix):]
            old_path = os.path.join(dir_path, old_name)
            new_path = os.path.join(dir_path, new_name)
            
            if old_path != new_path:
                os.rename(old_path, new_path)
                changes.append((old_name, new_name))
    
    return changes

def update_manifest(dir_name, old_prefix, new_prefix):
    """Update manifest.json to reflect renamed files."""
    manifest_path = os.path.join(SPRITES_DIR, dir_name, 'manifest.json')
    if not os.path.exists(manifest_path):
        print(f"  SKIP: {dir_name}/manifest.json not found")
        return
    
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
    
    changed = False
    for pose_name, pose_data in manifest.items():
        if isinstance(pose_data, dict) and 'frames' in pose_data:
            for frame in pose_data['frames']:
                old_file = frame.get('file', '')
                if old_file.startswith(old_prefix + '_'):
                    new_file = new_prefix + old_file[len(old_prefix):]
                    frame['file'] = new_file
                    frame['name'] = new_file.replace('.png', '')
                    changed = True
    
    if changed:
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        print(f"  Updated {dir_name}/manifest.json")

def main():
    print("=== NORMALIZING FILENAME PREFIXES ===\n")
    
    total_renamed = 0
    
    for dir_name, (old_prefix, new_prefix) in PREFIX_MAP.items():
        print(f"\n{dir_name}: {old_prefix}_ → {new_prefix}_")
        changes = rename_files_in_dir(dir_name, old_prefix, new_prefix)
        
        if changes:
            print(f"  Renamed {len(changes)} files")
            for old, new in changes:
                print(f"    {old} → {new}")
            total_renamed += len(changes)
        else:
            print(f"  No files to rename")
        
        # Update manifest
        update_manifest(dir_name, old_prefix, new_prefix)
    
    print(f"\n\n=== TOTAL RENAMED: {total_renamed} files ===")

if __name__ == '__main__':
    main()