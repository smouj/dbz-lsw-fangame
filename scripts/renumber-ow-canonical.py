#!/usr/bin/env python3
"""Renumerar OW/tile/composite a posiciones canónicas 027-030 (estilo goku).

2026-08-17 — El usuario reportó que Nappa sigue con el powerup de overworld
"no del todo correcto", igual que le pasaba a trunks: los frames OW/tile/
composite estaban al final (038-040) en vez de las posiciones canónicas
(027-029, estilo goku/vegeta/buu). Se renumeran también gotenks_ssj3 (045-047,
mismo caso: frames añadidos al final por completitud).

  nappa_base:
    · 038 (OW idle)   -> 027
    · 039 (aura tile) -> 028
    · 040 (composite) -> 029
    · 027-037 (combate) -> 030-040 (desplazados, contenido preservado)
    · support 041-043 se mantienen

  gotenks_super_saiyan_3:
    · 045 (OW idle)   -> 027
    · 046 (aura tile) -> 028
    · 047 (composite) -> 029
    · 027-044 (combate) -> 030-047 (desplazados, contenido preservado)
    · support 048-050 se mantienen

El vínculo source→V9 se PRESERVA por contenido: los desplazados mantienen su
canonical_path original (fuente real del source); los OW/tile/composite
(027-029) quedan auto-referenciales con old_refs de procedencia. Los refs de
los frames support (old_refs/support_variant_of) se re-apuntan al número nuevo
del frame del ciclo.

Aplica en paquete V9 (tmp) + copia repo (sprites-source/catalog-v9) y
regenera sheets (atomic_sheet + by_bucket).

Uso: python3 scripts/renumber-ow-canonical.py
"""
import json
import sys
from pathlib import Path

ROOTS = [
    Path('generated/sprites/DBZ_LSW_SPRITES_PACKAGED_V9_RIGHTCANONICAL/forms_by_runtime'),
    Path('./sprites-source/catalog-v9/forms_by_runtime'),
]

# forma -> {old -> new}
PLANS = {
    'nappa_base': {
        '038.png': '027.png',  # OW idle
        '039.png': '028.png',  # aura tile
        '040.png': '029.png',  # composite
        # desplazados
        **{f'{n:03d}.png': f'{n+3:03d}.png' for n in range(27, 38)},
    },
    'gotenks_super_saiyan_3': {
        '045.png': '027.png',  # OW idle
        '046.png': '028.png',  # aura tile
        '047.png': '029.png',  # composite
        # desplazados
        **{f'{n:03d}.png': f'{n+3:03d}.png' for n in range(27, 45)},
    },
}

# buckets "canónicos" (los que van a 027-029) — para correction/evidence
CANON_BUCKETS = {'overworld_actor_or_pose', 'battle_aura_tile', 'battle_aura_actor_composite'}


def apply(root: Path, form: str, renumber: dict):
    fdir = root / form
    atomic = fdir / 'atomic'

    # ── 1) renombrar PNGs vía temp ──
    tmp_map = {}
    for old in renumber:
        src = atomic / old
        if src.exists():
            src.rename(atomic / f'.tmp_{old}')
            tmp_map[old] = atomic / f'.tmp_{old}'
    for old, new in renumber.items():
        if old in tmp_map:
            tmp_map[old].rename(atomic / new)
            print(f'   atomic {old} -> {new}')

    # ── 2) catálogo ──
    cat_path = fdir / 'catalog.json'
    catalog = json.load(open(cat_path))
    by_old = {e['frame']: e for e in catalog}
    old_path = {e['frame']: e.get('canonical_path', '') for e in catalog}
    old_evidence = {e['frame']: e.get('evidence', '') for e in catalog}
    new_catalog = []
    for e in catalog:
        old = e['frame']
        if old in renumber:
            new = renumber[old]
            e['frame'] = new
            if e['semantic_bucket'] in CANON_BUCKETS:
                # OW/tile/comp → posición canónica
                e['canonical_id'] = f'{form}/{new}'
                e['canonical_path'] = f'forms_by_runtime/{form}/atomic/{new}'
                e['correction'] = 'added_2026-08-17_canonical_completeness'
                e['evidence'] = old_evidence.get(old, '') + f' | renumbered_to_canonical_027_030'
            else:
                # desplazado: preservar el vínculo source real (path con nº viejo)
                e['canonical_path'] = old_path.get(old, '')
                e['correction'] = f'renumbered_2026-08-17_from_{old}'
                e['evidence'] = old_evidence.get(old, '') + f' | renumbered_from_{old}'
        new_catalog.append(e)

    # refs de los support (old_refs / support_variant_of) → número nuevo
    for e in new_catalog:
        for field in ('old_refs', 'support_variant_of'):
            v = e.get(field, '')
            if '/' in v:
                parts = v.split('/')
                if parts[-1] in renumber:
                    parts[-1] = renumber[parts[-1]]
                    e[field] = '/'.join(parts)

    # ── 3) aliases regenerados por bucket (src = frame actual) ──
    buckets = {}
    for e in new_catalog:
        buckets.setdefault(e['semantic_bucket'], []).append(e)
    for bucket, entries in buckets.items():
        entries.sort(key=lambda e: int(e['frame'].split('.')[0]))
        for i, e in enumerate(entries, 1):
            e['semantic_alias'] = f"{form}__{bucket}__{i:02d}__src_{e['frame']}"

    new_catalog.sort(key=lambda e: int(e['frame'].split('.')[0]))
    json.dump(new_catalog, open(cat_path, 'w'), indent=2, ensure_ascii=False)
    open(cat_path, 'a').write('\n')
    csv_path = fdir / 'catalog.csv'
    if csv_path.exists():
        header = csv_path.read_text().splitlines()[0]
        fnames = header.split(',')
        rows = [','.join(str(e.get(f, '')) for f in fnames) for e in new_catalog]
        csv_path.write_bytes((header + '\r\n' + '\r\n'.join(rows) + '\r\n').encode())

    # ── 4) named regenerado ──
    named = fdir / 'named'
    if named.exists():
        for f in named.rglob('*.png'):
            f.unlink()
        for d in sorted(named.rglob('*'))[::-1]:
            if d.is_dir() and not any(d.iterdir()):
                d.rmdir()
    for e in new_catalog:
        nd = named / e['semantic_bucket']
        nd.mkdir(parents=True, exist_ok=True)
        src_png = atomic / e['frame']
        if src_png.exists():
            (nd / e['semantic_alias']).write_bytes(src_png.read_bytes())
    print(f'   {form}: catalog + named regenerados ({len(new_catalog)} filas)')

    # ── 5) atomic_sheet.json: fuentes con nuevo nº ──
    sj_path = fdir / 'spritesheets/atomic_sheet.json'
    if sj_path.exists():
        sj = json.load(open(sj_path))
        sprites = {}
        for old_name, s in sj.get('sprites', {}).items():
            new_name = renumber.get(old_name, old_name)
            s['source'] = f'/mnt/data/DBZ_LSW_SPRITES_PACKAGED_V9_RIGHTCANONICAL/forms_by_runtime/{form}/atomic/{new_name}'
            sprites[new_name] = s
        sj['sprites'] = sprites
        json.dump(sj, open(sj_path, 'w'), indent=2, ensure_ascii=False)
        open(sj_path, 'a').write('\n')


# importar rebuilds de add-canonical-ow-frames.py
sys.path.insert(0, str(Path(__file__).resolve().parent))
import importlib.util
_spec = importlib.util.spec_from_file_location('acof', str(Path(__file__).resolve().parent / 'add-canonical-ow-frames.py'))
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)

for root in ROOTS:
    print(f'== {root.name} ==')
    for form, renumber in PLANS.items():
        apply(root, form, renumber)
        fdir = root / form
        catalog = json.load(open(fdir / 'catalog.json'))
        A.rebuild_atomic_sheet(fdir, catalog)
        buckets = sorted({e['semantic_bucket'] for e in catalog})
        for bucket in buckets:
            entries = [(e['frame'], e['semantic_alias']) for e in catalog if e['semantic_bucket'] == bucket]
            A.rebuild_bucket(fdir, bucket, entries)
print('DONE')
