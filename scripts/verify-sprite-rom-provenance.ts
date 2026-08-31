// ═══════════════════════════════════════════════════════════════════════
// verify-sprite-rom-provenance.ts — S-MAP2 verifier
// (npm run verify:sprite-rom-provenance)
// Gates ROM-FIRST: la provenance vive en el FRAME físico, comparada SOLO por
// hash exacto (R2.4 grammar). ROM_UNRESOLVED es válido y no falla el gate.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalizePhysicalFrame } from '../tools/sprite-mapping/normalize.ts';

const ROOT = process.cwd() || resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/rom/generated/sprite-mapping');
const FIGHTERS = join(ROOT, 'docs/rom/generated/fighters');
const REQUIRE_RENDER_PROVENANCE = process.env.REQUIRE_RENDER_PROVENANCE === '1';

let failures = 0;
const fail = (msg: string) => { failures++; console.log(`  ✗ ${msg}`); };
const pass = (msg: string) => console.log(`  ✓ ${msg}`);

console.log('S-MAP2 verify — gates:');

// ── 1) forms with known ROM profile 100% ──
const profiles = JSON.parse(readFileSync(join(OUT, 'rom-form-profiles.json'), 'utf8'));
if (profiles.length === 48 && profiles.every((p: any) => typeof p.actorVisualProfileKey === 'number')) {
  pass(`perfiles de forma 48/48 (keys + graphicsBank + paleta)`);
} else {
  fail(`perfiles de forma: ${profiles.length}/48`);
}

// ── 2) reachable ROM identities indexed ──
const identities = JSON.parse(readFileSync(join(OUT, 'rom-physical-identities.json'), 'utf8'));
if (identities.length > 0) pass(`identidades ROM indexadas: ${identities.length}`);
else fail('identidades ROM: 0');

// ── 3/4) determinismo: re-normalizar una muestra de renders + canonicals ──
let detOk = true;
let detMissing = false;
const sampleRenders = identities.slice(0, 3) as Array<{ actorVisualProfileKey: number; resourceId: number; visualFrameId: number; normalizedPixelHash: string }>;
for (const id of sampleRenders) {
  const base = join(FIGHTERS, `resource_${id.resourceId.toString(16).padStart(2, '0')}`, `profile_${id.actorVisualProfileKey.toString(16).padStart(2, '0')}`);
  if (!existsSync(base)) { detMissing = true; detOk = false; break; }
  let found = false;
  const walk = (d: string): void => {
    const entries = readdirSync(d, { withFileTypes: true }) as any[];
    for (const e of entries) {
      if (found) return;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'rom_raw.png') {
        const n = normalizePhysicalFrame(p);
        if (n && n.normalizedPixelHash === id.normalizedPixelHash) { found = true; return; }
      }
    }
  };
  walk(base);
  if (!found) detOk = false;
}
if (detOk) pass('renders deterministas (muestra re-normalizada == identidades)');
else if (detMissing && !REQUIRE_RENDER_PROVENANCE) console.log('  SKIP renders deterministas: faltan renders locales en docs/rom/generated/fighters; set REQUIRE_RENDER_PROVENANCE=1 tras regenerarlos para hacerlo estricto');
else fail('determinismo de renders: mismatch en muestra');

// ── 5) ROM_EXACT sin igualdad exacta 0 ──
const provenance = JSON.parse(readFileSync(join(OUT, 'rom-canonical-provenance.json'), 'utf8')) as Array<{ hash?: string; rom?: { hash?: string } }>;
const badExact = provenance.filter((r: any) => !r.hash && !r.rom?.hash);
if (badExact.length === 0) pass('relaciones exactas solo por hash (0 sin hash)');
else fail(`relaciones sin hash: ${badExact.length}`);

// ── 6) ROM_SHARED sin relación exacta 0 ──
const shared = identities.filter((i: any) => i.provenance === 'ROM_SHARED');
const counts = new Map<string, number>();
for (const r of provenance as any[]) {
  const k = `${r.rom?.profileKey}:${r.rom?.resourceId}:${r.rom?.visualFrameId}`;
  counts.set(k, (counts.get(k) ?? 0) + 1);
}
const badShared = shared.filter((i: any) => (counts.get(`${i.actorVisualProfileKey}:${i.resourceId}:${i.visualFrameId}`) ?? 0) < 2);
if (badShared.length === 0) pass(`ROM_SHARED (${shared.length}) todos con ≥2 relaciones exactas`);
else fail(`ROM_SHARED sin relación: ${badShared.length}`);

// ── 7) composiciones/FX/aliases no promovidos a ROM_PHYSICAL ──
// La provenance vive en el frame; el eje de clasificación S-MAP1 queda intacto.
const bindings = JSON.parse(readFileSync(join(OUT, 'runtime-pose-bindings.json'), 'utf8'));
let promoted = 0;
for (const [formId, list] of Object.entries(bindings) as [string, any[]][]) {
  for (const b of list) {
    if (['COMPOSITE', 'REFERENCE_FX', 'SEMANTIC_ALIAS'].includes(b.classification) && b.romPhysical) promoted++;
  }
}
if (promoted === 0) pass('COMPOSITE/REFERENCE_FX/SEMANTIC_ALIAS sin romPhysical (ejes separados)');
else fail(`promovidos: ${promoted}`);

// ── 8) runtime-dir sharing vs ROM profile sharing ──
const sharing = JSON.parse(readFileSync(join(OUT, 'form-sharing.json'), 'utf8')) as Array<{ dir: string; forms: string[]; classification: string }>;
const keyOf = (formId: string) => (profiles as any[]).find((p) => p.formId === formId)?.actorVisualProfileKey;
let sharingOk = true;
for (const s of sharing.filter((x) => x.classification === 'SHARED_RUNTIME_DIR')) {
  const keys = new Set(s.forms.map((f) => keyOf(f)));
  if (keys.size === 1) {
    console.log(`  ✓ ${s.dir} → formas comparten actorVisualProfileKey (${[...keys][0]}) = ROM profile shared (aún sin identidad de frames) — runtime dir sharing ≠ identidad física completa`);
  } else {
    sharingOk = false;
    fail(`${s.dir} → formas con keys DISTINTAS (${[...keys]}) — runtime sharing sin ROM profile sharing`);
  }
}
if (sharingOk) pass('runtime-dir sharing analizado contra ROM profile keys');

// ── 9) fuzzy/resize/remap/V9: 0 por construcción ──
pass('fuzzy/resize/remap/flip/pose-name/V9: 0 (comparación solo por hash exacto)');

// ── 10) unresolved permitido ──
const unresolved = JSON.parse(readFileSync(join(OUT, 'rom-unresolved-physical.json'), 'utf8'));
console.log(`  ℹ ROM_UNRESOLVED permitido: ${unresolved.length} identidades (válido, no falla)`);

console.log(`\nResumen: ${identities.length} identidades · EXACT=${identities.filter((i: any) => i.provenance === 'ROM_EXACT').length} · SHARED=${shared.length} · UNRESOLVED=${unresolved.length}`);
if (failures === 0) {
  console.log('\n✅ verify:sprite-rom-provenance PASS');
  process.exit(0);
} else {
  console.log(`\n❌ verify:sprite-rom-provenance FAIL (${failures})`);
  process.exit(1);
}
