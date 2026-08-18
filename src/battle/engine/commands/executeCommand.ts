// ═══════════════════════════════════════════════════════════════════════
// M3/M4 — executeCommand: la ÚNICA entrada de intenciones al Engine.
// ═══════════════════════════════════════════════════════════════════════
// Barrera obligatoria: SIEMPRE canExecute primero. No existe ruta que
// ejecute un comando sin validación. PURA: no muta `state` — devuelve la
// nueva snapshot (rechazo → el MISMO objeto state, cero cambios).
//
// M4 — el resultado incluye los EVENTOS:
//   aceptado  → [COMMAND_ACCEPTED, ...hechos de la resolución]
//   rechazado → [COMMAND_REJECTED { command, reason }]  (cero mutaciones)
// ═══════════════════════════════════════════════════════════════════════

import type { BattleCommand } from './BattleCommand';
import { canExecute } from './canExecute';
import { reduceAcceptedCommand } from './reduceAcceptedCommand';
import type { CommandExecutionResult } from './CommandResult';
import { rejected, accepted } from './CommandResult';
import type { BattleState } from '../state/BattleState';

export function executeCommand(
  state: BattleState,
  command: BattleCommand,
  opts?: Parameters<typeof canExecute>[2],
): CommandExecutionResult {
  const check = canExecute(state, command, opts);
  if (!check.ok) {
    return rejected(state, check.reason, [{ type: 'COMMAND_REJECTED', command, reason: check.reason }]);
  }
  const { state: next, events } = reduceAcceptedCommand(state, command);
  return accepted(next, [{ type: 'COMMAND_ACCEPTED', command }, ...events]);
}

/** Variante de test: lanza si el comando es ilegal (headless sequences). */
export function mustExecute(
  state: BattleState,
  command: BattleCommand,
  opts?: Parameters<typeof canExecute>[2],
): BattleState {
  const result = executeCommand(state, command, opts);
  if (!result.ok) {
    throw new Error(`mustExecute: comando rechazado (${result.reason}): ${JSON.stringify(command)}`);
  }
  return result.state;
}
