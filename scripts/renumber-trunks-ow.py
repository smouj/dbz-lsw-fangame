#!/usr/bin/env python3
"""Renumerar trunks_base: OW/tile/composite a posiciones canónicas 027-030 (estilo goku).

El usuario pidió que trunks_base tenga el patrón canónico de las formas bien
configuradas (goku/vegeta/buu/future_trunks): 027/028 = overworld_actor_or_pose,
029 = battle_aura_tile, 030 = battle_aura_actor_composite.

Los frames añadidos estaban al final (035-038). Se reordenan:
  · 035 (OW idle)     -> 027
  · 036 (OW walk)     -> 028
  · 038 (aura tile)   -> 029
  · 037 (composite)   -> 030
  · 027-034 existentes -> 031-038 (desplazados)

El vínculo source→V9 se PRESERVA por contenido: los frames desplazados
(031-038) mantienen canonical_path = characters/trunks_kid/kid_trunks_normal/
frames/<nº original>.png (su fuente real). Los OW/tile/composite (027-030) no
tienen fuente en el source V7 → canonical_path auto-referencial, old_refs con
la procedencia real (kid_trunks_super_saiyan / runtime).

Aplica en paquete V9 (tmp) + copia repo (sprites-source/catalog-v9).
"""
import json
import subprocess
from pathlib import Path

ROOTS = [
    Path('/home/local-user/.openclaw/workspace/.openclaw/tmp/v9/DBZ_LSW_SPRITES_PACKAGED_V9_RIGHTCANONICAL/forms_by_runtime'),
    Path('/home/local-user/.openclaw/workspace/dbz-lsw-fangame/sprites-source/catalog-v9/forms_by_runtime'),
]

FORM = 'trunks_base'
# old frame -> new frame
RENUMBER = {
    '035.png': '027.png',  # OW idle
    '036.png': '028.png',  # OW walk
    '038.png': '029.png',  # aura tile
    '037.png': '030.png',  # composite
    '027.png': '031.png', '028.png': '032.png', '029.png': '033.png',
    '030.png': '034.png', '031.png': '035.png', '032.png': '036.png',
    '033.png': '037.png', '034.png': '038.png',
}


def git_blob(p: Path):
    try:
        return subprocess.run(['git', 'hash-object', str(p)], capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ''


def apply(root: Path):
    fdir = root / FORM
    atomic = fdir / 'atomic'

    # ── 1) renombrar PNGs (vía temp para evitar colisiones) ──
    tmp_map = {}
    for old, new in RENUMBER.items():
        src = atomic / old
        if src.exists():
            tmp = atomic / f'.tmp_{old}'
            src.rename(tmp)
            tmp_map[old] = tmp
    for old, new in RENUMBER.items():
        if old in tmp_map:
            tmp_map[old].rename(atomic / new)
            print(f'   atomic {old} -> {new}')

    # ── 2) catálogo ──
    cat_path = fdir / 'catalog.json'
    catalog = json.load(open(cat_path))
    # aliases viejos ANTES de mutar (para el historial de renames)
    old_alias = {e['frame']: e['semantic_alias'] for e in catalog}
    old_bucket = {e['frame']: e['semantic_bucket'] for e in catalog}
    # old frame -> entry (antes de mutar)
    by_old = {e['frame']: e for e in catalog}
    new_catalog = []
    for e in catalog:
        old = e['frame']
        if old in RENUMBER:
            new = RENUMBER[old]
            e['frame'] = new
            e['canonical_id'] = f'trunks_kid/kid_trunks_normal/{new}'
            # canonical_path: contenido verdadero
            if new in ('027.png', '028.png', '029.png', '030.png'):
                e['canonical_path'] = f'forms_by_runtime/trunks_base/atomic/{new}'
                e['correction'] = 'added_2026-08-17_canonical_completeness'
                e['evidence'] = e.get('evidence', '') + ' | renumbered_to_canonical_027_030'
            else:
                # desplazado: la fuente real es el archivo original del source
                e['canonical_path'] = f'characters/trunks_kid/kid_trunks_normal/frames/{old}'
                e['correction'] = f'renumbered_2026-08-17_from_{old}'
                e['evidence'] = e.get('evidence', '') + f' | renumbered_from_{old}'
            # alias con nuevo src (idx por bucket se recalcula después)
        new_catalog.append(e)

    # recalcular aliases por bucket (orden por frame)
    buckets = {}
    for e in new_catalog:
        buckets.setdefault(e['semantic_bucket'], []).append(e)
    for bucket, entries in buckets.items():
        entries.sort(key=lambda e: int(e['frame'].split('.')[0]))
        for i, e in enumerate(entries, 1):
            e['semantic_alias'] = f"{FORM}__{bucket}__{i:02d}__src_{e['frame']}"

    new_catalog.sort(key=lambda e: int(e['frame'].split('.')[0]))
    json.dump(new_catalog, open(cat_path, 'w'), indent=2, ensure_ascii=False)
    open(cat_path, 'a').write('\n')

    # csv
    csv_path = fdir / 'catalog.csv'
    if csv_path.exists():
        header = csv_path.read_text().splitlines()[0]
        fnames = header.split(',')
        rows = [header]
        for e in new_catalog:
            rows.append(','.join(str(e.get(f, '')) for f in fnames))
        csv_path.write_bytes(('\r\n'.join(rows) + '\r\n').encode())
    print(f'   {FORM}: catalog.json/csv renumerado ({len(new_catalog)} filas)')

    # ── 3) named aliases: REGENERAR desde el catálogo (robusto, sin renames frágiles) ──
    named = fdir / 'named'
    if named.exists():
        for f in named.rglob('*.png'):
            f.unlink()
        # limpiar dirs vacíos
        for d in sorted(named.rglob('*'))[::-1]:
            if d.is_dir() and not any(d.iterdir()):
                d.rmdir()
    for e in new_catalog:
        nd = named / e['semantic_bucket']
        nd.mkdir(parents=True, exist_ok=True)
        src_png = atomic / e['frame']
        if src_png.exists():
            (nd / e['semantic_alias']).write_bytes(src_png.read_bytes())
    print(f'   named regenerado ({len(new_catalog)} aliases)')

    # ── 4) (sheets/buckets se regeneran con add-canonical-ow-frames.py abajo) ──

    # ── 5) atomic_sheet.json: fuentes de sprites con nuevo nº ──
    sj_path = fdir / 'spritesheets/atomic_sheet.json'
    if sj_path.exists():
        sj = json.load(open(sj_path))
        sprites = {}
        for old_name, s in sj.get('sprites', {}).items():
            new_name = RENUMBER.get(old_name, old_name)
            s['source'] = f'/mnt/data/DBZ_LSW_SPRITES_PACKAGED_V9_RIGHTCANONICAL/forms_by_runtime/trunks_base/atomic/{new_name}'
            sprites[new_name] = s
        sj['sprites'] = sprites
        json.dump(sj, open(sj_path, 'w'), indent=2, ensure_ascii=False)
        open(sj_path, 'a').write('\n')


for root in ROOTS:
    print(f'== {root.name} ==')
    apply(root)
print('DONE — regenera sheets con add-canonical-ow-frames.py (override beam -> 038)')
