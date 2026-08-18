// ═══════════════════════════════════════════════════════════════════════
// M3/M4 — reducers/movementReducer: MOVE con destino DERIVADO (regla única).
// ═══════════════════════════════════════════════════════════════════════
// El comando solo dice el EJE; el destino lo calcula applyMoveAxis (la
// misma fuente que el juego). Imposible teletransportarse a una posición
// inválida: nunca cambia el otro eje accidentalmente.
// M4: POSITION_CHANGED con from/to/axis exactos (solo si hubo movimiento).
// M8.C1: EMPUJE GBC §9 — si el jugador avanza a FRONT y el rival está en
// BACK, el rival pasa a FRONT (misma altitud): el frente empuja al frente.
// Regla de DOMINIO del Engine (el legacy hacía setEnemy por su cuenta).
// ═══════════════════════════════════════════════════════════════════════

import { applyMoveAxis, BattlePosition, POSITION_DATA, type MoveAxis } from '../../../../data/positions';
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
  let s: BattleState = {
    ...state,
    player: side === 'player' ? next : state.player,
    enemy: side === 'enemy' ? next : state.enemy,
  };
  const events: BattleEvent[] = [{ type: 'POSITION_CHANGED', side, from, to, axis }];
  // EMPUJE GBC §9 (solo eje horizontal, avanzando a FRONT): el rival que
  // está en BACK pasa a FRONT (misma altitud) — el frente se empuja.
  if (side === 'player' && axis === 'HORIZONTAL' && POSITION_DATA[to].depth === 'FRONT') {
    const rival = state.enemy;
    if (POSITION_DATA[rival.battlePos].depth === 'BACK') {
      const pushed: BattlePosition = POSITION_DATA[rival.battlePos].altitude === 'AIR'
        ? BattlePosition.UP_FRONT
        : BattlePosition.DOWN_FRONT;
      s = { ...s, enemy: { ...rival, battlePos: pushed } };
      events.push({ type: 'POSITION_CHANGED', side: 'enemy', from: rival.battlePos, to: pushed, axis: 'HORIZONTAL' });
    }
  }
  return { state: s, events };
}
