// ═══════════════════════════════════════════════════════════════════════
// M3 — reducers/movementReducer: MOVE con destino DERIVADO (regla única).
// ═══════════════════════════════════════════════════════════════════════
// El comando solo dice el EJE; el destino lo calcula applyMoveAxis (la
// misma fuente que el juego). Imposible teletransportarse a una posición
// inválida: nunca cambia el otro eje accidentalmente.
// ═══════════════════════════════════════════════════════════════════════

import { applyMoveAxis, type MoveAxis } from '../../../../data/positions';
import type { BattleSide, BattleState } from '../../state/BattleState';

export function moveFighter(state: BattleState, side: BattleSide, axis: MoveAxis): BattleState {
  const fighter = side === 'player' ? state.player : state.enemy;
  const next = { ...fighter, battlePos: applyMoveAxis(fighter.battlePos, axis) };
  return {
    ...state,
    player: side === 'player' ? next : state.player,
    enemy: side === 'enemy' ? next : state.enemy,
  };
}
