// ═══════════════════════════════════════════════════════════════════════
// M2 — rules/movementRules: MOVE solo en 2 ejes (GBC, spec §9).
// ═══════════════════════════════════════════════════════════════════════
// Nada de cuatro teletransportes: HORIZONTAL ↔ cambia depth (BACK↔FRONT),
// VERTICAL ↕ cambia altitude (GROUND↔AIR) — la regla vive AQUÍ (y en
// applyMoveAxis de positions.ts, la misma fuente que consume main.tsx).
// ═══════════════════════════════════════════════════════════════════════

import { applyMoveAxis, BattlePosition, type MoveAxis } from '../../../../data/positions';
import type { BattleSide, BattleState } from '../../state/BattleState';
import type { CommandCheck } from '../CommandResult';
import { ok, reject } from '../CommandResult';



/** Destino derivado de la posición actual + eje (misma regla que el juego). */
export function destinationFor(pos: BattlePosition, axis: MoveAxis): BattlePosition {
  return applyMoveAxis(pos, axis);
}

/** ¿El eje es legal para la posición actual? (siempre legal: 4 posiciones
    válidas × 2 ejes — el destino nunca es la misma posición). */
export function canMove(state: BattleState, side: BattleSide, axis: MoveAxis): CommandCheck {
  const pos = (side === 'player' ? state.player : state.enemy).battlePos;
  const dest = destinationFor(pos, axis);
  if (dest === pos) return reject('INVALID_POSITION');
  return ok();
}

/** Destino posible para cada eje (derivable — la UI lo muestra). */
export function availableMovement(state: BattleState, side: BattleSide): { axis: MoveAxis; to: BattlePosition }[] {
  const pos = (side === 'player' ? state.player : state.enemy).battlePos;
  return (['HORIZONTAL', 'VERTICAL'] as MoveAxis[]).map(axis => ({ axis, to: destinationFor(pos, axis) }));
}
