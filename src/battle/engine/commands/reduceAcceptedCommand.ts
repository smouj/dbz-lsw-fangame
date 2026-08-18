// ═══════════════════════════════════════════════════════════════════════
// M3/M4 — reduceAcceptedCommand: resuelve un comando YA validado.
// ═══════════════════════════════════════════════════════════════════════
// Asume legalidad (executeCommand llama a canExecute antes). Cada dominio
// resuelve su semántica en su reducer — el dispatcher solo enruta.
// PURA: devuelve un NUEVO estado; jamás muta el input. Sin RNG (M5), sin
// reloj de pared, sin presentación.
//
// M4 — devuelve también los EVENTOS de la resolución, en orden contractual:
//   1) eventos de dominio en orden de mutación (CC → carta → acción)
//   2) ACTION_STARTED cuando una acción comienza
//   3) PHASE_CHANGED AL FINAL, solo si la fase cambió de verdad
// ═══════════════════════════════════════════════════════════════════════

import { getCard } from '../../../data/cards';
import { STAGE_SEQUENCE_POOL } from '../../stageSequences';
import type { BattleCommand } from './BattleCommand';
import type { BattleEvent } from '../events/BattleEvent';
import type { BattleState } from '../state/BattleState';
import { moveFighter } from './reducers/movementReducer';
import { playCard, playDefenseCard, playLimitCard } from './reducers/cardReducer';
import { gatherPower, guard, qteCorrectInput, qteCounterContinue, qteCounterDefend } from './reducers/powerReducer';
import { actionDescriptorForCard, actionDescriptorForStage } from './buildActionDescriptor';

export interface ReductionOutcome {
  state: BattleState;
  events: BattleEvent[];
}

export function reduceAcceptedCommand(state: BattleState, command: BattleCommand): ReductionOutcome {
  let next: BattleState = state;
  let events: BattleEvent[] = [];

  switch (command.type) {
    // ── command-strip: transiciones de fase deterministas ──
    case 'LIMIT':
      next = { ...state, phase: 'limitSelect' };
      break;
    case 'JOINT':
      next = { ...state, phase: 'cardSelect' };
      break;
    case 'BASIC':
      next = { ...state, phase: 'basic' };
      break;
    case 'CHARACTER_ACTION':
      next = state; // la acción CHARA (cambio de aliado) se resuelve en M8
      break;

    // ── mano ──
    case 'SELECT_CARD':
      next = { ...state, selectedCard: command.handIndex };
      events = [{ type: 'CARD_SELECTED', side: 'player', handIndex: command.handIndex }];
      break;
    case 'PLAY_CARD': {
      const card = state.deck.hand[command.handIndex] ?? null;
      const r = playCard(state, 'player', command.handIndex);
      next = { ...r.state, phase: 'stageInput', selectedCard: null };
      events = [
        ...r.events,
        { type: 'ACTION_STARTED', side: 'player', action: actionDescriptorForCard(card) },
      ];
      break;
    }
    case 'PLAY_LIMIT_CARD': {
      const card = getCard(command.cardId) ?? null;
      const r = playLimitCard(state, 'player', command.cardId);
      next = { ...r.state, phase: 'stageInput' };
      events = [
        ...r.events,
        { type: 'ACTION_STARTED', side: 'player', action: actionDescriptorForCard(card) },
      ];
      break;
    }

    // ── BASIC ──
    case 'BASIC_STAGE_ATTACK': {
      // Nivel del stage: 3 base · 4 con GATHER (regla del juego)
      const level: 3 | 4 = state.powerState !== 'NORMAL' ? 4 : 3;
      const seq = STAGE_SEQUENCE_POOL[level][state.tick % STAGE_SEQUENCE_POOL[level].length];
      next = {
        ...state,
        phase: 'stageInput',
        stageQte: {
          state: 'INPUT_WINDOW', seq, idx: 0, correct: 0, card: null,
          elapsedFrames: 0, limitFrames: 173, counterFrames: 0, result: null,
        },
      };
      events = [
        { type: 'ACTION_STARTED', side: 'player', action: actionDescriptorForStage(level) },
        { type: 'QTE_STARTED', side: 'player', level, seq, limitFrames: 173 },
      ];
      break;
    }
    case 'GATHER_POWER': {
      const r = gatherPower(state, 'player');
      next = r.state;
      events = r.events;
      break;
    }

    // ── defensa ──
    case 'DEFENSE_LIMIT':
    case 'DEFENSE_JOINT':
    case 'DEFENSE_BASIC':
      next = state; // navegación de menú (presentación); la fase no cambia
      break;
    case 'GUARD': {
      const r = guard(state, 'player');
      next = r.state;
      events = r.events;
      break;
    }
    case 'PLAY_DEFENSE_CARD': {
      const r = playDefenseCard(state, 'player', command.handIndex);
      next = r.state;
      events = r.events;
      break;
    }
    case 'MOVE': {
      const r = moveFighter(state, 'player', command.axis);
      next = r.state;
      events = r.events;
      break;
    }

    // ── QTE / Stage Attack ──
    case 'QTE_INPUT': {
      // canExecute ya validó que input === seq[idx] → siempre acierto aquí
      const r = qteCorrectInput(state, 'player', command.input);
      next = r.state;
      events = r.events;
      if (r.completed) {
        const level: 3 | 4 = state.stageQte.seq.length === 4 ? 4 : 3;
        events = [
          ...events,
          { type: 'ACTION_RESOLVED', side: 'player', action: actionDescriptorForStage(level) },
        ];
      }
      break;
    }
    case 'QTE_COUNTER_DEFEND': {
      const r = qteCounterDefend(state, 'player');
      next = r.state;
      events = r.events;
      break;
    }
    case 'QTE_COUNTER_CONTINUE': {
      const r = qteCounterContinue(state, 'player');
      next = r.state;
      events = r.events;
      break;
    }
    default:
      next = state;
      break;
  }

  // PHASE_CHANGED al final, SOLO si la fase cambió de verdad
  // (contrato M4: el cambio de fase ocurre DESPUÉS de la resolución).
  if (next.phase !== state.phase) {
    events = [...events, { type: 'PHASE_CHANGED', from: state.phase, to: next.phase }];
  }

  return { state: next, events };
}
