// ═══════════════════════════════════════════════════════════════════════
// VERIFY: CANON V9 REGENERACIÓN (M8.F0 — guardrail de integridad)
// Uso: npm run verify:canon
//  1. Regenera build-sprite-canon.py desde la MISMA entrada.
//  2. Comprueba que los hashes de las salidas NO cambian (determinismo).
//  3. Valida invariantes del canon: 0 duplicados · 0 mismatch · sequenceIndex
//     válido · roles posicionales · ambigüos no canónicos.
// Regla de fidelidad (F0): si esto falla, el canon está corrupto — nadie
// puede etiquetar nada como GBC canonical hasta que pase.
// ═══════════════════════════════════════════════════════════════════════

import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { SPRITE_CANON } from '../src/data/generated/spriteCanon.generated';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('═══ verify:canon — regeneración determinista + invariantes V9 ═══\n');

// ── 1. Regeneración determinista ──
const OUTPUTS = [
  'sprites-source/catalog-v9/catalog/frame_semantic_registry.json',
  'sprites-source/catalog-v9/catalog/semantic_audit.json',
  'src/data/generated/spriteCanon.generated.ts',
];
function sha(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}
const before = new Map(OUTPUTS.map(f => [f, sha(f)]));
const beforeContents = new Map(OUTPUTS.map(f => [f, readFileSync(f)]));
try {
  execFileSync(process.execPath, ['scripts/run-python.mjs', 'scripts/build-sprite-canon.py'], {
    stdio: 'ignore',
    timeout: 300000,
  });
} catch (error) {
  for (const [file, contents] of beforeContents) writeFileSync(file, contents);
  throw error;
}
let deterministic = true;
for (const f of OUTPUTS) {
  const after = sha(f);
  if (before.get(f) !== after) {
    deterministic = false;
    failures.push(`output changed: ${f}`);
    console.log(`  ✗ determinismo: ${f} cambió tras regenerar`);
  }
}
check('F0: build-sprite-canon.py determinista (misma entrada → mismos hashes)', deterministic);
// Restaurar si cambió (el TS importado en este script ya está en memoria,
// pero el disco debe quedar como estaba si el generador no es estable).
if (!deterministic) {
  console.log('  ⚠ canon NO determinista — revisar build-sprite-canon.py antes de continuar');
  for (const [file, contents] of beforeContents) writeFileSync(file, contents);
}

// ── 2. Invariantes del canon (sobre el TS recién regenerado) ──
const frames = SPRITE_CANON.forms.flatMap(f => f.frames);
check('F0: canon contiene frames (44 formas)', frames.length > 2000);

// 2a. canonicalId únicos
const ids = new Set<string>();
let dupes = 0;
for (const fr of frames) {
  if (ids.has(fr.canonicalId)) dupes++;
  ids.add(fr.canonicalId);
}
check('F0: 0 canonicalId duplicados', dupes === 0);

// 2b. canonicalId consistente con family/role
let mismatch = 0;
for (const fr of frames) {
  if (fr.family === 'unclassified') continue;
  if (!fr.canonicalId.includes(fr.family) || !fr.canonicalId.includes(fr.role)) mismatch++;
}
check('F0: 0 id/family/role mismatch', mismatch === 0);

// 2c. sequenceIndex válido (no negativos; multi-frame sin repetir)
let badSeq = 0;
// Un FRAME FÍSICO (sourceId) debe tener UNA sola clasificación estable — si
// el mismo archivo aparece con dos (family,role,variant,seq) distintas, el
// dedupe está roto. Que dos archivos DISTINTOS compartan role+variant+seq
// es legítimo (el manifest puede referenciar frames redundantes en la misma
// posición: p.ej. 000_beam_charge.png y 031.png ambos charge_start.00).
const bySrc = new Map<string, string>();
for (const fr of frames) {
  if (fr.sequenceIndex < 0) { badSeq++; continue; }
  const sig = `${fr.family}.${fr.role}.${fr.variant}.${fr.sequenceIndex}`;
  const prev = bySrc.get(fr.sourceId);
  if (prev && prev !== sig) badSeq++;
  bySrc.set(fr.sourceId, sig);
}
check('F0: sequenceIndex — cada frame físico tiene UNA clasificación estable', badSeq === 0);

// 2d. roles posicionales reales (evidencia de que roles_for_sequence usa
//     la posición REAL del frame, no el nº de poses compartidas)
const meleeRoles = new Set(frames.filter(f => f.family === 'melee').map(f => f.role));
const defRoles = new Set(frames.filter(f => f.family === 'defense').map(f => f.role));
const beamRoles = new Set(frames.filter(f => f.family === 'beam').map(f => f.role));
check('F0: melee reparte ready/windup/travel/strike/contact/follow_through/recover',
  ['ready', 'windup', 'travel', 'strike', 'contact', 'follow_through', 'recover'].every(r => meleeRoles.has(r)));
check('F0: defense reparte start/hold/recover',
  ['start', 'hold', 'recover'].every(r => defRoles.has(r)));
check('F0: beam reparte charge_start/charge_hold/release',
  ['charge_start', 'charge_hold', 'release'].every(r => beamRoles.has(r)));

// 2e. ambigüos no etiquetados como canónico (regla de fidelidad)
const AMBIGUOUS = ['movement_or_attack_pose', 'idle_or_stance', 'downed_or_hurt',
  'overworld_actor_or_pose', 'projectiles_beams', 'orbs_rings_bursts',
  'character_plus_effect', 'nonbody_misc', 'actor_downed_or_special_pose'];
let ambAsCanon = 0;
for (const fr of frames) {
  if (fr.canonStatus === 'CANONICAL' && AMBIGUOUS.some(a => fr.variant.includes(a))) ambAsCanon++;
}
check('F0: 0 buckets ambiguos etiquetados CANONICAL', ambAsCanon === 0);

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) {
  console.log('\nFallos:');
  failures.forEach(f => console.log(' - ' + f));
  process.exit(1);
}
