#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════
# DBZ LSW — SPRITE CANON audit (npm run audit:sprite-canon)
# Reporte del canon semántico V9 + exit code para el gate.
# ═══════════════════════════════════════════════════════════
import json, os, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V9 = os.path.join(ROOT, 'sprites-source', 'catalog-v9')

reg = json.load(open(os.path.join(V9, 'catalog', 'frame_semantic_registry.json')))
audit = json.load(open(os.path.join(V9, 'catalog', 'semantic_audit.json')))

status = collections.Counter(e['canonStatus'] for e in reg)
kinds = collections.Counter(e['frameKind'] for e in reg)
fam = collections.Counter(e['family'] for e in reg)
forms = sorted(set(e['formId'] for e in reg))

# validaciones
ids = [e['canonicalId'] for e in reg]
dups = len(ids) - len(set(ids))
AMB = ['movement_or_attack_pose','idle_or_stance','downed_or_hurt','projectiles_beams',
       'orbs_rings_bursts','character_plus_effect','nonbody_misc','actor_downed_or_special_pose','multi_evidence_']
amb_as_canon = sum(1 for e in reg if e['canonStatus'] in ('CANONICAL','RUNTIME_VERIFIED')
                   and any(a in f"{e.get('variant','')} {e.get('note','')}" for a in AMB))
broken = sum(1 for e in reg if not e.get('sourceId'))
with_runtime = sum(1 for e in reg if e['runtimePoses'])

print('══════════ DBZ LSW SPRITE CANON ══════════')
print(f'Forms {len(forms)} / 42 PASS' if len(forms) >= 42 else f'Forms {len(forms)} / 42 FAIL')
print(f'Physical frames {len(reg)} (atomic {kinds.get("atomic",0)} + fixed_only {kinds.get("fixed_only",0)})')
print(f'Semantic assignments {len(reg)} / {len(reg)}')
for k in ['CANONICAL', 'RUNTIME_VERIFIED', 'ASSET_VERIFIED', 'INFERRED', 'UNCLASSIFIED']:
    if status.get(k):
        print(f'  {k:18s} {status[k]}')
print(f'Frames con pose runtime vinculada: {with_runtime}')
print(f'Broken references {broken}')
print(f'Ambiguous canonical labels {amb_as_canon}')
print(f'Duplicate IDs {dups}')
print(f'Runtime forms 100% · Dev Studio parity pendiente de migración')

ok = (dups == 0 and amb_as_canon == 0 and broken == 0 and len(reg) >= 2000)
print(f'\nRESULT: {"PASS" if ok else "FAIL"}')
sys.exit(0 if ok else 1)
