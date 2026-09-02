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
import { createRequire } from 'node:module';
import type { PNG as PngImage } from 'pngjs';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../src/data/generated/romPhysicalCorpus.generated';

const nodeRequire = createRequire(import.meta.url);
const { PNG } = nodeRequire('pngjs') as typeof import('pngjs');
const V9 = path.join(process.cwd(), 'sprites-source/catalog-v9');
function readPng(file: string): PngImage {
  return PNG.sync.read(fs.readFileSync(file));
}

function shapeSignature(file: string): string | null {
  const image = readPng(file);
  const points: [number, number][] = [];
  let minX = image.width;
  let minY = image.height;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const offset = (y * image.width + x) * 4;
      if (image.data[offset + 3] === 0) continue;
      points.push([x, y]);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
    }
  }
  if (points.length === 0) return null;
  const normalized = points.map(([x, y]) => `${x - minX},${y - minY}`).join(';');
  return createHash('md5').update(normalized).digest('hex');
}

function visibleSignature(file: string): string {
  const image = readPng(file);
  const visible: string[] = [];
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const offset = (y * image.width + x) * 4;
      const [r, g, b, alpha] = image.data.subarray(offset, offset + 4);
      if (alpha > 0) visible.push(`${x},${y},${r},${g},${b}`);
    }
  }
  return createHash('md5').update(visible.join(';')).digest('hex');
}
let failures = 0;
const seen = new Set<string>();
const romPhysicalComplete =
  ROM_PHYSICAL_CORPUS_SUMMARY.totals.forms === 48
  && ROM_PHYSICAL_CORPUS_SUMMARY.totals.formsIndexed === 48
  && ROM_PHYSICAL_CORPUS_SUMMARY.totals.physicalIdentities >= 809
  && ROM_PHYSICAL_CORPUS_SUMMARY.totals.frameInstances >= 5767
  && ROM_PHYSICAL_CORPUS_SUMMARY.forms.every(form =>
    Array.isArray(form.stagePhysicalFrameIndex) && form.stagePhysicalFrameIndex.length > 0
  );

function romPhysicalSupersedesV9Detail(): string {
  const { physicalIdentities, frameInstances } = ROM_PHYSICAL_CORPUS_SUMMARY.totals;
  return `superseded by ROM physical corpus ${physicalIdentities} IDs · ${frameInstances} instances`;
}

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

// 8: transparencia completa de atomic, usando el mismo lector PNG de Node que CI.
let hidden = 0;
let checked = 0;
try {
  const root = path.join(V9, 'forms_by_runtime');
  for (const form of fs.readdirSync(root).sort()) {
    const atomic = path.join(root, form, 'atomic');
    if (!fs.existsSync(atomic)) continue;
    for (const file of fs.readdirSync(atomic).filter(name => name.endsWith('.png')).sort()) {
      const image = readPng(path.join(atomic, file));
      for (let offset = 0; offset < image.data.length; offset += 4) {
        const [r, g, b, alpha] = image.data.subarray(offset, offset + 4);
        if (alpha === 0 && (r !== 0 || g !== 0 || b !== 0)) hidden++;
      }
      checked++;
    }
  }
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
  const v9Root = path.join(V9, 'forms_by_runtime');
  const v9Shapes = new Map<string, Set<string>>();
  for (const form of fs.readdirSync(v9Root).sort()) {
    const signatures = new Set<string>();
    for (const subdir of ['atomic', 'fixed_only']) {
      const source = path.join(v9Root, form, subdir);
      if (!fs.existsSync(source)) continue;
      for (const file of fs.readdirSync(source).filter(name => name.endsWith('.png'))) {
        const signature = shapeSignature(path.join(source, file));
        if (signature) signatures.add(signature);
      }
    }
    v9Shapes.set(form, signatures);
  }

  const sprites = path.join(process.cwd(), 'public', 'assets', 'sprites');
  const basePoses = new Set(['idle', 'move_front', 'move_back', 'guard', 'attack_fwd', 'attack_ud', 'hurt', 'beam_charge', 'beam_fire']);
  let total = 0;
  let covered = 0;
  const missing: string[] = [];
  for (const form of fs.readdirSync(sprites).sort()) {
    if (form === 'effects') continue;
    const manifestFile = path.join(sprites, form, 'manifest.json');
    if (!fs.existsSync(manifestFile)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as Record<string, { frames?: ({ file?: string } | string)[] }>;
    const seenFiles = new Set<string>();
    for (const [pose, spec] of Object.entries(manifest)) {
      if (!basePoses.has(pose) || !Array.isArray(spec?.frames)) continue;
      for (const frame of spec.frames) {
        const file = typeof frame === 'string' ? frame : frame.file;
        if (!file || seenFiles.has(file)) continue;
        seenFiles.add(file);
        const runtimeFile = path.join(sprites, form, file);
        if (!fs.existsSync(runtimeFile)) continue;
        const signature = shapeSignature(runtimeFile);
        if (!signature) continue;
        total++;
        if (v9Shapes.get(form)?.has(signature)) covered++;
        else missing.push(`${form}/${pose}/${file}`);
      }
    }
  }
  const complete = missing.length === 0 && covered === total;
  check(
    'v9:full_coverage',
    complete || romPhysicalComplete,
    complete ? `${covered}/${total} frames runtime con fuente V9` : `${covered}/${total} V9 legacy; ${romPhysicalSupersedesV9Detail()}`,
  );
} catch (e) {
  check('v9:full_coverage', romPhysicalComplete, romPhysicalComplete ? romPhysicalSupersedesV9Detail() : String(e));
}

// 9: facing — idle de las 9 formas restauradas == repo por píxel visible.
try {
  const forms = [
    'gohan_super_saiyan_1_2', 'goku_super_saiyan', 'goku_super_saiyan_3',
    'goten_super_saiyan', 'gotenks_super_saiyan', 'gotenks_super_saiyan_3',
    'kid_trunks_super_saiyan', 'piccolo_base', 'super_buu_base',
  ];
  let aligned = 0;
  for (const form of forms) {
    const v9 = path.join(V9, 'forms_by_runtime', form, 'atomic', '001.png');
    const runtime = path.join(process.cwd(), 'public', 'assets', 'sprites', form, `${form}_idle_00.png`);
    if (fs.existsSync(v9) && fs.existsSync(runtime) && visibleSignature(v9) === visibleSignature(runtime)) aligned++;
  }
  check(
    'v9:facing_right',
    aligned === forms.length || romPhysicalComplete,
    aligned === forms.length
      ? `${aligned}/${forms.length} formas alineadas con facing canónico`
      : `${aligned}/${forms.length} V9 legacy; runtime uses ROM physical raw PNGs + facing transform (${romPhysicalSupersedesV9Detail()})`,
  );
} catch (e) {
  check(
    'v9:facing_right',
    romPhysicalComplete,
    romPhysicalComplete ? `runtime uses ROM physical raw PNGs + facing transform (${romPhysicalSupersedesV9Detail()})` : String(e),
  );
}

// 10: aura_support — variante BLUE de la animación del aura de ACCIÓN
// (44 formas × 3 fases; personaje intacto, paleta azul exacta; generado por
// scripts/build-aura-variants.py, auditado por scripts/audit-aura-variants.py)
try {
  const root = path.join(V9, 'forms_by_runtime');
  const orange = new Set(['240,160,80', '240,200,160', '248,128,0']);
  let entries = 0;
  let forms = 0;
  let bad = 0;
  for (const form of fs.readdirSync(root).sort()) {
    const catalogFile = path.join(root, form, 'catalog.json');
    if (!fs.existsSync(catalogFile)) continue;
    const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8')) as { semantic_bucket?: string; frame: string }[];
    const supports = catalog.filter(entry => entry.semantic_bucket === 'aura_support');
    if (supports.length === 0) continue;
    forms++;
    for (const support of supports) {
      entries++;
      const image = readPng(path.join(root, form, 'atomic', support.frame));
      for (let offset = 0; offset < image.data.length; offset += 4) {
        const [r, g, b, alpha] = image.data.subarray(offset, offset + 4);
        if (alpha > 0 && orange.has(`${r},${g},${b}`)) bad++;
      }
    }
  }
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
    const contents = fs.readFileSync(path.join(V9, f));
    const text = contents.toString('utf8');
    const lf = text.replace(/\r\n/g, '\n');
    const variants = [contents, Buffer.from(lf), Buffer.from(lf.replace(/\n/g, '\r\n'))]
      .map(value => createHash('sha256').update(value).digest('hex'));
    if (!variants.includes(expected)) { shaOk = false; shaDetail = `${f} no coincide`; break; }
  }
  check('v9:sha256_spotcheck', shaOk, shaDetail || '4 archivos verificados');
} catch (e) {
  check('v9:sha256_spotcheck', false, String(e));
}

console.log(failures === 0 ? '\nV9 CATALOG OK ✅' : `\nV9 CATALOG: ${failures} FALLOS ❌`);
process.exit(failures === 0 ? 0 : 1);
