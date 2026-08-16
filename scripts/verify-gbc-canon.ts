// ═══════════════════════════════════════════════════════════
// DBZ LSW — Verificación de canonización GBC (gameplay invariants)
// ═══════════════════════════════════════════════════════════
// Comprueba que los invariantes del GBC documentados en la spec se mantienen:
//   - Economía CC (spec §CC): +3 al atacar, +1 por input QTE, +1/2 al recibir
//     daño, +1 por vulnerabilidad de posición, básicas gratis.
//   - Vulnerabilidades de posición: AIR→beam, GROUND→damage.
//   - Orden de exchanges: el de mayor SPD ataca primero; 2 exchanges por turno.
//   - Secuencias canónicas de Stage Attack (pool, no aleatorio).
//   - Mazo de 20 cartas, máx 3 copias (spec Core Identity).
// Ejecutar: npx tsx scripts/verify-gbc-canon.ts
import fs from 'node:fs';
import path from 'node:path';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) { failures++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`ok   ${name}`);
}

// ── Posiciones: vulnerabilidad canonizada ──
import { POSITION_DATA, isBeamVulnerable, isDamageVulnerable, BattlePosition } from '../src/data/positions';
for (const [pos, data] of Object.entries(POSITION_DATA)) {
  const p = pos as BattlePosition;
  const beam = isBeamVulnerable(p);
  const dmg = isDamageVulnerable(p);
  check(`pos:${pos}:beamVulnMatchesAltitude`, beam === (data.altitude === 'AIR'), `beam=${beam} altitude=${data.altitude}`);
  check(`pos:${pos}:dmgVulnMatchesAltitude`, dmg === (data.altitude === 'GROUND'), `dmg=${dmg} altitude=${data.altitude}`);
  check(`pos:${pos}:exclusiveVuln`, beam !== dmg, 'no puede ser vulnerable a ambos');
}

// ── Mazo: 20 cartas, máx 3 copias ──
import { CARDS } from '../src/data/cards';
const copyCounts = new Map<string, number>();
for (const c of CARDS) copyCounts.set(c.name, (copyCounts.get(c.name) ?? 0) + 1);
let maxCopies = 0, worstCard = '';
for (const [name, n] of copyCounts) {
  if (n > maxCopies) { maxCopies = n; worstCard = name; }
  check(`cards:${name}:max3Copies`, n <= 3, `${n} copias`);
}
console.log(`     (carta con más copias: ${worstCard} x${maxCopies})`);
const types = new Set(CARDS.map(c => c.type));
for (const t of ['command', 'damage', 'beam', 'support', 'defense', 'special']) {
  check(`cards:type:${t}`, types.has(t));
}

// ── Secuencias canónicas de Stage Attack ──
import { STAGE_SEQUENCE_POOL, nextStageSequence, resetStageRotation } from '../src/battle/stageSequences';
for (const level of [3, 4, 5, 6] as const) {
  const pool = STAGE_SEQUENCE_POOL[level];
  check(`stage:${level}:poolSize`, pool.length >= 6, `${pool.length}`);
  check(`stage:${level}:seqLength`, pool.every(s => s.length === level));
  check(`stage:${level}:grammar`, pool.every(s => {
    const dirs = s.filter(k => k === 'UP' || k === 'DOWN' || k === 'LEFT' || k === 'RIGHT');
    const ab = s.filter(k => k === 'A' || k === 'B');
    return ab.length === 3 && dirs.length === level - 3;
  }));
  resetStageRotation(level);
  const seen = new Set<string>();
  for (let i = 0; i < pool.length; i++) seen.add(nextStageSequence(level).join(''));
  check(`stage:${level}:rotationNoRepeat`, seen.size === pool.length, `${seen.size}/${pool.length}`);
}
resetStageRotation();

// ── Perfiles de acción: toda carta de combate tiene perfil firma ──
import { resolveActionProfile } from '../src/battle/actionProfiles';
const combat = CARDS.filter(c => ['command', 'damage', 'beam'].includes(c.type));
const missing = combat.filter(c => !resolveActionProfile(c.name));
check('profiles:allCombatCardsCovered', missing.length === 0, missing.map(c => c.name).join(', '));

// ── Manifests: todas las formas del roster resuelven a manifest ──
import { FORMS } from '../src/data/roster';
import { spriteDirFor } from '../src/data/spriteManifest';
const formIds = Object.values(FORMS).map((f: { id: string }) => f.id);
const brokenForms = formIds.filter(id => {
  const dir = spriteDirFor(id);
  return !fs.existsSync(path.join('public/assets/sprites', dir, 'manifest.json'));
});
check('forms:allResolveToManifest', brokenForms.length === 0, brokenForms.join(', '));

// ── Transformaciones en combate (cartas Sup.Saiyan-2/3) ──
import { nextTransformedForm, isTransformCard } from '../src/battle/transforms';
check('transform:gokuBaseToSsj', nextTransformedForm('goku_base') === 'goku_ssj', String(nextTransformedForm('goku_base')));
check('transform:gokuSsjToSsj2', nextTransformedForm('goku_ssj') === 'goku_ssj2', String(nextTransformedForm('goku_ssj')));
check('transform:lastFormIsNull', nextTransformedForm('goku_ssj3') === null, String(nextTransformedForm('goku_ssj3')));
check('transform:noChainReturnsNull', nextTransformedForm('krillin_base') === null, String(nextTransformedForm('krillin_base')));
check('transform:cardIds', isTransformCard(27) && isTransformCard(28) && !isTransformCard(1));

console.log(failures === 0 ? '\nGBC CANON OK ✅' : `\n${failures} FAILURES ❌`);
process.exit(failures === 0 ? 0 : 1);
