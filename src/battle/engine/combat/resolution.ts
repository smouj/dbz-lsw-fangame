// ═══════════════════════════════════════════════════════════════════════
// M5 — combat/resolution: fórmulas de daño/precisión PURAS del Engine.
// ═══════════════════════════════════════════════════════════════════════
// Shadow parity con el legacy (main.tsx + battle/combat.ts): estas
// funciones reciben el VALOR de la tirada (0..1) y devuelven la MISMA
// decisión que la rutina original con ese valor — así los tests pueden
// comparar legacy vs engine con inputs idénticos. El consumo de RNG
// (avances) ocurre SOLO en quien llama (reduceAcceptedCommand), nunca
// dentro de estas funciones.
//
// M5 NO rebalancea: reproduce exactamente el comportamiento auditado.
// ═══════════════════════════════════════════════════════════════════════

import type { CardType } from '../../../data/cards';
import { BattlePosition, POSITION_DATA, isBeamVulnerable, isDamageVulnerable, type MoveAxis } from '../../../data/positions';
import type { HitBlockAvoid } from '../../combat';
import { resolveHitBlockAvoid, attackDamage as legacyAttackDamage, positionMultiplier as legacyPositionMultiplier } from '../../combat';

// ─── Precisión / evasión (paridad exacta con main.tsx) ───────────────────

/** ACC efectiva de ataque: +30 mientras dure accuracy-up (pAcc > 0). */
export function effectiveAttackAccuracy(acc: number, accUpActive: boolean): number {
  return accUpActive ? Math.min(100, acc + 30) : acc;
}

/** ACC efectiva de defensa: −30 mientras dure evasion-up (pEva > 0). */
export function effectiveDefenseAccuracy(acc: number, evaActive: boolean): number {
  return evaActive ? Math.max(0, acc - 30) : acc;
}

/** ¿La tirada acierta? (roll <= effAcc/100, o lockOn garantiza el golpe). */
export function accuracyHits(roll: number, effAcc: number, lockOn: boolean): boolean {
  return lockOn || roll <= effAcc / 100;
}

/** Respuesta del defensor (GBC): 55% defender · 45% moverse. */
export function enemyResponseFromRoll(roll: number): 'defend' | 'move' {
  return roll < 0.55 ? 'defend' : 'move';
}

/** Eje del movimiento evasivo del defensor: 50/50. */
export function moveAxisFromRoll(roll: number): MoveAxis {
  return roll < 0.5 ? 'HORIZONTAL' : 'VERTICAL';
}

/**
 * HIT/BLOCK/AVOID con valor de tirada explícito — MISMA fórmula que
 * battle/combat.ts resolveHitBlockAvoid (paridad: mismo roll → mismo veredicto).
 */
export function hitBlockAvoidFromRoll(roll: number, defenderSpd: number, attackerAcc: number): HitBlockAvoid {
  return resolveHitBlockAvoid(defenderSpd, attackerAcc, () => roll);
}

// ─── Poder / stats (paridad con main.tsx pBuffs/eBuffs) ──────────────────

/** Poder ofensivo: beam → ki + stages.ki*8 · damage → str + stages.str*8. */
export function powerFor(cardType: CardType, str: number, ki: number, strStages: number, kiStages: number): number {
  return cardType === 'beam' ? ki + kiStages * 8 : str + strStages * 8;
}

/** SPD defensivo efectivo: spd + stages.spd*8. */
export function spdFor(spd: number, spdStages: number): number {
  return spd + spdStages * 8;
}

// ─── Daño (paridad con battle/combat.ts + resolveStageResult) ────────────

export function positionMultiplier(ePos: BattlePosition, cardType: CardType): number {
  return legacyPositionMultiplier(ePos, cardType);
}

/** Daño de carta de ataque: (atk + power) × posMult (battle/combat.ts). */
export function attackDamage(cardAtk: number, power: number, ePos: BattlePosition, cardType: CardType): number {
  return legacyAttackDamage(cardAtk, power, ePos, cardType);
}

/** Daño del Stage completo (resolveStageResult): (atk + str) × posMult. */
export function stageAttackDamage(cardAtk: number, str: number, ePos: BattlePosition, cardType: CardType): number {
  return Math.floor((cardAtk + str) * positionMultiplier(ePos, cardType));
}

/** Daño parcial del Stage abortado (SAFE_ABORT): progreso × daño completo. */
export function stagePartialDamage(cardAtk: number, str: number, ePos: BattlePosition, cardType: CardType, progress: number): number {
  return Math.max(0, Math.floor((cardAtk + str) * positionMultiplier(ePos, cardType) * progress));
}

/** Daño del contraataque (COUNTER_HIT): max(1, (str+ki) × posMult × 0.5). */
export function counterDamage(str: number, ki: number, pPos: BattlePosition, cardType: CardType): number {
  return Math.max(1, Math.floor((str + ki) * positionMultiplier(pPos, cardType) * 0.5));
}

/** Progreso del Stage abortado: min(1, correctos / total). */
export function stageProgress(correct: number, total: number): number {
  return Math.min(1, total > 0 ? correct / total : 0);
}

/** HP canónico: nunca negativo, nunca por encima del máximo. */
export function clampHp(hp: number, maxHp: number): number {
  return Math.max(0, Math.min(maxHp, hp));
}

// Re-export del multiplicador posicional del legacy (misma fuente única)
export { POSITION_DATA, BattlePosition, isBeamVulnerable, isDamageVulnerable };
