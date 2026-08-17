// ═══════════════════════════════════════════════════════════════════════
// BATTLE COMBAT — fórmulas de combate COMPARTIDAS (fuente única).
// El sistema HIT/BLOCK/AVOID y el multiplicador de posición estaban
// duplicados (ataque del jugador y defensa del jugador). Ahora ambas
// ramas consumen estas funciones — un cambio de fórmula afecta a las dos.
// Nivel de evidencia: COMMUNITY_TESTED (ver docs/STATE.md).
// ═══════════════════════════════════════════════════════════════════════

import type { CardType } from '../data/cards';
import { POSITION_DATA, BattlePosition, isBeamVulnerable, isDamageVulnerable } from '../data/positions';

export type HitBlockAvoid = 'avoid' | 'block' | 'hit';

/**
 * Sistema HIT/BLOCK/AVOID del GBC (misma rutina en ataque y defensa).
 * - avoid: esquiva completa (0 daño) — probabilidad según SPD del defensor
 *   y ACC del atacante.
 * - block: bloqueo parcial (×0.25) — 55% del resto.
 * - hit: impacto completo.
 */
export function resolveHitBlockAvoid(defenderSpd: number, attackerAcc: number, rng: () => number = Math.random): HitBlockAvoid {
  const avoidChance = Math.max(0.05, Math.min(0.35, 0.05 + (defenderSpd - 25) * 0.004 + (100 - attackerAcc) * 0.002));
  const gRoll = rng();
  if (gRoll < avoidChance) return 'avoid';
  if (gRoll < avoidChance + 0.55) return 'block';
  return 'hit';
}

/**
 * Multiplicador de posición (test ROM): FRONT vulnerable = 0.8, resto = 0.5.
 * AIR vulnerable a Beam · GROUND a Damage.
 */
export function positionMultiplier(ePos: BattlePosition, cardType: CardType): number {
  const ePd = POSITION_DATA[ePos];
  const vulnerable =
    (isBeamVulnerable(ePos) && cardType === 'beam') ||
    (isDamageVulnerable(ePos) && cardType === 'damage');
  return ePd.depth === 'FRONT' && vulnerable ? 0.8 : 0.5;
}

/** Daño base del GBC: (power + move) × positionMultiplier. */
export function attackDamage(cardAtk: number, power: number, ePos: BattlePosition, cardType: CardType): number {
  return Math.floor((cardAtk + power) * positionMultiplier(ePos, cardType));
}
