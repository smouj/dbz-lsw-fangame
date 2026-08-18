// ═══════════════════════════════════════════════════════════════════════
// M3/M4 — reducers/powerReducer + defenseReducer + stageAttackReducer.
// ═══════════════════════════════════════════════════════════════════════
// Partes DETERMINISTAS: GATHER (NORMAL→FULL, 2 turnos), GUARD (reduce),
// QTE (acierto: +idx/+correct/+1CC · fallo: COUNTER_WINDOW · completado).
// Lo que depende del PRNG (daño del contraataque, resolución) queda
// delimitado para M5 — aquí NO hay Math.random.
//
// M4: cada mutación real emite su evento en el sitio exacto donde ocurre.
// ═══════════════════════════════════════════════════════════════════════

import type { StageKey } from '../../../stageInputMap';
import type { BattleEvent } from '../../events/BattleEvent';
import type { BattleSide, BattleState } from '../../state/BattleState';
import { gainCc } from './resourceReducer';

// ─── powerReducer (GATHER) ───────────────────────────────────────────────
/** GATHER POWER (determinista): NORMAL → FULL_POWER, gatherTurns = 2. */
export function gatherPower(state: BattleState, side: BattleSide): { state: BattleState; events: BattleEvent[] } {
  if (side !== 'player') return { state, events: [] };
  const from = state.powerState;
  const to: BattleState['powerState'] = 'FULL_POWER';
  return {
    state: {
      ...state,
      powerState: to,
      gatherTurns: 2,
      gatherStartedRound: state.turn,
    },
    events: [
      { type: 'GATHER_STARTED', side, mode: to },
      { type: 'POWER_CHANGED', from, to },
    ],
  };
}

// ─── defenseReducer (GUARD) ──────────────────────────────────────────────
/** GUARD (bloqueo básico): guardia reduce activa — daño −50% (M5 aplica). */
export function guard(state: BattleState, side: BattleSide): { state: BattleState; events: BattleEvent[] } {
  if (side !== 'player') return { state, events: [] };
  return {
    state: { ...state, playerGuard: 'reduce' },
    events: [{ type: 'GUARD_STARTED', side, guard: 'reduce' }],
  };
}

// ─── stageAttackReducer (QTE — transiciones deterministas) ───────────────
export interface QteStepOutcome {
  state: BattleState;
  events: BattleEvent[];
  /** true si la secuencia se completó (FULL_SUCCESS). */
  completed: boolean;
  /** true si el input falló → ventana de contraataque. */
  failed: boolean;
}

/** QTE_INPUT correcto: +1 correct · +1 CC · avanza idx (o COMPLETED). */
export function qteCorrectInput(state: BattleState, side: BattleSide, input: StageKey): QteStepOutcome {
  const q = state.stageQte;
  const indexBefore = q.idx;
  const nextIdx = q.idx + 1;
  const withCc = gainCc(state, side, 1);
  const completed = nextIdx >= q.seq.length;
  const nextQte = completed
    ? { ...q, idx: nextIdx, correct: q.correct + 1, state: 'COMPLETED' as const, result: 'FULL_SUCCESS' as const }
    : { ...q, idx: nextIdx, correct: q.correct + 1 };
  const events: BattleEvent[] = [
    ...withCc.events,
    { type: 'QTE_INPUT_RESOLVED', side, input, success: true, indexBefore, indexAfter: nextIdx },
    ...(completed ? [{ type: 'QTE_COMPLETED' as const, side, correct: q.correct + 1, total: q.seq.length, result: 'FULL_SUCCESS' as const }] : []),
  ];
  return { state: { ...withCc.state, stageQte: nextQte }, events, completed, failed: false };
}

/** QTE_INPUT fallido: → COUNTER_WINDOW (el contraataque del rival). */
export function qteWrongInput(state: BattleState, side: BattleSide, input: StageKey): QteStepOutcome {
  const q = state.stageQte;
  const nextQte = { ...q, state: 'COUNTER_WINDOW' as const, counterFrames: 0 };
  return {
    state: { ...state, stageQte: nextQte },
    events: [
      { type: 'QTE_INPUT_RESOLVED', side, input, success: false, indexBefore: q.idx, indexAfter: q.idx },
      { type: 'QTE_FAILED', side, input },
      { type: 'QTE_COUNTER_STARTED', side },
    ],
    completed: false,
    failed: true,
  };
}

/** QTE_COUNTER_DEFEND: defensa contra el contraataque → guardia activa. */
export function qteCounterDefend(state: BattleState, side: BattleSide): { state: BattleState; events: BattleEvent[] } {
  return {
    state: {
      ...state,
      playerGuard: side === 'player' ? 'reduce' : state.playerGuard,
      stageQte: { ...state.stageQte, state: 'WAITING' as const, counterFrames: 0 },
    },
    events: [
      { type: 'QTE_COUNTER_RESOLVED', side, action: 'DEFEND' },
      ...(side === 'player' ? [{ type: 'GUARD_STARTED' as const, side, guard: 'reduce' as const }] : []),
    ],
  };
}

/** QTE_COUNTER_CONTINUE: reparar y continuar la secuencia (idx sin retroceder). */
export function qteCounterContinue(state: BattleState, side: BattleSide): { state: BattleState; events: BattleEvent[] } {
  return {
    state: {
      ...state,
      stageQte: { ...state.stageQte, state: 'INPUT_WINDOW' as const, counterFrames: 0 },
    },
    events: [{ type: 'QTE_COUNTER_RESOLVED', side, action: 'CONTINUE' }],
  };
}

export type { StageKey };
