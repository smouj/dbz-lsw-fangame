// ═══════════════════════════════════════════════════════════════════════
// M2 — rules/defenseRules + stageAttackRules: ventanas defensivas y BASIC.
// ═══════════════════════════════════════════════════════════════════════

import type { BattleState } from '../../state/BattleState';
import type { CommandCheck } from '../CommandResult';
import { ok, reject } from '../CommandResult';

// ─── defenseRules ───────────────────────────────────────────────────────
/** La fuente LIMITED de defensa requiere GATHER activo + cartas disponibles. */
export function canUseDefenseLimit(state: BattleState, limitCount: number): CommandCheck {
  if (state.powerState === 'NORMAL') return reject('LIMIT_UNAVAILABLE');
  if (limitCount <= 0) return reject('LIMIT_UNAVAILABLE');
  return ok();
}

/** GUARD (bloqueo básico) — legal en cualquier ventana defensiva. */
export function canGuard(): CommandCheck {
  return ok();
}

// ─── stageAttackRules (BASIC) ───────────────────────────────────────────
/** STAGE ATTACK: disponible mientras la fase BASIC esté abierta (siempre). */
export function canStageAttack(): CommandCheck {
  return ok();
}

/** GATHER POWER: bloqueado mientras ya esté activo (gatherTurns > 0). */
export function canGatherPower(state: BattleState): CommandCheck {
  return state.gatherTurns > 0 ? reject('ACTION_LOCKED') : ok();
}

/** LIMIT (command-strip): requiere GATHER activo + cartas LIMITED del roster. */
export function canOpenLimit(state: BattleState, limitCardsCount: number): CommandCheck {
  if (state.powerState === 'NORMAL') return reject('LIMIT_UNAVAILABLE');
  if (limitCardsCount <= 0) return reject('LIMIT_UNAVAILABLE');
  return ok();
}
