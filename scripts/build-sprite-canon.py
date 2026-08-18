#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════
# DBZ LSW — V9 SEMANTIC CANON builder
# Deriva la semántica canónica de cada frame físico (2344: 1952
# atomic + 392 fixed_only) desde la EVIDENCIA runtime:
#   1. Manifest runtime (public/assets/sprites/<dir>/manifest.json):
#      pose → frames [archivo] (evidencia directa frame→pose).
#   2. form_pose_matrix/runtime_pose_contract: group/gameplay por pose.
#   3. frame_catalog.csv: bucket forense + coords + source.
# NUNCA inventa: los frames sin evidencia quedan UNCLASSIFIED.
# Salidas:
#   sprites-source/catalog-v9/catalog/frame_semantic_registry.json
#   <forms_by_runtime>/<form>/frame_manifest.json
#   src/data/generated/spriteCanon.generated.ts
#   sprites-source/catalog-v9/catalog/semantic_audit.json
# ═══════════════════════════════════════════════════════════
import json, os, sys, zlib, struct, hashlib, csv, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V9 = os.path.join(ROOT, 'sprites-source', 'catalog-v9')
FORMS = os.path.join(V9, 'forms_by_runtime')
SPRITES = os.path.join(ROOT, 'public', 'assets', 'sprites')

# ── Decodificador PNG mínimo (RGBA, sin interlacing) ────────
def png_visible(path):
    d = open(path, 'rb').read()
    if d[:8] != b'\x89PNG\r\n\x1a\n': return None
    w = struct.unpack('>I', d[16:20])[0]; h = struct.unpack('>I', d[20:24])[0]
    idat = b''; off = 8
    while off < len(d):
        ln = struct.unpack('>I', d[off:off+4])[0]; typ = d[off+4:off+8]
        if typ == b'IDAT': idat += d[off+8:off+8+ln]
        elif typ == b'IHDR':
            bit = d[off+8+8]; ct = d[off+8+9]
            if bit != 8 or ct != 6: return (w, h, None)  # no RGBA8
        off += 12 + ln
    try: raw = zlib.decompress(idat)
    except Exception: return (w, h, None)
    ch = 4; stride = w*ch + 1
    try:
        out = bytearray(w*h*ch); prev = bytearray(stride)
        for y in range(h):
            row = raw[y*stride:(y+1)*stride]
            f = row[0]; line = bytearray(row[1:])
            if f == 1:
                for i in range(ch, len(line)): line[i] = (line[i] + line[i-ch]) & 255
            elif f == 2:
                for i in range(len(line)): line[i] = (line[i] + prev[i]) & 255
            elif f == 3:
                for i in range(len(line)):
                    a = prev[i] if i >= ch else 0
                    line[i] = (line[i] + ((prev[i] + a) >> 1)) & 255
            elif f == 4:
                for i in range(len(line)):
                    a = prev[i] if i >= ch else 0
                    b = line[i-ch] if i >= ch else 0
                    c = prev[i-ch] if i >= ch else 0
                    line[i] = (line[i] + (a + b - c)) & 255
            out[y*w*ch:(y+1)*w*ch] = line; prev = line
    except Exception: return (w, h, None)
    vis = []
    for i in range(0, len(out), 4):
        if out[i+3] > 0: vis.append((out[i], out[i+1], out[i+2]))
    return (w, h, frozenset(vis))

def visible_fp(path):
    r = png_visible(path)
    if r is None or r[2] is None: return None
    return (r[0], r[1], r[2])

# ── Vocabulario canónico pose → (family, role, variant, assetType) ──
# La pose del manifest runtime ES evidencia; los roles posicionales se
# derivan del orden de la secuencia (RUNTIME_VERIFIED, no CANONICAL).

def roles_for_sequence(n, names):
    """Distribuye los roles nominales sobre n índices por posición relativa."""
    if n <= 0: return []
    if n == 1: return [names[0]]
    out = []
    for i in range(n):
        pos = i / (n - 1)  # 0..1
        idx = min(len(names) - 1, round(pos * (len(names) - 1)))
        out.append(names[idx])
    return out

ATTACK_FWD_ROLES = ['ready', 'windup', 'travel', 'strike', 'contact', 'follow_through', 'recover']
ATTACK_UD_ROLES = ['ready', 'windup', 'strike', 'contact', 'recover']
MOVEMENT_ROLES = ['start', 'travel', 'end']
GUARD_ROLES = ['start', 'hold', 'recover']
BEAM_CHARGE_ROLES = ['charge_start', 'charge_hold']
EVADE_ROLES = ['start', 'disappear', 'reappear', 'recover']
HURT_ROLES = ['hurt_light', 'hurt_heavy']

def pose_semantics(pose, i, n):
    """(family, role, variant, assetType, canon_status) para pose+i de n."""
    P = pose
    if P == 'idle': return ('idle', 'idle', 'idle', 'actor_frame', 'CANONICAL')
    if P == 'ready': return ('ready', 'ready', 'ready', 'actor_frame', 'CANONICAL')
    if P in ('move_front', 'move_back'):
        r = roles_for_sequence(n, MOVEMENT_ROLES)[i]
        return ('movement', r, P, 'actor_frame', 'RUNTIME_VERIFIED')
    if P == 'move_vertical':
        r = roles_for_sequence(n, MOVEMENT_ROLES)[i]
        return ('movement', r, 'vertical', 'actor_frame', 'RUNTIME_VERIFIED')
    if P == 'guard':
        r = roles_for_sequence(n, GUARD_ROLES)[i]
        return ('defense', r, 'guard', 'actor_frame', 'RUNTIME_VERIFIED')
    if P == 'beam_guard':
        r = roles_for_sequence(n, GUARD_ROLES)[i]
        return ('defense', r, 'beam_guard', 'actor_frame', 'RUNTIME_VERIFIED')
    if P == 'evade':
        r = roles_for_sequence(n, EVADE_ROLES)[i]
        return ('defense', r, 'evade', 'actor_frame', 'RUNTIME_VERIFIED')
    if P == 'attack_fwd':
        r = roles_for_sequence(n, ATTACK_FWD_ROLES)[i]
        return ('melee', r, 'attack_forward', 'actor_frame', 'RUNTIME_VERIFIED')
    if P == 'attack_ud':
        r = roles_for_sequence(n, ATTACK_UD_ROLES)[i]
        return ('melee', r, 'attack_vertical', 'actor_frame', 'RUNTIME_VERIFIED')
    if P in ('punch_right', 'punch_left', 'kick_right'):
        return ('melee', 'strike', P, 'actor_frame', 'RUNTIME_VERIFIED')
    if P == 'hurt':
        r = HURT_ROLES[min(i, len(HURT_ROLES) - 1)] if n >= 2 else 'hurt_light'
        return ('reaction', r, 'hurt', 'actor_frame', 'RUNTIME_VERIFIED')
    if P.startswith('knockback_'):
        return ('reaction', P, P.replace('knockback_', ''), 'actor_frame', 'RUNTIME_VERIFIED')
    if P == 'ko': return ('reaction', 'ko', 'ko', 'actor_frame', 'CANONICAL')
    if P == 'beam_charge':
        r = roles_for_sequence(n, BEAM_CHARGE_ROLES)[i]
        return ('beam', r, 'charge', 'actor_frame', 'RUNTIME_VERIFIED')
    if P == 'beam_fire': return ('beam', 'release', 'fire', 'actor_frame', 'RUNTIME_VERIFIED')
    if P == 'beam_pose': return ('beam', 'pose', 'pose', 'actor_frame', 'RUNTIME_VERIFIED')
    if P == 'power_up': return ('power', 'power_up', 'power_up', 'composite', 'CANONICAL')
    if P == 'gather_power': return ('power', 'gather_power', 'gather_power', 'composite', 'CANONICAL')
    if P in ('aura_power', 'aura_support'): return ('effect', 'aura', P, 'effect', 'CANONICAL')
    return ('unclassified', 'unclassified', P, 'actor_frame', 'UNCLASSIFIED')

# ── Buckets forenses → assetType (solo buckets CONCRETOS) ──
BUCKET_ASSET = {
    'battle_aura_tile': ('effect', 'aura_tile'),
    'battle_aura_actor_composite': ('composite', 'aura_composite'),
    'speedlines': ('effect', 'speedlines'),
    'projectile_orb_small': ('projectile', 'orb'),
    'orbs_rings_bursts': ('effect', 'orbs_rings_bursts'),
    'projectiles_beams': ('projectile', 'beam_ray'),
    'beam_or_projectile_horizontal': ('projectile', 'beam_horizontal'),
    'character_plus_aura_or_burst': ('composite', 'aura_or_burst'),
    'character_plus_effect': ('composite', 'character_effect'),
    'character_plus_projectile': ('composite', 'character_projectile'),
    'overworld_actor_or_pose': ('overworld', 'actor_pose'),
    'nonbody_misc': ('effect', 'misc'),
}
AMBIGUOUS_BUCKETS = ['movement_or_attack_pose', 'idle_or_stance', 'downed_or_hurt',
                     'overworld_actor_or_pose', 'projectiles_beams', 'orbs_rings_bursts',
                     'character_plus_effect', 'nonbody_misc', 'actor_downed_or_special_pose',
                     'multi_evidence_']

# ── Cargar catálogo forense ─────────────────────────────────
catalog = {}
for r in csv.DictReader(open(os.path.join(V9, 'catalog', 'frame_catalog.csv'))):
    catalog[f"{r['runtime_dir']}|{r['frame']}"] = r

def load_frames_by_fp(form_dir, sub):
    """Mapea fingerprint (w,h,visible) → archivo dentro de sub/."""
    d = os.path.join(FORMS, form_dir, sub)
    out = {}
    if not os.path.isdir(d): return out
    for f in os.listdir(d):
        if not f.endswith('.png'): continue
        fp = visible_fp(os.path.join(d, f))
        if fp: out.setdefault(fp, []).append(f)
    return out

def load_runtime_fp(form_dir):
    """Mapea fingerprint → (pose, nombre, índice-en-secuencia) del manifest runtime.

    El índice (idx) es la posición REAL del frame dentro de la secuencia de
    su pose (frames[0], frames[1], ...) — no un índice global ni el orden de
    las poses que comparten el frame físico. Sin esto, roles_for_sequence
    distribuía roles mal (guard_00/01/02 → todos 'start')."""
    mp = os.path.join(SPRITES, form_dir, 'manifest.json')
    if not os.path.exists(mp): return {}
    manifest = json.load(open(mp))
    out = {}
    for pose, pv in manifest.items():
        if not isinstance(pv, dict): continue
        for idx, fr in enumerate(pv.get('frames', [])):
            p = os.path.join(SPRITES, form_dir, fr['file'])
            if not os.path.exists(p): continue
            fp = visible_fp(p)
            if fp: out.setdefault(fp, []).append((pose, fr.get('name', fr['file']), idx))
    return out

registry = []      # entradas por frame físico (source frame)
form_manifests = {}
stats = collections.Counter()
stats_by_form = {}

form_dirs = sorted(os.listdir(FORMS))
for form_dir in form_dirs:
    atomic_dir = os.path.join(FORMS, form_dir, 'atomic')
    if not os.path.isdir(atomic_dir): continue
    atomic_files = sorted(f for f in os.listdir(atomic_dir) if f.endswith('.png'))
    fixed_files = sorted(f for f in os.listdir(os.path.join(FORMS, form_dir, 'fixed_only')) if f.endswith('.png')) \
        if os.path.isdir(os.path.join(FORMS, form_dir, 'fixed_only')) else []

    # fingerprints
    atomic_fp = load_frames_by_fp(form_dir, 'atomic')
    fixed_fp = load_frames_by_fp(form_dir, 'fixed_only')
    rt_fp = load_runtime_fp(form_dir)
    # Longitud REAL de la secuencia de cada pose (frames del manifest) — el
    # numerador de roles_for_sequence: guard con 3 frames reparte
    # start/hold/recover por POSICIÓN, no por nº de poses que comparten frame.
    mp = os.path.join(SPRITES, form_dir, 'manifest.json')
    pose_len = {}
    if os.path.exists(mp):
        m = json.load(open(mp))
        for pose, pv in m.items():
            if isinstance(pv, dict) and isinstance(pv.get('frames'), list):
                pose_len[pose] = len(pv['frames'])
    # inverso: frame físico → [(pose, name, idx-en-secuencia)] (por fingerprint)
    frame_poses = {}   # archivo atómico/fixed → [(pose, name, idx)]
    for fp, entries in rt_fp.items():
        targets = []
        for f in atomic_fp.get(fp, []): targets.append(('atomic', f))
        for f in fixed_fp.get(fp, []): targets.append(('fixed_only', f))
        for kind, f in targets:
            frame_poses.setdefault((kind, f), []).extend(entries)

    form_stats = collections.Counter()
    frames_out = []
    # dedupe por frame físico: un frame puede usarse en varias poses runtime
    # (p.ej. punch_right y attack_fwd comparten frames) — se unifica SIN
    # borrar provenance: runtimePoses acumula todas; family/role = el uso
    # más específico (preferencia: melee/beam/reaction > movement > base).
    _by_src: dict = {}
    _PRIO = {'melee': 5, 'beam': 5, 'reaction': 5, 'power': 5, 'defense': 4,
             'movement': 3, 'effect': 2, 'idle': 1, 'ready': 1, 'unclassified': 0}
    def _canon_id(form, fam, role, var, seq, src_name):
        if fam == 'unclassified':
            return f"{form}.unclassified.{src_name}"
        # canonicalId CONSISTENTE con la clasificación final: family.role.
        # variant.seq — generado SIEMPRE con la entrada ganadora del dedupe
        # (antes se generaba con la 1ª pose y el dedupe lo dejaba stale).
        # El sufijo src_name garantiza UNICIDAD por frame físico (dos frames
        # pueden compartir role+variant+seq en la misma secuencia: p.ej. dos
        # windup.01 de attack_fwd en manifests con frames duplicados).
        return f"{form}.{fam}.{role}.{var}.{seq:02d}.{src_name}"
    def _add_dedup(entry):
        sid = entry['sourceId']
        if sid not in _by_src:
            _by_src[sid] = entry
            return True
        ex = _by_src[sid]
        for p in entry['runtimePoses']:
            if p not in ex['runtimePoses']: ex['runtimePoses'].append(p)
        if _PRIO.get(entry['family'], 0) > _PRIO.get(ex['family'], 0):
            ex['family'] = entry['family']; ex['role'] = entry['role']
            ex['variant'] = entry['variant']; ex['assetType'] = entry['assetType']
            ex['canonStatus'] = entry['canonStatus']; ex['evidence'] = entry['evidence']
            # M8.P0 fix: canonicalId y sequenceIndex se regeneran con la pose
            # GANADORA (family/role/variant finales) — nunca stale.
            ex['canonicalId'] = _canon_id(entry['formId'], entry['family'],
                                          entry['role'], entry['variant'], entry['sequenceIndex'],
                                          entry['sourceId'].split('/')[-1])
            ex['sequenceIndex'] = entry['sequenceIndex']
        return False
    for kind, files in (('atomic', atomic_files), ('fixed_only', fixed_files)):
        for f in files:
            src_id = f[:-4]
            poses = frame_poses.get((kind, f), [])
            # catálogo forense (bucket/coords)
            cat = catalog.get(f"{form_dir}|{f}") or catalog.get(f"{form_dir}|{src_id}.png") or {}
            bucket = cat.get('semantic_bucket', '')
            evidence = cat.get('evidence', '') or ''
            if poses:
                # evidencia runtime: la pose manda. La POSICIÓN en la
                # secuencia real (pose_idx, del manifest) alimenta
                # roles_for_sequence — el canon reparte start/hold/recover
                # por frame real, no por nº de poses que comparten el frame.
                for idx, (pose, name, pose_idx) in enumerate(poses):
                    n_seq = pose_len.get(pose, len(poses))
                    fam, role, var, atype, status = pose_semantics(pose, pose_idx, n_seq)
                    # variantes dedicadas (punch_right...) mejoran el variant
                    canonical_id = _canon_id(form_dir, fam, role, var, pose_idx, f[:-4])
                    entry = {
                        'sourceId': f"{form_dir}/{f}",
                        'canonicalId': canonical_id,
                        'characterId': form_dir.rsplit('_', 1)[0] if form_dir.count('_') else form_dir,
                        'formId': form_dir,
                        'assetType': atype,
                        'view': 'ACTION_DUEL' if fam in ('melee', 'beam', 'power') else 'FIELD',
                        'family': fam, 'role': role, 'variant': var,
                        'sequenceIndex': pose_idx,
                        'runtimePoses': [p for p, _, _ in poses],
                        'evidence': 'CANONICAL' if status == 'CANONICAL' else 'RUNTIME_VERIFIED',
                        'canonStatus': status,
                        'source': {'sheet': cat.get('source_sheet', ''), 'frame': f,
                                   'x': cat.get('x0'), 'y': cat.get('y0')},
                        'frameKind': kind,
                    }
                    if _add_dedup(entry):
                        registry.append(entry)
                    stats[status] += 1; form_stats[status] += 1
            else:
                # sin pose runtime → bucket concreto o UNCLASSIFIED
                if bucket in BUCKET_ASSET:
                    atype, role = BUCKET_ASSET[bucket]
                    status = 'ASSET_VERIFIED'
                else:
                    atype, role, status = 'unclassified', 'unclassified', 'UNCLASSIFIED'
                entry = {
                    'sourceId': f"{form_dir}/{f}",
                    # unclassified: el id usa el NOMBRE del archivo (único),
                    # no un contador global — cada frame tiene su identidad.
                    'canonicalId': f"{form_dir}.unclassified.{f[:-4]}",
                    'characterId': form_dir.rsplit('_', 1)[0] if form_dir.count('_') else form_dir,
                    'formId': form_dir,
                    'assetType': atype,
                    'view': 'FIELD',
                    'family': 'unclassified', 'role': role, 'variant': bucket or '',
                    'sequenceIndex': 0,
                    'runtimePoses': [],
                    'evidence': 'ASSET_VERIFIED' if status == 'ASSET_VERIFIED' else 'UNKNOWN',
                    'canonStatus': status,
                    'source': {'sheet': cat.get('source_sheet', ''), 'frame': f,
                               'x': cat.get('x0'), 'y': cat.get('y0')},
                    'frameKind': kind,
                    'note': f"bucket forense: {bucket}" if bucket else 'sin evidencia runtime ni bucket',
                }
                if _add_dedup(entry):
                    registry.append(entry)
                stats[status] += 1; form_stats[status] += 1

    frames_out = list(_by_src.values())
    form_manifests[form_dir] = {
        'form': form_dir,
        'frameCount': len(frames_out),
        'frames': frames_out,
    }
    stats_by_form[form_dir] = dict(form_stats)

# ── Salidas ─────────────────────────────────────────────────
os.makedirs(os.path.join(V9, 'catalog'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'src', 'data', 'generated'), exist_ok=True)

json.dump(registry, open(os.path.join(V9, 'catalog', 'frame_semantic_registry.json'), 'w'), indent=1)
for fd, fm in form_manifests.items():
    os.makedirs(os.path.join(FORMS, fd), exist_ok=True)
    json.dump(fm, open(os.path.join(FORMS, fd, 'frame_manifest.json'), 'w'), indent=1)

# spriteCanon.generated.ts (fuente única para TS)
lines = []
lines.append('// ═══════════════════════════════════════════════════════════')
lines.append('// GENERADO por scripts/build-sprite-canon.py desde catalog-v9')
lines.append('// NO EDITAR A MANO — regenerar con npm run canon:sprites')
lines.append('// ═══════════════════════════════════════════════════════════')
lines.append('')
lines.append('export type CanonStatus = \'CANONICAL\' | \'RUNTIME_VERIFIED\' | \'ASSET_VERIFIED\' | \'INFERRED\' | \'UNCLASSIFIED\';')
lines.append('')
lines.append('export interface SpriteCanonFrame {')
lines.append('  sourceId: string; canonicalId: string; formId: string;')
lines.append('  assetType: string; family: string; role: string; variant: string;')
lines.append('  sequenceIndex: number; runtimePoses: string[];')
lines.append('  canonStatus: CanonStatus; frameKind: \'atomic\' | \'fixed_only\';')
lines.append('  evidence: string;')
lines.append('}')
lines.append('')
lines.append('export interface SpriteCanonForm { form: string; frameCount: number; frames: SpriteCanonFrame[]; }')
lines.append('')
lines.append('export const SPRITE_CANON: { forms: SpriteCanonForm[] } = { forms: [')
for fd, fm in form_manifests.items():
    lines.append(f'  {{ form: {json.dumps(fd)}, frameCount: {fm["frameCount"]}, frames: [')
    for e in fm['frames']:
        lines.append('    { ' + ', '.join([
            f'sourceId: {json.dumps(e["sourceId"])}',
            f'canonicalId: {json.dumps(e["canonicalId"])}',
            f'formId: {json.dumps(e["formId"])}',
            f'assetType: {json.dumps(e["assetType"])}',
            f'family: {json.dumps(e["family"])}',
            f'role: {json.dumps(e["role"])}',
            f'variant: {json.dumps(e["variant"])}',
            f'sequenceIndex: {e["sequenceIndex"]}',
            f'runtimePoses: {json.dumps(e["runtimePoses"])}',
            f'canonStatus: {json.dumps(e["canonStatus"])}',
            f'frameKind: {json.dumps(e["frameKind"])}',
            f'evidence: {json.dumps(e["evidence"])}',
        ]) + ' },')
    lines.append('  ] },')
lines.append('] };')
lines.append('')
lines.append('/** Frames de una forma (índice por sourceId). */')
lines.append('export function canonFrames(formId: string): SpriteCanonFrame[] {')
lines.append('  return SPRITE_CANON.forms.find(f => f.form === formId)?.frames ?? [];')
lines.append('}')
lines.append('')
lines.append('/** Familia+rol únicos del canon (para Dev Studio). */')
lines.append('export function canonFamilies(): { family: string; roles: string[] }[] {')
lines.append('  const m = new Map<string, Set<string>>();')
lines.append('  for (const f of SPRITE_CANON.forms.flatMap(x => x.frames)) {')
lines.append('    if (!m.has(f.family)) m.set(f.family, new Set());')
lines.append('    m.get(f.family)!.add(f.role);')
lines.append('  }')
lines.append('  return [...m.entries()].map(([family, roles]) => ({ family, roles: [...roles].sort() }));')
lines.append('}')
lines.append('')
open(os.path.join(ROOT, 'src', 'data', 'generated', 'spriteCanon.generated.ts'), 'w').write('\n'.join(lines))

# audit (stats sobre el registro dedupeado)
final_stats = collections.Counter(e['canonStatus'] for e in registry)
final_kinds = collections.Counter(e['frameKind'] for e in registry)
final_fam = collections.Counter(e['family'] for e in registry)
amb_as_canon = sum(1 for e in registry
                   if e['canonStatus'] in ('CANONICAL', 'RUNTIME_VERIFIED')
                   and any(a in (e.get('variant', '') + ' ' + e.get('note', '')) for a in AMBIGUOUS_BUCKETS))
audit = {
    'forms': len(form_dirs),
    'formsWithManifest': len(form_manifests),
    'physicalFrames': len(registry),
    'byKind': dict(final_kinds),
    'byStatus': dict(final_stats),
    'byFamily': dict(final_fam),
    'ambiguousLabelsAsCanonical': amb_as_canon,
}
json.dump(audit, open(os.path.join(V9, 'catalog', 'semantic_audit.json'), 'w'), indent=1)

print('══════════ V9 SEMANTIC CANON ══════════')
print(f'forms: {audit["forms"]}')
print(f'physical frames: {audit["physicalFrames"]}  (atomic {audit["byKind"].get("atomic", 0)} + fixed_only {audit["byKind"].get("fixed_only", 0)})')
for k, v in sorted(audit['byStatus'].items(), key=lambda kv: -kv[1]):
    print(f'  {k:18s} {v}')
print(f'ambiguos como canónico: {audit["ambiguousLabelsAsCanonical"]}')
print(f'registry → catalog/frame_semantic_registry.json')
print(f'forms → frame_manifest.json × {len(form_manifests)}')
print(f'TS → src/data/generated/spriteCanon.generated.ts')
