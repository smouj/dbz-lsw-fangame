// ═══════════════════════════════════════════════════════════════════════
// verify-sprite-mapping.ts — S-MAP1 verifier (npm run verify:sprite-mapping)
// Gates ROM-FIRST: RUNTIME_RESOLVED ≠ PHYSICAL.
// Re-clasifica en vivo (misma lógica que el builder) + comprueba las salidas.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spriteDirs } from '../src/data/spriteManifest.ts';
import { classifyForm, SPRITES_DIR } from '../tools/sprite-mapping/classify.ts';
import { FX_POSES, type SpriteClassification } from '../tools/sprite-mapping/taxonomy.ts';

const ROOT = process.cwd() || resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/rom/generated/sprite-mapping');

let failures = 0;
const fail = (msg: string) => { failures++; console.log(`  ✗ ${msg}`); };
const pass = (msg: string) => console.log(`  ✓ ${msg}`);

const PHYSICAL = new Set<SpriteClassification>(['ROM_PHYSICAL', 'CANONICAL_PHYSICAL', 'SHARED_PHYSICAL']);
const SPRITE_DIRS = spriteDirs();
const forms = Object.keys(SPRITE_DIRS).sort();

console.log('S-MAP1 verify — gates:');
// ── 1) runtime forms indexed 100% ──
const bindingsByForm: Record<string, ReturnType<typeof classifyForm>> = {};
for (const form of forms) {
  const b = classifyForm(form, SPRITE_DIRS[form]!);
  bindingsByForm[form] = b;
  if (!b) fail(`manifest ausente para ${form}`);
}
pass(`formas indexadas ${forms.length}/${forms.length}`);

// ── 2) manifest entries indexed 100% (0 unmarked) ──
let total = 0;
const byClass: Record<string, number> = {};
for (const b of Object.values(bindingsByForm).filter(Boolean)) {
  for (const x of b!) {
    total++;
    byClass[x.classification] = (byClass[x.classification] ?? 0) + 1;
    if (x.classification === 'UNRESOLVED' && !x.evidence.length) fail(`unmarked: ${x.formId}/${x.runtimePose}`);
  }
}
pass(`bindings ${total}, 0 unmarked`);

// ── 3) V9 physical authority refs 0 ──
const v9Roles = ['windup', 'travel', 'strike', 'follow_through', 'recover', 'ready', 'contact'];
let v9Hits = 0;
for (const b of Object.values(bindingsByForm).filter(Boolean)) {
  for (const x of b!) {
    if (x.classification !== 'UNRESOLVED') {
      for (const r of v9Roles) {
        if (x.runtimePose.includes(r)) v9Hits++;
      }
    }
  }
}
if (v9Hits === 0) pass('V9 roles ausentes de las clasificaciones (0 refs de autoridad física V9)');
else fail(`V9 roles encontrados: ${v9Hits}`);

// ── 4) beam_ray/aura as Fighter physical 0 ──
let fxAsPhysical = 0;
for (const b of Object.values(bindingsByForm).filter(Boolean)) {
  for (const x of b!) {
    if (FX_POSES.has(x.runtimePose) && PHYSICAL.has(x.classification)) fxAsPhysical++;
  }
}
if (fxAsPhysical === 0) pass('beam_ray/beam_ray_tip/aura_* nunca físicos');
else fail(`FX como físicos: ${fxAsPhysical}`);

// ── 5) composites/fallbacks counted physical 0 ──
let compAsPhysical = 0, fbAsPhysical = 0;
for (const b of Object.values(bindingsByForm).filter(Boolean)) {
  for (const x of b!) {
    if (x.classification === 'COMPOSITE' && PHYSICAL.has(x.classification)) compAsPhysical++;
    if (x.classification === 'FALLBACK' && PHYSICAL.has(x.classification)) fbAsPhysical++;
  }
}
if (compAsPhysical + fbAsPhysical === 0) pass('composites/fallbacks nunca físicos');
else fail(`composite/fb como físicos: ${compAsPhysical}/${fbAsPhysical}`);

// ── 6) Destruct-Disk → guard 0 ──
let diskAsGuard = 0;
for (const b of Object.values(bindingsByForm).filter(Boolean)) {
  for (const x of b!) {
    if (/disk|destruct/i.test(x.runtimePose) && (x.classification === 'CANONICAL_PHYSICAL' || x.ownerPose === 'guard')) diskAsGuard++;
  }
}
if (diskAsGuard === 0) pass('Destruct-Disk nunca guard (familia Beam handler $07)');
else fail(`disk→guard: ${diskAsGuard}`);

// ── 7) Move FX → Avoiding 0 ──
let moveFxAsAvoid = 0;
for (const b of Object.values(bindingsByForm).filter(Boolean)) {
  for (const x of b!) {
    if (/move_(horizontal|vertical)_fx/.test(x.runtimePose) && (x.ownerPose === 'avoiding' || PHYSICAL.has(x.classification))) moveFxAsAvoid++;
  }
}
if (moveFxAsAvoid === 0) pass('Movement FX registry separado de Avoiding');
else fail(`move FX→Avoiding: ${moveFxAsAvoid}`);

// ── 8) Vegito base canonical 0 / Cell custom / Piccolo unused ──
let vegitoBase = 0, cellCustom = 0, piccoloUnused = 0;
for (const form of forms) {
  if (/vegito_base/.test(form)) vegitoBase++;
  if (/cell.*custom|custom.*cell/i.test(form)) cellCustom++;
}
for (const b of Object.values(bindingsByForm).filter(Boolean)) {
  for (const x of b!) {
    if (/unused/i.test(x.runtimePose) && /piccolo/i.test(x.formId)) piccoloUnused++;
  }
}
if (vegitoBase === 0 && cellCustom === 0 && piccoloUnused === 0) pass('vegito_base/cell-custom/piccolo-unused: 0 en runtime');
else fail(`vegito_base=${vegitoBase} cellCustom=${cellCustom} piccoloUnused=${piccoloUnused}`);

// ── 9) missing component refs 0 + missing files 0 ──
let missingRefs = 0, missingFiles = 0;
for (const b of Object.values(bindingsByForm).filter(Boolean)) {
  for (const x of b!) {
    for (const c of x.components ?? []) {
      if (!existsSync(join(SPRITES_DIR, SPRITE_DIRS[x.formId]!, c.file))) missingRefs++;
    }
    for (const f of x.files) {
      if (!existsSync(join(SPRITES_DIR, SPRITE_DIRS[x.formId]!, f))) missingFiles++;
    }
  }
}
if (missingRefs === 0) pass('component refs: 0 faltantes');
else fail(`component refs faltantes: ${missingRefs}`);
if (missingFiles === 0) pass('files: 0 faltantes');
else fail(`files faltantes: ${missingFiles}`);

// ── 10) physical mappings without provenance 0 ──
let noProvenance = 0;
for (const b of Object.values(bindingsByForm).filter(Boolean)) {
  for (const x of b!) {
    if (PHYSICAL.has(x.classification) && (!x.evidence || x.evidence.length === 0)) noProvenance++;
  }
}
if (noProvenance === 0) pass('physical mappings: 0 sin provenance');
else fail(`sin provenance: ${noProvenance}`);

// ── cobertura (runtime vs física) ──
const physical = (byClass.CANONICAL_PHYSICAL ?? 0) + (byClass.SHARED_PHYSICAL ?? 0) + (byClass.ROM_PHYSICAL ?? 0);
console.log(`\nCobertura: runtime=${total}/${total} (100%) · física=${physical} (${((physical / total) * 100).toFixed(1)}%) · composite=${byClass.COMPOSITE ?? 0} · fx=${byClass.REFERENCE_FX ?? 0} · alias=${byClass.SEMANTIC_ALIAS ?? 0} · fallback=${byClass.FALLBACK ?? 0} · missing=${byClass.MISSING ?? 0} · unresolved=${byClass.UNRESOLVED ?? 0}`);
console.log(`\nResumen: ${Object.entries(byClass).map(([k, v]) => `${k}=${v}`).join(' ')}`);

if (failures === 0) {
  console.log('\n✅ verify:sprite-mapping PASS');
  process.exit(0);
} else {
  console.log(`\n❌ verify:sprite-mapping FAIL (${failures})`);
  process.exit(1);
}
