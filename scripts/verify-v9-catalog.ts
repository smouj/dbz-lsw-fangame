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

const V9 = path.join(process.cwd(), 'sprites-source/catalog-v9');
let failures = 0;
const seen = new Set<string>();

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
check('v9:atomic_1952', atomicCount === 1952, `${atomicCount} frames atomic`);
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
// 1.952 aliases atomic + 392 aliases fixed_only = 2.344
check('v9:named_2344', namedCount === 2344, `${namedCount} aliases named (1952 atomic + 392 fixed_only)`);
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
check('v9:spritesheets_556', sheetCount === 556, `${sheetCount} spritesheets`);

// 5-7: catálogos
check('v9:card_sequences_125', csvRows('cards/card_sequences.csv') === 125, `${csvRows('cards/card_sequences.csv')} filas`);
check('v9:action_profiles_42', csvRows('cards/action_profiles.csv') === 42, `${csvRows('cards/action_profiles.csv')} filas`);
check('v9:effects_catalog_225', csvRows('effects/effects_catalog.csv') === 225, `${csvRows('effects/effects_catalog.csv')} filas`);
check('v9:frame_catalog_1952', csvRows('catalog/frame_catalog.csv') === 1952, `${csvRows('catalog/frame_catalog.csv')} filas`);
check('v9:form_summary_42', csvRows('catalog/runtime_form_summary.csv') === 42, `${csvRows('catalog/runtime_form_summary.csv')} filas`);
check('v9:transparency_audit_42', csvRows('catalog/transparency_audit.csv') === 42, `${csvRows('catalog/transparency_audit.csv')} filas`);
const sj = JSON.parse(fs.readFileSync(path.join(V9, 'cards/stage_sequences.json'), 'utf8'));
check('v9:stage_pools_4', Object.keys(sj.pools ?? {}).length === 4, `niveles ${Object.keys(sj.pools ?? {}).join(',')}`);

// 8: transparencia (muestreo completo de atomic — 1.952 PNG)
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
check('v9:transparency', checked === 1952 && hidden === 0, `${checked} PNG, ${hidden} px RGB residual`);

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
  check('v9:full_coverage', miss === 0 && cov === tot, `${cov}/${tot} frames runtime con fuente V9`);
} catch (e) {
  check('v9:full_coverage', false, String(e));
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
  check('v9:facing_right', Number(out) === 9, `${out}/9 formas alineadas con facing canónico`);
} catch (e) {
  check('v9:facing_right', false, String(e));
}

// 10: SHA spot-check
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
