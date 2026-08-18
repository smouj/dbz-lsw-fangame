// ═══════════════════════════════════════════════════════════════════════
// M2 — CommandResult: el Engine devuelve SEMÁNTICA, nunca texto.
// ═══════════════════════════════════════════════════════════════════════
// La UI decide cómo traducir/mostrar el rechazo. Razones tipadas.
// ═══════════════════════════════════════════════════════════════════════

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

export type CommandCheck =
  | { ok: true }
  | { ok: false; reason: CommandRejectionReason };

export function ok(): CommandCheck {
  return { ok: true };
}

export function reject(reason: CommandRejectionReason): CommandCheck {
  return { ok: false, reason };
}

/** Resultado de execute() (M3) — ya tipado para no cambiar el contrato. */
export type CommandExecutionResult =
  | { status: 'accepted' }
  | { status: 'rejected'; reason: CommandRejectionReason };
