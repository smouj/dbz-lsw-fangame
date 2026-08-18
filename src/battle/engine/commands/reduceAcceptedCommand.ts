// ═══════════════════════════════════════════════════════════════════════
// M3 — reduceAcceptedCommand: resuelve un comando YA validado.
// ═══════════════════════════════════════════════════════════════════════
// Asume legalidad (executeCommand llama a canExecute antes). Cada dominio
// resuelve su semántica en su reducer — el dispatcher solo enruta.
// PURA: devuelve un NUEVO estado; jamás muta el input. Sin RNG (M5), sin
// reloj de pared, sin presentación.
// ═══════════════════════════════════════════════════════════════════════

import { STAGE_SEQUENCE_POOL } from '../../stageSequences';
import type { BattleCommand } from './BattleCommand';
import type { BattleState } from '../state/BattleState';
import { moveFighter } from './reducers/movementReducer';
import { playCard, playDefenseCard, playLimitCard } from './reducers/cardReducer';
import { gatherPower, guard, qteCorrectInput, qteCounterContinue, qteCounterDefend } from './reducers/powerReducer';

/** Coste CC de una LIMITED (el juego usa el CC de la carta del catálogo). */
function limitCost(cardId: number): number {
  return 0; // la LIMITED del roster se cobra al jugarla en el juego real; el
  // coste exacto se integra en M5 (depende de la carta del catálogo).
}

export function reduceAcceptedCommand(state: BattleState, command: BattleCommand): BattleState {
  switch (command.type) {
    // ── command-strip: transiciones de fase deterministas ──
    case 'LIMIT':
      return { ...state, phase: 'limitSelect' };
    case 'JOINT':
      return { ...state, phase: 'cardSelect' };
    case 'BASIC':
      return { ...state, phase: 'basic' };
    case 'CHARACTER_ACTION':
      return state; // la acción CHARA (cambio de aliado) se resuelve en M8

    // ── mano ──
    case 'SELECT_CARD':
      return { ...state, selectedCard: command.handIndex };
    case 'PLAY_CARD': {
      const { state: next } = playCard(state, 'player', command.handIndex);
      return { ...next, phase: 'stageInput', selectedCard: null };
    }
    case 'PLAY_LIMIT_CARD': {
      const { state: next } = playLimitCard(state, 'player', command.cardId);
      void limitCost;
      return { ...next, phase: 'stageInput' };
    }

    // ── BASIC ──
    case 'BASIC_STAGE_ATTACK': {
      // Nivel del stage: 3 base · 4 con GATHER (regla del juego)
      const level: 3 | 4 = state.powerState !== 'NORMAL' ? 4 : 3;
      const seq = STAGE_SEQUENCE_POOL[level][state.tick % STAGE_SEQUENCE_POOL[level].length];
      return {
        ...state,
        phase: 'stageInput',
        stageQte: {
          state: 'INPUT_WINDOW', seq, idx: 0, correct: 0, card: null,
          elapsedFrames: 0, limitFrames: 173, counterFrames: 0, result: null,
        },
      };
    }
    case 'GATHER_POWER':
      return gatherPower(state, 'player');

    // ── defensa ──
    case 'DEFENSE_LIMIT':
    case 'DEFENSE_JOINT':
    case 'DEFENSE_BASIC':
      return state; // navegación de menú (presentación); la fase no cambia
    case 'GUARD':
      return guard(state, 'player');
    case 'PLAY_DEFENSE_CARD': {
      const { state: next } = playDefenseCard(state, 'player', command.handIndex);
      return next;
    }
    case 'MOVE':
      return moveFighter(state, 'player', command.axis);

    // ── QTE / Stage Attack ──
    case 'QTE_INPUT': {
      // canExecute ya validó que input === seq[idx] → siempre acierto aquí
      const { state: next } = qteCorrectInput(state, 'player');
      return next;
    }
    case 'QTE_COUNTER_DEFEND':
      return qteCounterDefend(state, 'player');
    case 'QTE_COUNTER_CONTINUE':
      return qteCounterContinue(state);
    default:
      return state;
  }
}
