// ═══════════════════════════════════════════════════════════════════════
// M2 — rules/resourceRules: costes y recursos (CC/KI).
// ═══════════════════════════════════════════════════════════════════════
// Puro: no consume nada — solo comprueba. La resolución (M3) descontará.
// ═══════════════════════════════════════════════════════════════════════

import type { BattleSide, BattleState } from '../../state/BattleState';
import type { CommandCheck } from '../CommandResult';
import { ok, reject } from '../CommandResult';

/** ¿El combatiente cubre el coste CC? (no consume — solo consulta) */
export function hasCc(state: BattleState, side: BattleSide, cost: number): CommandCheck {
  const f = side === 'player' ? state.player : state.enemy;
  return f.cc >= cost ? ok() : reject('INSUFFICIENT_CC');
}

/** ¿El combatiente cubre el coste KI? */
export function hasKi(state: BattleState, side: BattleSide, cost: number): CommandCheck {
  const f = side === 'player' ? state.player : state.enemy;
  return f.ki >= cost ? ok() : reject('INSUFFICIENT_KI');
}

/** CC del combatiente (lectura). */
export function ccOf(state: BattleState, side: BattleSide): number {
  return (side === 'player' ? state.player : state.enemy).cc;
}
