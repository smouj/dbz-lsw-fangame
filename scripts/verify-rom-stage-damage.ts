#!/usr/bin/env tsx
/**
 * verify:rom-stage-damage
 *
 * Valida la fórmula de daño Stage ROM §86-93/§130 (COMBAT_MECHANICS_ROM_CONFIRMED):
 *   attack = str (+4 pw>0) + strTier×8   (clamp ≥ 0)
 *   raw    = max(0, attack − guardTier×8 − (defBack?8) − (basicGuard?4))
 *   base   = raw >> 2 (÷4) · attackerBack → >>1 · defenderBack → >>1
 *   final  = resolved === 0 ? 0 : base + resolvedCommandCount
 *
 * Matriz espacial (§90-91): F/F = base · B/F = base/2 · F/B = (def BACK −8)+/2
 * · B/B = −8 + /2 + /2. Casos adicionales: powerWindow +4 (§87), tiers ±8
 * (§87/§89), Basic Guard −4 (§89), resolved 0 → 0 forzado (§92).
 */

import { romStageDamage } from '../src/battle/engine/combat/resolution';

let failures = 0;
function check(name: string, actual: number, expected: number): void {
  if (actual === expected) {
    console.log(`PASS ${name} = ${actual}`);
  } else {
    failures++;
    console.error(`FAIL ${name} — actual ${actual}, esperado ${expected}`);
  }
}

const S = 40;
const R = 4;

// Matriz espacial (sin tiers, sin pw, 4 comandos resueltos)
check('F/F: base + resolved (40→raw40→base10→14)', romStageDamage({ strength: S, powerWindow: false, strStage: 0, guardStage: 0, attackerBack: false, defenderBack: false, basicGuard: false, resolvedCommandCount: R }), 14);
check('B/F: base >>1 (40→base10→5→9)', romStageDamage({ strength: S, powerWindow: false, strStage: 0, guardStage: 0, attackerBack: true, defenderBack: false, basicGuard: false, resolvedCommandCount: R }), 9);
check('F/B: def BACK −8 + base >>1 (32→8→4→8)', romStageDamage({ strength: S, powerWindow: false, strStage: 0, guardStage: 0, attackerBack: false, defenderBack: true, basicGuard: false, resolvedCommandCount: R }), 8);
check('B/B: −8 + >>1 + >>1 (32→8→2→6)', romStageDamage({ strength: S, powerWindow: true === false ? false : false, strStage: 0, guardStage: 0, attackerBack: true, defenderBack: true, basicGuard: false, resolvedCommandCount: R }), 6);

// §87: powerWindowCounter > 0 → +4 ofensivo
check('PW>0: +4 (44→base11→15)', romStageDamage({ strength: S, powerWindow: true, strStage: 0, guardStage: 0, attackerBack: false, defenderBack: false, basicGuard: false, resolvedCommandCount: R }), 15);

// §87: tiers STR netos (±8 por tier)
check('STR tier +1: +8 (48→base12→16)', romStageDamage({ strength: S, powerWindow: false, strStage: 1, guardStage: 0, attackerBack: false, defenderBack: false, basicGuard: false, resolvedCommandCount: R }), 16);
check('STR tier −1: −8 (32→base8→12)', romStageDamage({ strength: S, powerWindow: false, strStage: -1, guardStage: 0, attackerBack: false, defenderBack: false, basicGuard: false, resolvedCommandCount: R }), 12);

// §89: tiers GUARD netos del defensor (defBuff − vuln) restan
check('GUARD tier +1: −8 (32→base8→12)', romStageDamage({ strength: S, powerWindow: false, strStage: 0, guardStage: 1, attackerBack: false, defenderBack: false, basicGuard: false, resolvedCommandCount: R }), 12);
check('GUARD tier −1 (vuln): +8 (48→base12→16)', romStageDamage({ strength: S, powerWindow: false, strStage: 0, guardStage: -1, attackerBack: false, defenderBack: false, basicGuard: false, resolvedCommandCount: R }), 16);

// §89: Basic Guard (CA82 == 2) → −4
check('Basic Guard: −4 (36→base9→13)', romStageDamage({ strength: S, powerWindow: false, strStage: 0, guardStage: 0, attackerBack: false, defenderBack: false, basicGuard: true, resolvedCommandCount: R }), 13);

// §92: resolvedCommandCount == 0 → 0 forzado (aunque base > 0)
check('resolved 0 → 0 forzado', romStageDamage({ strength: S, powerWindow: false, strStage: 0, guardStage: 0, attackerBack: false, defenderBack: false, basicGuard: false, resolvedCommandCount: 0 }), 0);

// §92: resolved cuenta como daño directo (base + N)
check('resolved 5: base + 5 (40→base10→15)', romStageDamage({ strength: S, powerWindow: false, strStage: 0, guardStage: 0, attackerBack: false, defenderBack: false, basicGuard: false, resolvedCommandCount: 5 }), 15);

// Clamp inferior: attack negativo → 0 (raw 0 → base 0 → +resolved)
check('str 0 + debuff: clamp a 0 (raw0→base0→4)', romStageDamage({ strength: 0, powerWindow: false, strStage: -1, guardStage: 0, attackerBack: false, defenderBack: false, basicGuard: false, resolvedCommandCount: R }), 4);

console.log(failures === 0 ? `\n═══ RESULTADO: 13 ✓ · 0 ✗ ═══` : `\n═══ RESULTADO: ${13 - failures} ✓ · ${failures} ✗ ═══`);
process.exit(failures === 0 ? 0 : 1);
