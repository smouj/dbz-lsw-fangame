// ═══════════════════════════════════════════════════════════════════════
// M2 — canExecute: ÚNICA autoridad de legalidad de gameplay.
// ═══════════════════════════════════════════════════════════════════════
// PURA: state + command → CommandCheck. Sin mutaciones, sin RNG, sin
// timers, sin animaciones, sin eventos. La misma pareja siempre devuelve
// el mismo resultado. La UI consulta; el Engine (M3) vuelve a validar.
// ═══════════════════════════════════════════════════════════════════════

import type { BattleCommand } from './BattleCommand';
import type { CommandCheck } from './CommandResult';
import { ok, reject } from './CommandResult';
import type { BattlePhase, BattleSide, BattleState } from '../state/BattleState';
import { getCard } from '../../../data/cards';
import { canPlayCard, canPlayDefenseCard } from './rules/cardRules';
import { canMove } from './rules/movementRules';
import { canGuard, canGatherPower, canOpenLimit, canStageAttack, canUseDefenseLimit } from './rules/defenseRules';

/** Fase en la que es legal cada comando (contrato central). */
const PHASE_REQUIREMENTS: Partial<Record<BattleCommand['type'], BattlePhase[]>> = {
  LIMIT: ['command'],
  JOINT: ['command'],
  BASIC: ['command'],
  CHARACTER_ACTION: ['command'],
  SELECT_CARD: ['cardSelect'],
  PLAY_CARD: ['cardSelect'],
  PLAY_LIMIT_CARD: ['limitSelect', 'cardSelect'],
  BASIC_STAGE_ATTACK: ['basic'],
  GATHER_POWER: ['basic'],
  DEFENSE_LIMIT: ['defend'],
  DEFENSE_JOINT: ['defend'],
  DEFENSE_BASIC: ['defend'],
  GUARD: ['defend'],
  PLAY_DEFENSE_CARD: ['defend'],
  MOVE: ['defend'],
  // M8.C2a — RESET_DEFENSE es una primitiva de orquestación: sin requisito
  // de fase (idempotente, abre ventana fresh). El juego lo llama al entrar
  // en 'defend'; el harness headless lo usa entre elecciones del escenario.
  RESET_DEFENSE: undefined,
  QTE_INPUT: ['stageInput'],
  QTE_COUNTER_DEFEND: ['stageInput'],
  QTE_COUNTER_CONTINUE: ['stageInput'],
};

/** El lado activo del exchange (atacante) — para comandos ofensivos. */
function activeAttackSide(state: BattleState): BattleSide {
  return state.exchange === 0 ? state.activeSide : (state.activeSide === 'player' ? 'enemy' : 'player');
}

/** M8.C2a-L — el player es el DEFENSOR del exchange actual (misma fuente
 *  derivada que activeAttacker: iniciativa + exchange — jamás la fase). */
function playerIsDefender(state: BattleState): boolean {
  return activeAttackSide(state) === 'enemy';
}

export function canExecute(state: BattleState, command: BattleCommand, opts?: { side?: BattleSide; characterId?: string; limitCardsCount?: number; hasAlly?: boolean }): CommandCheck {
  // 1) Fase
  const phases = PHASE_REQUIREMENTS[command.type];
  if (phases && !phases.includes(state.phase)) return reject('WRONG_PHASE');

  // 2) Lado activo: los comandos ofensivos son del atacante del exchange.
  if (opts?.side) {
    const attacker = activeAttackSide(state);
    const isOffensive =
      command.type === 'PLAY_CARD' || command.type === 'PLAY_LIMIT_CARD' ||
      command.type === 'BASIC_STAGE_ATTACK' || command.type === 'GATHER_POWER' ||
      command.type === 'LIMIT' || command.type === 'JOINT' || command.type === 'BASIC';
    if (isOffensive && opts.side !== attacker) return reject('NOT_ACTIVE_SIDE');
  }

  // 3) Reglas por dominio
  switch (command.type) {
    case 'LIMIT':
      return canOpenLimit(state, opts?.limitCardsCount ?? 0);
    case 'JOINT':
    case 'BASIC':
      return ok();
    case 'CHARACTER_ACTION':
      return opts?.hasAlly ? ok() : reject('ACTION_LOCKED');
    case 'SELECT_CARD':
      return ok();
    case 'PLAY_CARD':
      return canPlayCard(state, opts?.side ?? activeAttackSide(state), command.handIndex, opts?.characterId ?? '');
    case 'PLAY_LIMIT_CARD': {
      // Coste CC REAL de la LIMITED (carta del catálogo) + disponibilidad
      const card = getCard(command.cardId);
      const side = opts?.side ?? activeAttackSide(state);
      const fighter = side === 'player' ? state.player : state.enemy;
      if (!state.limits.includes(command.cardId) || !card) return reject('LIMIT_UNAVAILABLE');
      if (fighter.cc < (card.cc ?? 0)) return reject('INSUFFICIENT_CC');
      return canOpenLimit(state, opts?.limitCardsCount ?? 0);
    }
    case 'BASIC_STAGE_ATTACK':
      return canStageAttack();
    case 'GATHER_POWER':
      return canGatherPower(state);
    case 'DEFENSE_LIMIT':
      return canUseDefenseLimit(state, opts?.limitCardsCount ?? 0);
    case 'DEFENSE_JOINT':
    case 'DEFENSE_BASIC':
      return ok();
    case 'GUARD':
      // M8.C2a-L — la defensa del jugador solo existe cuando él es el
      // defensor del exchange (nunca al atacar: iniciativa + exchange).
      if (!playerIsDefender(state)) return reject('NOT_DEFENDER');
      return canGuard(state);
    case 'PLAY_DEFENSE_CARD':
      if (!playerIsDefender(state)) return reject('NOT_DEFENDER');
      return canPlayDefenseCard(state, opts?.side ?? 'player', command.handIndex, opts?.characterId ?? '');
    case 'MOVE':
      if (!playerIsDefender(state)) return reject('NOT_DEFENDER');
      return canMove(state, opts?.side ?? 'player', command.axis);
    case 'RESET_DEFENSE':
      // M8.C2a — siempre legal: el orquestador abre la ventana defensiva.
      // (No se expone en getAvailableCommands: no es un comando de UI.)
      return ok();
    case 'END_EXCHANGE':
      // M8.C2a-L — siempre legal: primitiva de orquestación del lifecycle
      // (rollover de exchange/turno). No se expone en getAvailableCommands.
      return ok();
    case 'QTE_INPUT': {
      const q = state.stageQte;
      if (q.state !== 'INPUT_WINDOW') return reject('QTE_NOT_ACTIVE');
      // M5: cualquier input es legal — el fallo entra en COUNTER_WINDOW
      // (el GBC no rechaza inputs: el rival contraataca).
      return ok();
    }
    case 'QTE_COUNTER_DEFEND':
    case 'QTE_COUNTER_CONTINUE': {
      return state.stageQte.state === 'COUNTER_WINDOW' ? ok() : reject('QTE_NOT_ACTIVE');
    }
    default:
      return reject('ACTION_LOCKED');
  }
}

/** Comandos disponibles para la UI (derivado de canExecute — una sola regla). */
export function getAvailableCommands(state: BattleState, opts?: Parameters<typeof canExecute>[2]): BattleCommand[] {
  const candidates: BattleCommand[] = [
    { type: 'LIMIT' }, { type: 'JOINT' }, { type: 'BASIC' },
    { type: 'CHARACTER_ACTION' },
    { type: 'BASIC_STAGE_ATTACK' }, { type: 'GATHER_POWER' },
    { type: 'DEFENSE_LIMIT' }, { type: 'DEFENSE_JOINT' }, { type: 'DEFENSE_BASIC' },
    { type: 'GUARD' }, { type: 'MOVE', axis: 'HORIZONTAL' }, { type: 'MOVE', axis: 'VERTICAL' },
    { type: 'QTE_COUNTER_DEFEND' }, { type: 'QTE_COUNTER_CONTINUE' },
  ];
  return candidates.filter(c => canExecute(state, c, opts).ok);
}
