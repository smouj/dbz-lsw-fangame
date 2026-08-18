// ═══════════════════════════════════════════════════════════════════════
// M2/M4 — CommandResult: el Engine devuelve SEMÁNTICA, nunca texto.
// ═══════════════════════════════════════════════════════════════════════
// La UI decide cómo traducir/mostrar el rechazo. Razones tipadas.
// M4: el resultado transporta también los eventos (hechos ya ocurridos).
//   { ok: true,  state, events }   — COMMAND_ACCEPTED + hechos de resolución
//   { ok: false, state, reason, events: [COMMAND_REJECTED] } — cero mutación
// ═══════════════════════════════════════════════════════════════════════

import type { BattleEvent } from '../events/BattleEvent';
import type { BattleState } from '../state/BattleState';

export type CommandRejectionReason =
  | 'WRONG_PHASE'             // el comando no pertenece a la fase actual
  | 'NOT_ACTIVE_SIDE'         // no es el turno/exchange de quien envía
  | 'EXCHANGE_BUSY'           // una acción está resolviéndose
  | 'INSUFFICIENT_CC'         // coste CC no cubierto
  | 'INSUFFICIENT_KI'         // coste KI no cubierto
  | 'CARD_NOT_IN_HAND'        // la carta no está en la mano
  | 'CARD_NOT_COMPATIBLE'     // la carta no es usable por el personaje
  | 'INVALID_POSITION'        // posición inválida para la acción
  | 'INVALID_TARGET'          // objetivo inválido
  | 'LIMIT_UNAVAILABLE'       // mazo LIMITED no activo (GATHER) o vacío
  | 'QTE_NOT_ACTIVE'          // no hay ventana QTE activa
  | 'INVALID_QTE_INPUT'       // input fuera de la secuencia esperada
  | 'ACTION_LOCKED'           // acción bloqueada por estado temporal
  | 'DEFENSE_ALREADY_COMMITTED' // M8.C2a: una elección defensiva por ventana

export type CommandCheck =
  | { ok: true }
  | { ok: false; reason: CommandRejectionReason };

export function ok(): CommandCheck {
  return { ok: true };
}

export function reject(reason: CommandRejectionReason): CommandCheck {
  return { ok: false, reason };
}

/** Resultado de execute() (M3+M4): estado + eventos — nunca muta el input. */
export type CommandExecutionResult =
  | { ok: true; state: BattleState; events: BattleEvent[] }
  | { ok: false; state: BattleState; reason: CommandRejectionReason; events: BattleEvent[] };

export function accepted(next: BattleState, events: BattleEvent[] = []): CommandExecutionResult {
  return { ok: true, state: next, events };
}

export function rejected(state: BattleState, reason: CommandRejectionReason, events: BattleEvent[] = []): CommandExecutionResult {
  return { ok: false, state, reason, events };
}
