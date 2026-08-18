// ═══════════════════════════════════════════════════════════════════════
// M3/M4 — reducers/movementReducer: MOVE con destino DERIVADO (regla única).
// ═══════════════════════════════════════════════════════════════════════
// El comando solo dice el EJE; el destino lo calcula applyMoveAxis (la
// misma fuente que el juego). Imposible teletransportarse a una posición
// inválida: nunca cambia el otro eje accidentalmente.
// M4: POSITION_CHANGED con from/to/axis exactos (solo si hubo movimiento).
// ═══════════════════════════════════════════════════════════════════════

import { applyMoveAxis, type MoveAxis } from '../../../../data/positions';
import type { BattleEvent } from '../../events/BattleEvent';
import type { BattleSide, BattleState } from '../../state/BattleState';

export interface MoveOutcome {
  state: BattleState;
  events: BattleEvent[];
}

export function moveFighter(state: BattleState, side: BattleSide, axis: MoveAxis): MoveOutcome {
  const fighter = side === 'player' ? state.player : state.enemy;
  const from = fighter.battlePos;
  const to = applyMoveAxis(from, axis);
  if (to === from) return { state, events: [] };
  const next = { ...fighter, battlePos: to };
  return {
    state: {
      ...state,
      player: side === 'player' ? next : state.player,
      enemy: side === 'enemy' ? next : state.enemy,
    },
    events: [{ type: 'POSITION_CHANGED', side, from, to, axis }],
  };
}
