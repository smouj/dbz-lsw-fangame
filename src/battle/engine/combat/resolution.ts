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

// ─── Stage Attack — fórmula ROM §86-93/§130 (SUPERSEDE el legacy de arriba) ───
// ROM §130 (COMBAT_MECHANICS_ROM_CONFIRMED):
//   attack = str (×2 si kaioKen — el engine modela kaioKen como +2 tiers
//            vía buff_kaio, así que aquí entra como tier neto) + (pw>0 ? 4 : 0)
//            + strBuffTier×8 − strDebuffTier×8   (clamp ≥ 0)
//   defense = vulnTier×8 − defBuffTier×8 − (defBack ? 8 : 0) − (basicGuard ? 4 : 0)
//   raw = max(0, attack + vulnerability − defense)
//   base = raw >> 2  (÷4)
//   attacker BACK → base >>= 1 · defender BACK → base >>= 1
//   final = resolvedCommandCount === 0 ? 0 : base + resolvedCommandCount
// El engine mantiene tiers NETOS (buffs positivos, debuffs negativos):
//   strStage neto ≡ strBuff − strDebuff · guardStage neto ≡ defBuff − vuln
// ⇒ raw = max(0, attack − guardStage×8 − (defBack?8:0) − (basicGuard?4:0))
export interface RomStageDamageInput {
  /** Fuerza base del atacante (sin tiers). */
  strength: number;
  /** powerWindowCounter > 0 → +4 ofensivo (ROM §87). */
  powerWindow: boolean;
  /** Tier neto de STR del atacante (buffs − debuffs). */
  strStage: number;
  /** Tier neto de GUARD del defensor (defBuff − vuln; se resta). */
  guardStage: number;
  /** depth === 'BACK' del atacante (base >>= 1 tras ÷4). */
  attackerBack: boolean;
  /** depth === 'BACK' del defensor (−8 en defense + base >>= 1). */
  defenderBack: boolean;
  /** Basic Guard (CA82 == 2) → −4 en defense (ROM §89). */
  basicGuard: boolean;
  /** Comandos resueltos (CA7F): daño = base + count; 0 → 0 forzado. */
  resolvedCommandCount: number;
}

/** Fórmula Stage ROM §86-93/§130. Sustituye al legacy para el engine. */
export function romStageDamage(input: RomStageDamageInput): number {
  let attack = input.strength;
  if (input.powerWindow) attack += 4;
  attack += input.strStage * 8;
  attack = Math.max(0, attack);

  let raw = Math.max(0, attack - input.guardStage * 8 - (input.defenderBack ? 8 : 0) - (input.basicGuard ? 4 : 0));
  let base = raw >> 2;
  if (input.attackerBack) base >>= 1;
  if (input.defenderBack) base >>= 1;
  return input.resolvedCommandCount === 0 ? 0 : base + input.resolvedCommandCount;
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
