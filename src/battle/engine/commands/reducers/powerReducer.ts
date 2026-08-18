// ═══════════════════════════════════════════════════════════════════════
// M3 — reducers/powerReducer + defenseReducer + stageAttackReducer.
// ═══════════════════════════════════════════════════════════════════════
// Partes DETERMINISTAS: GATHER (NORMAL→FULL, 2 turnos), GUARD (reduce),
// QTE (acierto: +idx/+correct/+1CC · fallo: COUNTER_WINDOW · completado).
// Lo que depende del PRNG (daño del contraataque, resolución) queda
// delimitado para M5 — aquí NO hay Math.random.
// ═══════════════════════════════════════════════════════════════════════

import type { StageKey } from '../../../stageInputMap';
import type { BattleSide, BattleState } from '../../state/BattleState';
import { gainCc } from './resourceReducer';

// ─── powerReducer (GATHER) ───────────────────────────────────────────────
/** GATHER POWER (determinista): NORMAL → FULL_POWER, gatherTurns = 2. */
export function gatherPower(state: BattleState, side: BattleSide): BattleState {
  if (side !== 'player') return state;
  return {
    ...state,
    powerState: 'FULL_POWER',
    gatherTurns: 2,
    gatherStartedRound: state.turn,
  };
}

// ─── defenseReducer (GUARD) ──────────────────────────────────────────────
/** GUARD (bloqueo básico): guardia reduce activa — daño −50% (M5 aplica). */
export function guard(state: BattleState, side: BattleSide): BattleState {
  if (side !== 'player') return state;
  return { ...state, playerGuard: 'reduce' };
}

// ─── stageAttackReducer (QTE — transiciones deterministas) ───────────────
export interface QteStepOutcome {
  state: BattleState;
  /** true si la secuencia se completó (FULL_SUCCESS). */
  completed: boolean;
  /** true si el input falló → ventana de contraataque. */
  failed: boolean;
}

/** QTE_INPUT correcto: +1 correct · +1 CC · avanza idx (o COMPLETED). */
export function qteCorrectInput(state: BattleState, side: BattleSide): QteStepOutcome {
  const q = state.stageQte;
  const nextIdx = q.idx + 1;
  const withCc = gainCc(state, side, 1);
  const completed = nextIdx >= q.seq.length;
  const nextQte = completed
    ? { ...q, idx: nextIdx, correct: q.correct + 1, state: 'COMPLETED' as const, result: 'FULL_SUCCESS' as const }
    : { ...q, idx: nextIdx, correct: q.correct + 1 };
  return { state: { ...withCc, stageQte: nextQte }, completed, failed: false };
}

/** QTE_INPUT fallido: → COUNTER_WINDOW (el contraataque del rival). */
export function qteWrongInput(state: BattleState): QteStepOutcome {
  const q = state.stageQte;
  const nextQte = { ...q, state: 'COUNTER_WINDOW' as const, counterFrames: 0 };
  return { state: { ...state, stageQte: nextQte }, completed: false, failed: true };
}

/** QTE_COUNTER_DEFEND: defensa contra el contraataque → guardia activa. */
export function qteCounterDefend(state: BattleState, side: BattleSide): BattleState {
  return {
    ...state,
    playerGuard: side === 'player' ? 'reduce' : state.playerGuard,
    stageQte: { ...state.stageQte, state: 'WAITING' as const, counterFrames: 0 },
  };
}

/** QTE_COUNTER_CONTINUE: reparar y continuar la secuencia (idx sin retroceder). */
export function qteCounterContinue(state: BattleState): BattleState {
  return {
    ...state,
    stageQte: { ...state.stageQte, state: 'INPUT_WINDOW' as const, counterFrames: 0 },
  };
}

export type { StageKey };
