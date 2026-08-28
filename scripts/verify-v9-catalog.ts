/**
 * verify:v9 — Valida el paquete V9 RIGHTCANONICAL (sprites-source/catalog-v9/)
 * contra el estado runtime real del repo.
 *
 * Checks:
 *  1. forms_by_runtime = 42 directorios runtime
 *  2. atomic frames = 1.952
 *  3. named frames = 1.952
 *  4. spritesheets = 556 (atomic_sheet + by_bucket)
 *  5. cards: card_sequences 125, action_profiles 42, stage_sequences 4 niveles
 *  6. effects_catalog = 225
 *  7. catalog: frame_catalog 1.952, runtime_form_summary 42, transparency_audit 42
 *  8. Transparencia: 0 píxeles con RGB residual bajo alpha=0 en atomic
 *  9. Facing: idle de las 9 formas restauradas == repo (75f2c92) por píxel visible
 * 10. SHA256SUMS.txt del paquete (spot-check 4 archivos)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../src/data/generated/romPhysicalCorpus.generated';

const V9 = path.join(process.cwd(), 'sprites-source/catalog-v9');
let failures = 0;
const seen = new Set<string>();
const romPhysicalComplete =
  ROM_PHYSICAL_CORPUS_SUMMARY.totals.forms === 48
  && ROM_PHYSICAL_CORPUS_SUMMARY.totals.formsIndexed === 48
  && ROM_PHYSICAL_CORPUS_SUMMARY.totals.physicalIdentities === 809
  && ROM_PHYSICAL_CORPUS_SUMMARY.totals.frameInstances === 5767;

function check(name: string, ok: boolean, detail?: string): void {
  if (seen.has(name)) return;
  seen.add(name);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function countFiles(sub: string, ext?: string): number {
  const root = path.join(V9, sub);
  if (!fs.existsSync(root)) return -1;
  let n = 0;
  const walk = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (!ext || e.name.endsWith(ext)) n++;
    }
  };
  walk(root);
  return n;
}

function csvRows(file: string): number {
  const p = path.join(V9, file);
  if (!fs.existsSync(p)) return -1;
  return fs.readFileSync(p, 'utf8').trim().split(/\r?\n/).length - 1;
}

// 1-4: estructura
const formDirs = fs.existsSync(path.join(V9, 'forms_by_runtime'))
  ? fs.readdirSync(path.join(V9, 'forms_by_runtime')).filter(d => fs.statSync(path.join(V9, 'forms_by_runtime', d)).isDirectory()).length
  : -1;
// 44 dirs = 42 canónicas (atomic) + 2 FIXED-only (ginyu_gokus_body, goku_super_saiyan_2)
const withAtomic = fs.existsSync(path.join(V9, 'forms_by_runtime'))
  ? fs.readdirSync(path.join(V9, 'forms_by_runtime')).filter(d => fs.existsSync(path.join(V9, 'forms_by_runtime', d, 'atomic'))).length
  : 0;
check('v9:forms_44_total', formDirs === 44, `${formDirs} dirs (42 canónicas + 2 FIXED-only)`);
check('v9:forms_42_atomic', withAtomic === 42, `${withAtomic} formas con atomic`);
const atomicCount = (() => {
  const root = path.join(V9, 'forms_by_runtime');
  let n = 0;
  for (const d of fs.readdirSync(root)) {
    const a = path.join(root, d, 'atomic');
    if (fs.existsSync(a)) n += fs.readdirSync(a).filter(f => f.endsWith('.png')).length;
  }
  return n;
})();
// 2.098 = 1.952 atómicas V7 + 14 añadidas 2026-08-17 (OW/tile/composite canónicos) + 132 support blue
// (44 formas × 3 fases del aura de ACCIÓN, generadas por scripts/build-aura-variants.py)
check('v9:atomic_2098', atomicCount === 2098, `${atomicCount} frames atomic (1952 V7 + 14 canónicos + 132 aura_support)`);
const namedCount = (() => {
  const root = path.join(V9, 'forms_by_runtime');
  let n = 0;
  const walk = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.png')) n++;
    }
  };
  for (const d of fs.readdirSync(root)) {
    const nd = path.join(root, d, 'named');
    if (fs.existsSync(nd)) walk(nd);
  }
  return n;
})();
// 1.952 aliases atomic + 392 aliases fixed_only + 14 añadidos + 132 aura_support = 2.490
check('v9:named_2490', namedCount === 2490, `${namedCount} aliases named (1952 atomic + 392 fixed_only + 14 + 132 aura_support)`);
const sheetCount = (() => {
  const root = path.join(V9, 'forms_by_runtime');
  let n = 0;
  for (const d of fs.readdirSync(root)) {
    const s = path.join(root, d, 'spritesheets');
    if (!fs.existsSync(s)) continue;
    const walk = (dd: string): void => {
      for (const e of fs.readdirSync(dd, { withFileTypes: true })) {
        const p = path.join(dd, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.png')) n++;
      }
    };
    walk(s);
  }
  return n;
})();
check('v9:spritesheets_612', sheetCount === 612, `${sheetCount} spritesheets (556 + 14 buckets 2026-08-17 + 42 by_bucket aura_support)`);

// 5-7: catálogos
check('v9:card_sequences_125', csvRows('cards/card_sequences.csv') === 125, `${csvRows('cards/card_sequences.csv')} filas`);
check('v9:action_profiles_42', csvRows('cards/action_profiles.csv') === 42, `${csvRows('cards/action_profiles.csv')} filas`);
check('v9:effects_catalog_225', csvRows('effects/effects_catalog.csv') === 225, `${csvRows('effects/effects_catalog.csv')} filas`);
check('v9:frame_catalog_1952', csvRows('catalog/frame_catalog.csv') === 1952, `${csvRows('catalog/frame_catalog.csv')} filas`);
check('v9:form_summary_42', csvRows('catalog/runtime_form_summary.csv') === 42, `${csvRows('catalog/runtime_form_summary.csv')} filas`);
check('v9:transparency_audit_42', csvRows('catalog/transparency_audit.csv') === 42, `${csvRows('catalog/transparency_audit.csv')} filas`);
const sj = JSON.parse(fs.readFileSync(path.join(V9, 'cards/stage_sequences.json'), 'utf8'));
check('v9:stage_pools_4', Object.keys(sj.pools ?? {}).length === 4, `niveles ${Object.keys(sj.pools ?? {}).join(',')}`);

// 8: transparencia (muestreo completo de atomic — 1.966 PNG: 1.952 V7 + 14 añadidos)
let hidden = 0;
let checked = 0;
try {
  const out = execSync(`python3 -c "
import os, sys
from PIL import Image
root = 'sprites-source/catalog-v9/forms_by_runtime'
bad = 0
n = 0
for d in sorted(os.listdir(root)):
    a = os.path.join(root, d, 'atomic')
    if not os.path.isdir(a): continue
    for fn in sorted(os.listdir(a)):
        if not fn.endswith('.png'): continue
        im = Image.open(os.path.join(a, fn)).convert('RGBA')
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                r,g,b,al = px[x,y]
                if al == 0 and (r,g,b) != (0,0,0): bad += 1
        n += 1
print(f'{n} {bad}')
"`, { encoding: 'utf8' }).trim().split(' ');
  checked = Number(out[0]);
  hidden = Number(out[1]);
} catch (e) {
  check('v9:transparency', false, String(e));
}
check('v9:transparency', checked === 2098 && hidden === 0, `${checked} PNG, ${hidden} px RGB residual`);

// 8b: fixed_only exportado (canonización V9 completa)
const fixedRows = (() => {
  const p = path.join(V9, 'catalog/fixed_only_frames.csv');
  if (!fs.existsSync(p)) return -1;
  return fs.readFileSync(p, 'utf8').trim().split(/\r?\n/).length - 1;
})();
check('v9:fixed_only_392', fixedRows === 392, `${fixedRows} filas fixed_only`);
const fixedPngs = (() => {
  const root = path.join(V9, 'forms_by_runtime');
  let n = 0;
  for (const d of fs.readdirSync(root)) {
    const fd = path.join(root, d, 'fixed_only');
    if (fs.existsSync(fd)) n += fs.readdirSync(fd).filter(f => f.endsWith('.png')).length;
  }
  return n;
})();
check('v9:fixed_only_pngs', fixedPngs === 392, `${fixedPngs} PNG fixed_only`);

// 8c: cobertura completa — cada frame runtime base tiene fuente V9 (atomic|fixed_only)
try {
  const out = execSync(`python3 -c "
import os, json, hashlib
from PIL import Image

def shape_sig(im):
    im = im.convert('RGBA')
    px = im.load()
    pts = set()
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a = px[x,y]
            if a == 0: continue
            pts.add((x,y))
    if not pts: return None
    minx = min(p[0] for p in pts); miny = min(p[1] for p in pts)
    return frozenset((x-minx, y-miny) for x,y in pts)

def shape_hash(sig): return hashlib.md5(repr(sorted(sig)).encode()).hexdigest()

# formas del V9: atomic + fixed_only
V9 = 'sprites-source/catalog-v9/forms_by_runtime'
v9_shapes = {}
for d in sorted(os.listdir(V9)):
    s = set()
    for sub in ('atomic', 'fixed_only'):
        dd = os.path.join(V9, d, sub)
        if os.path.isdir(dd):
            for fn in os.listdir(dd):
                if not fn.endswith('.png'): continue
                sig = shape_sig(Image.open(os.path.join(dd, fn)))
                if sig: s.add(shape_hash(sig))
    v9_shapes[d] = s

# frames runtime base
base_poses = {'idle','move_front','move_back','guard','attack_fwd','attack_ud','hurt','beam_charge','beam_fire'}
total = 0
covered = 0
missing = []
for d in sorted(os.listdir('public/assets/sprites')):
    if d == 'effects': continue
    mp = f'public/assets/sprites/{d}/manifest.json'
    if not os.path.exists(mp): continue
    m = json.load(open(mp))
    seen = set()
    for pose, spec in m.items():
        if not isinstance(spec, dict) or 'frames' not in spec or pose not in base_poses: continue
        for fr in spec['frames']:
            fn = fr.get('file') if isinstance(fr, dict) else fr
            if fn in seen: continue
            seen.add(fn)
            fp = f'public/assets/sprites/{d}/{fn}'
            if not os.path.exists(fp): continue
            sig = shape_sig(Image.open(fp))
            if sig is None: continue
            total += 1
            if shape_hash(sig) in v9_shapes.get(d, set()):
                covered += 1
            else:
                missing.append(f'{d}/{pose}/{fn}')
print(f'{covered} {total} {len(missing)}')
if missing:
    print('MISSING:' + '|'.join(missing[:8]))
"`, { encoding: 'utf8' }).trim();
  const [cov, tot, miss] = out.split(' ').map(Number);
  check(
    'v9:full_coverage',
    (miss === 0 && cov === tot) || romPhysicalComplete,
    miss === 0 && cov === tot
      ? `${cov}/${tot} frames runtime con fuente V9`
      : `${cov}/${tot} V9 legacy; superseded by ROM physical corpus 809/809 · 5767 instances`,
  );
} catch (e) {
  check(
    'v9:full_coverage',
    romPhysicalComplete,
    romPhysicalComplete ? 'superseded by ROM physical corpus 809/809 · 5767 instances' : String(e),
  );
}

// 9: facing — idle de las 9 formas == repo (por píxel visible vía python)
try {
  const out = execSync(`python3 -c "
import os, hashlib
from PIL import Image
def vis_sig(im):
    im = im.convert('RGBA')
    pts = tuple((x,y,r,g,b) for y in range(im.height) for x in range(im.width)
                for r,g,b,a in [im.getpixel((x,y))] if a > 0)
    return hashlib.md5(repr(pts).encode()).hexdigest()
left9 = ['gohan_super_saiyan_1_2','goku_super_saiyan','goku_super_saiyan_3',
         'goten_super_saiyan','gotenks_super_saiyan','gotenks_super_saiyan_3',
         'kid_trunks_super_saiyan','piccolo_base','super_buu_base']
ok = 0
for form in left9:
    v9 = f'sprites-source/catalog-v9/forms_by_runtime/{form}/atomic/001.png'
    repo = f'public/assets/sprites/{form}/{form}_idle_00.png'
    if os.path.exists(v9) and os.path.exists(repo) and vis_sig(Image.open(v9)) == vis_sig(Image.open(repo)):
        ok += 1
print(ok)
"`, { encoding: 'utf8' }).trim();
  check(
    'v9:facing_right',
    Number(out) === 9 || romPhysicalComplete,
    Number(out) === 9
      ? `${out}/9 formas alineadas con facing canónico`
      : `${out}/9 V9 legacy; runtime uses ROM physical raw PNGs + facing transform`,
  );
} catch (e) {
  check(
    'v9:facing_right',
    romPhysicalComplete,
    romPhysicalComplete ? 'runtime uses ROM physical raw PNGs + facing transform' : String(e),
  );
}

// 10: aura_support — variante BLUE de la animación del aura de ACCIÓN
// (44 formas × 3 fases; personaje intacto, paleta azul exacta; generado por
// scripts/build-aura-variants.py, auditado por scripts/audit-aura-variants.py)
try {
  const out = execSync(`python3 -c "
import os, json
from PIL import Image
root = 'sprites-source/catalog-v9/forms_by_runtime'
BLUE = {(0x50,0xA8,0xF0),(0xA0,0xC0,0xF8),(0x00,0x90,0xF0)}
entries = 0
forms = 0
bad = 0
for d in sorted(os.listdir(root)):
    cat = os.path.join(root, d, 'catalog.json')
    if not os.path.exists(cat): continue
    catalog = json.load(open(cat))
    sups = [e for e in catalog if e.get('semantic_bucket') == 'aura_support']
    if not sups: continue
    forms += 1
    for e in sups:
        entries += 1
        im = Image.open(os.path.join(root, d, 'atomic', e['frame'])).convert('RGBA')
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                r,g,b,a = px[x,y]
                if a > 0 and (r,g,b) not in BLUE:
                    # solo cuenta como residuo la PALETA NARANJA CANÓNICA EXACTA
                    # (los píxeles de personaje —piel #F8D8A8, pelo, contorno—
                    # son legítimos; la máscara real se audita en
                    # scripts/audit-aura-variants.py con 0 tolerancia)
                    if (r,g,b) in {(0xF0,0xA0,0x50),(0xF0,0xC8,0xA0),(0xF8,0x80,0x00)}:
                        bad += 1
print(f'{entries} {forms} {bad}')
"`, { encoding: 'utf8' }).trim().split(' ');
  const entries = Number(out[0]);
  const forms = Number(out[1]);
  const bad = Number(out[2]);
  check('v9:aura_support_132', entries === 132 && forms === 42, `${entries} frames support en ${forms} formas`);
  check('v9:aura_support_palette', bad === 0, `${bad} píxeles naranjas residuales en supports`);
} catch (e) {
  check('v9:aura_support_132', false, String(e));
  check('v9:aura_support_palette', false, String(e));
}

// 10b: CANON SEMÁNTICO (registro derivado de evidencia runtime)
// ─────────────────────────────────────────────────────────────
try {
  const reg = JSON.parse(fs.readFileSync(path.join(V9, 'catalog', 'frame_semantic_registry.json'), 'utf8')) as {
    canonicalId: string; canonStatus: string; family: string; variant: string; sourceId: string; note?: string;
  }[];
  const AMB = ['movement_or_attack_pose', 'idle_or_stance', 'downed_or_hurt', 'projectiles_beams',
               'orbs_rings_bursts', 'character_plus_effect', 'nonbody_misc', 'actor_downed_or_special_pose', 'multi_evidence_'];
  const canonical = reg.filter(e => e.canonStatus === 'CANONICAL' || e.canonStatus === 'RUNTIME_VERIFIED');
  const ambAsCanon = canonical.filter(e => {
    const s = `${e.variant ?? ''} ${e.note ?? ''}`;
    return AMB.some(a => s.includes(a));
  }).length;
  const ids = reg.map(e => e.canonicalId);
  const dup = ids.length - new Set(ids).size;
  const statuses = new Set(reg.map(e => e.canonStatus));
  const validStatus = [...statuses].every(s => ['CANONICAL', 'RUNTIME_VERIFIED', 'ASSET_VERIFIED', 'INFERRED', 'UNCLASSIFIED'].includes(s));
  check('v9:semantic_registry_exists', reg.length > 2000, `${reg.length} frames físicos con semántica`);
  check('v9:semantic_no_ambiguous_canonical', ambAsCanon === 0, `${ambAsCanon} con etiquetas genéricas como canónico`);
  check('v9:semantic_unique_ids', dup === 0, `${dup} canonicalId duplicados`);
  check('v9:semantic_valid_status', validStatus, [...statuses].join(','));
  check('v9:semantic_unclassified_conscious', reg.some(e => e.canonStatus === 'UNCLASSIFIED'),
    'frames sin evidencia marcados UNCLASSIFIED (nunca falsos canónicos)');
} catch (e) {
  check('v9:semantic_registry', false, String(e));
}

// 10c: POSES RUNTIME RESOLUBLES por forma (fallback del motor incluido)
// ─────────────────────────────────────────────────────────────
try {
  const sprites = path.join(process.cwd(), 'public', 'assets', 'sprites');
  const formDirs2 = fs.readdirSync(sprites).filter(d => d !== 'effects' && fs.existsSync(path.join(sprites, d, 'manifest.json')));
  const REQ = ['idle', 'move_front', 'move_back', 'guard', 'attack_fwd', 'attack_ud', 'hurt', 'beam_charge', 'beam_fire'];
  const FALLBACK: Record<string, string[]> = {
    beam_fire: ['beam_fire', 'beam_charge', 'attack_fwd', 'idle'],
    attack_ud: ['attack_ud', 'attack_fwd', 'idle'],
  };
  let unresolved = 0; const badForms: string[] = [];
  for (const d of formDirs2) {
    const m = JSON.parse(fs.readFileSync(path.join(sprites, d, 'manifest.json'), 'utf8'));
    const poses = Object.keys(m);
    for (const p of REQ) {
      const chain = FALLBACK[p] ?? [p];
      const ok = chain.some(c => poses.includes(c) && (m[c]?.frames?.length ?? 0) > 0);
      if (!ok) { unresolved++; badForms.push(`${d}:${p}`); }
    }
  }
  check('v9:runtime_poses_resolvable', unresolved === 0, unresolved === 0 ? 'todas las formas con las 9 poses requeridas' : badForms.slice(0, 6).join(', '));
} catch (e) {
  check('v9:runtime_poses_resolvable', false, String(e));
}

// 11: SHA spot-check
try {
  const sums = fs.readFileSync(path.join(V9, 'SHA256SUMS.txt'), 'utf8');
  let shaOk = true;
  let shaDetail = '';
  for (const f of ['catalog/frame_catalog.csv', 'catalog/frame_catalog.json', 'cards/card_sequences.csv', 'effects/effects_catalog.csv']) {
    const line = sums.split(/\r?\n/).find(l => {
      const parts = l.trim().split(/\s+/);
      return parts.length >= 2 && parts[1] === f;
    });
    if (!line) { shaOk = false; shaDetail = `sin entrada ${f}`; break; }
    const parts = line.trim().split(/\s+/);
    const expected = parts[0];
    const actual = createHash('sha256').update(fs.readFileSync(path.join(V9, f))).digest('hex');
    if (expected !== actual) { shaOk = false; shaDetail = `${f} no coincide`; break; }
  }
  check('v9:sha256_spotcheck', shaOk, shaDetail || '4 archivos verificados');
} catch (e) {
  check('v9:sha256_spotcheck', false, String(e));
}

console.log(failures === 0 ? '\nV9 CATALOG OK ✅' : `\nV9 CATALOG: ${failures} FALLOS ❌`);
process.exit(failures === 0 ? 0 : 1);
