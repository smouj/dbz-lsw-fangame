// ═══════════════════════════════════════════════════════════════════════
// M3/M4/M5 — reduceAcceptedCommand: resuelve un comando YA validado.
// ═══════════════════════════════════════════════════════════════════════
// Asume legalidad (executeCommand llama a canExecute antes). Cada dominio
// resuelve su semántica en su reducer — el dispatcher solo enruta.
// PURA: devuelve un NUEVO estado; jamás muta el input. Sin reloj de pared,
// sin presentación. El RNG (M5) avanza SOLO donde hay tirada real y se
// devuelve en el estado (state.rngState) — nunca por efectos laterales.
//
// M4 — devuelve también los EVENTOS de la resolución, en orden contractual:
//   1) eventos de dominio en orden de mutación (CC → carta → acción)
//   2) ACTION_STARTED cuando una acción comienza
//   3) resolución de daño (ATTACK_HIT/MISSED → DAMAGE_APPLIED → FIGHTER_DEFEATED)
//   4) PHASE_CHANGED AL FINAL, solo si la fase cambió de verdad
// ═══════════════════════════════════════════════════════════════════════

import { getCard, type CardDef } from '../../../data/cards';
import { STAGE_SEQUENCE_POOL, type StageLevel } from '../../stageSequences';
import { stageWindowsTicks } from '../../../config/gameplay.config';
import { POSITION_DATA } from '../../../data/positions';
import type { BattleCommand } from './BattleCommand';
import type { BattleEvent } from '../events/BattleEvent';
import type { BattleState } from '../state/BattleState';
import { moveFighter } from './reducers/movementReducer';
import { playCard, playDefenseCard, playLimitCard } from './reducers/cardReducer';
import { gatherPower, guard, qteCorrectInput, qteWrongInput, qteCounterContinue, qteCounterDefend } from './reducers/powerReducer';
import { resolveCardAction, resolveCounterDamage, resolvePartialStageDamage } from './reducers/damageReducer';
import { actionDescriptorForCard, actionDescriptorForStage } from './buildActionDescriptor';
import { stageProgress } from '../combat/resolution';

/** Nivel de Stage de una carta command (3/4/5/6) según su nombre (paridad legacy). */
function stageLevelOfCardName(name: string): StageLevel {
  if (name.includes('6')) return 6;
  if (name.includes('5')) return 5;
  if (name.includes('4')) return 4;
  return 3;
}

/** Ventana del QTE según profundidades (paridad legacy STAGE_SEQUENCE_WINDOW). */
function stageWindowTicksFor(state: BattleState): number {
  const aDepth = POSITION_DATA[state.player.battlePos].depth;
  const bDepth = POSITION_DATA[state.enemy.battlePos].depth;
  const w = stageWindowsTicks();
  const pair = `${aDepth}_${bDepth}` as 'BACK_BACK' | 'BACK_FRONT' | 'FRONT_BACK' | 'FRONT_FRONT';
  return w[pair];
}

/** Crea el QTE de una carta: seq del pool (determinista por tick) + ventana. */
function qteForCard(state: BattleState, card: CardDef): BattleState['stageQte'] {
  const level = stageLevelOfCardName(card.name);
  const pool = STAGE_SEQUENCE_POOL[level];
  const seq = pool[state.tick % pool.length];
  return {
    state: 'INPUT_WINDOW', seq, idx: 0, correct: 0, card,
    elapsedFrames: 0, limitFrames: stageWindowTicksFor(state), counterFrames: 0, result: null,
  };
}

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
      // M5-P1: PLAY_CARD inicializa REALMENTE su QTE (stageQte + ventana +
      // secuencia determinista) — la transición a stageInput ya no queda
      // incompleta.
      const qte = card ? qteForCard(r.state, card) : r.state.stageQte;
      next = { ...r.state, phase: 'stageInput', selectedCard: null, stageQte: qte };
      events = [
        ...r.events,
        { type: 'ACTION_STARTED', side: 'player', action: actionDescriptorForCard(card) },
        ...(card ? [{ type: 'QTE_STARTED' as const, side: 'player' as const, level: stageLevelOfCardName(card.name), seq: qte.seq, limitFrames: qte.limitFrames }] : []),
      ];
      break;
    }
    case 'PLAY_LIMIT_CARD': {
      const card = getCard(command.cardId) ?? null;
      const r = playLimitCard(state, 'player', command.cardId);
      next = { ...r.state, phase: 'stageInput' };
      events = [
        ...r.events,
        ...(card ? [{ type: 'ACTION_STARTED' as const, side: 'player' as const, action: actionDescriptorForCard(card) }] : []),
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
          elapsedFrames: 0, limitFrames: stageWindowTicksFor(state), counterFrames: 0, result: null,
        },
      };
      events = [
        { type: 'ACTION_STARTED', side: 'player', action: actionDescriptorForStage(level) },
        { type: 'QTE_STARTED', side: 'player', level, seq, limitFrames: stageWindowTicksFor(state) },
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
      const q = state.stageQte;
      const expected = q.seq[q.idx];
      if (expected === undefined || command.input === expected) {
        // Acierto (o secuencia vacía): avanza / completa
        const r = qteCorrectInput(state, 'player', command.input);
        next = r.state;
        events = r.events;
        if (r.completed) {
          const level: 3 | 4 = state.stageQte.seq.length === 4 ? 4 : 3;
          // M5: al completar el Stage, la acción de la carta se RESUELVE
          // (command → daño determinista · damage/beam → precisión/evasión
          // con el PRNG canónico · support → efectos deterministas).
          const cardResolved = q.card ?? resolveStageCard(state, q.seq.length);
          const resolution = resolveCardAction(r.state, 'player', cardResolved);
          next = { ...resolution.state, rngState: resolution.rngState };
          events = [
            ...events,
            ...resolution.events,
            { type: 'ACTION_RESOLVED', side: 'player', action: actionDescriptorForStage(level) },
          ];
        }
      } else {
        // M5: input equivocado → COUNTER_WINDOW (el GBC no rechaza: el
        // rival contraataca). Daño del counter en QTE_COUNTER_TIMEOUT.
        const r = qteWrongInput(state, 'player', command.input);
        next = r.state;
        events = r.events;
      }
      break;
    }
    case 'QTE_COUNTER_DEFEND': {
      // A = SAFE_ABORT: conserva CC, daño parcial del Stage según progreso
      const q = state.stageQte;
      const r = qteCounterDefend(state, 'player');
      next = r.state;
      events = r.events;
      const card = q.card ?? resolveStageCard(state, q.seq.length);
      const progress = stageProgress(q.correct, q.seq.length);
      const partial = resolvePartialStageDamage(next, 'player', card, progress);
      next = partial.state;
      events = [...events, ...partial.events];
      break;
    }
    case 'QTE_COUNTER_CONTINUE': {
      // B = RECOVER: repara y continúa el Stage (sin daño, sin tiradas)
      const r = qteCounterContinue(state, 'player');
      next = r.state;
      events = r.events;
      break;
    }
    case 'QTE_COUNTER_TIMEOUT': {
      // El timing del contraataque expira → el counter del rival conecta
      // sobre el jugador (fórmula legacy determinista).
      const q = state.stageQte;
      const card = q.card ?? resolveStageCard(state, q.seq.length);
      const counter = resolveCounterDamage(state, card.type);
      next = {
        ...counter.state,
        stageQte: { ...counter.state.stageQte, state: 'WAITING' as const, counterFrames: 0 },
      };
      events = [...counter.events, { type: 'QTE_COUNTER_RESOLVED', side: 'enemy', action: 'CONTINUE' }];
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

/**
 * Carta del Stage Attack básico (paridad legacy: getCard(stages − 2)).
 * 3 Stage → carta 1 · 4 Stage → carta 2 (command, atk 0).
 */
function resolveStageCard(state: BattleState, seqLen: number): CardDef {
  const stages = seqLen >= 4 ? 4 : 3;
  return getCard(stages - 2) as CardDef;
}
