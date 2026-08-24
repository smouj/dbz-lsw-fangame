// ═══════════════════════════════════════════════════════════════════════
// M3/M4 — reducers/powerReducer + defenseReducer + stageAttackReducer.
// ═══════════════════════════════════════════════════════════════════════
// Partes DETERMINISTAS: GATHER (powerWindowCounter=5 — ROM §102), CHARA
// (powerWindowCounter=2 — ROM §127), GUARD (reduce), QTE (acierto:
// +idx/+correct/+1CC · fallo: COUNTER_WINDOW · completado).
// Lo que depende del PRNG (daño del contraataque, resolución) queda
// delimitado para M5 — aquí NO hay Math.random.
//
// M8.POWER: `powerWindowCounter` es la ÚNICA fuente de verdad del estado
// temporal de potencia (fighterState+4). Gather escribe 5, CHARA escribe 2;
// NUNCA max() ni suma. El decremento está centralizado en
// decrementPowerWindow() y marcado ROM_CADENCE_PENDING hasta mapear
// Bank01:$4B66 contra Turn/Exchange (§103).
// ═══════════════════════════════════════════════════════════════════════

import type { StageKey } from '../../../stageInputMap';
import { BattlePosition, POSITION_DATA } from '../../../../data/positions';
import type { BattleEvent } from '../../events/BattleEvent';
import type { BattleSide, BattleState } from '../../state/BattleState';
import { gainCc } from './resourceReducer';
import { COUNTER_WINDOW_TICKS } from '../../clock/clock';

// ─── power window (M8.POWER — SSOT derivado) ─────────────────────────────
/** View type derivado: el estado NO almacena powerState; se deriva del contador. */
export function powerStateFromCounter(counter: number): 'NORMAL' | 'FULL_POWER' {
  return counter > 0 ? 'FULL_POWER' : 'NORMAL';
}

/** true si la power window del lado está activa (cualquier valor > 0). */
export function isPowerWindowActive(state: BattleState, side: BattleSide): boolean {
  return (side === 'player' ? state.player : state.enemy).powerWindowCounter > 0;
}

/**
 * Decremento CENTRALIZADO de la power window de UN fighter (fighterState+4).
 * ROM §132-133: se ejecuta en POST_ACTION_MAINTENANCE — después de cada
 * ActionExecution completada, para AMBOS combatientes, antes del siguiente
 * control de juego (C0A0=$02 → Bank01:$4B21/$4B66).
 */
export function decrementPowerWindow(state: BattleState, side: BattleSide): { state: BattleState; events: BattleEvent[] } {
  const fighter = side === 'player' ? state.player : state.enemy;
  if (fighter.powerWindowCounter <= 0) return { state, events: [] };
  const to = fighter.powerWindowCounter - 1;
  const next = { ...fighter, powerWindowCounter: to };
  return {
    state: side === 'player' ? { ...state, player: next } : { ...state, enemy: next },
    events: [
      { type: 'POWER_CHANGED', from: powerStateFromCounter(fighter.powerWindowCounter), to: powerStateFromCounter(to) },
    ],
  };
}

/**
 * POST_ACTION_MAINTENANCE (ROM §132-133): decrementa la power window de
 * AMBOS fighters tras una ActionExecution completada. Una acción rechazada
 * o los ticks cinematográficos NO pasan por aquí (§138).
 */
export function postActionMaintenance(state: BattleState): { state: BattleState; events: BattleEvent[] } {
  const p = decrementPowerWindow(state, 'player');
  const e = decrementPowerWindow(p.state, 'enemy');
  const events: BattleEvent[] = [...p.events, ...e.events];
  if (events.length === 0) return { state, events: [] };
  const decremented: BattleSide[] = [];
  if (p.events.length > 0) decremented.push('player');
  if (e.events.length > 0) decremented.push('enemy');
  return {
    state: e.state,
    events: [{ type: 'POST_ACTION_MAINTENANCE', decrementedPowerWindows: decremented }, ...events],
  };
}

/** GATHER POWER (ROM §102): powerWindowCounter = 5. */
export function gatherPower(state: BattleState, side: BattleSide): { state: BattleState; events: BattleEvent[] } {
  if (side !== 'player') return { state, events: [] };
  const from = powerStateFromCounter(state.player.powerWindowCounter);
  const to: 'FULL_POWER' = 'FULL_POWER';
  return {
    state: {
      ...state,
      player: { ...state.player, powerWindowCounter: 5 },
    },
    events: [
      { type: 'GATHER_STARTED', side, mode: to },
      { type: 'POWER_CHANGED', from, to },
    ],
  };
}

/** CHARA (ROM §40/§127/§161): powerWindowCounter = 2 + posición horizontal BACK
 *  (vertical preservada). El swap de miembro activo y su cinematografía
 *  siguen siendo M8.CHARA (commit diferido en Bank01:$7320). */
export function characterSwitchPowerWindow(state: BattleState): { state: BattleState; events: BattleEvent[] } {
  const from = powerStateFromCounter(state.player.powerWindowCounter);
  const to: 'FULL_POWER' = 'FULL_POWER';
  const fighter = state.player;
  const alt = POSITION_DATA[fighter.battlePos].altitude;
  const newPos = alt === 'AIR' ? BattlePosition.UP_BACK : BattlePosition.DOWN_BACK;
  const positionChanged = newPos !== fighter.battlePos;
  return {
    state: {
      ...state,
      player: { ...fighter, battlePos: newPos, powerWindowCounter: 2 },
    },
    events: [
      ...(positionChanged
        ? [{ type: 'POSITION_CHANGED' as const, side: 'player' as const, from: fighter.battlePos, to: newPos, axis: 'HORIZONTAL' as const }]
        : []),
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
  const nextQte = {
    ...q,
    state: 'COUNTER_WINDOW' as const,
    counterDeadlineTick: state.tick + COUNTER_WINDOW_TICKS,
  };
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
      stageQte: { ...state.stageQte, state: 'WAITING' as const, counterDeadlineTick: 0 },
    },
    events: [
      { type: 'QTE_COUNTER_RESOLVED', side, action: 'DEFEND' },
      ...(side === 'player' ? [{ type: 'GUARD_STARTED' as const, side, guard: 'reduce' as const }] : []),
    ],
  };
}

/** QTE_COUNTER_CONTINUE: reparar y continuar la secuencia (reabre la ventana). */
export function qteCounterContinue(state: BattleState, side: BattleSide): { state: BattleState; events: BattleEvent[] } {
  const q = state.stageQte;
  return {
    state: {
      ...state,
      stageQte: {
        ...q,
        state: 'INPUT_WINDOW' as const,
        // legacy: "el reloj de la secuencia se reinicia para los inputs
        // restantes" → se reabre la ventana completa desde el tick actual.
        startedTick: state.tick,
        deadlineTick: state.tick + (q.windowTicks || 1),
        counterDeadlineTick: 0,
      },
    },
    events: [{ type: 'QTE_COUNTER_RESOLVED', side, action: 'CONTINUE' }],
  };
}

export type { StageKey };
