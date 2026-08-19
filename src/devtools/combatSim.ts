// ═══════════════════════════════════════════════════════════
// DEV STUDIO — combatSim: simulador PURO del contrato de combate.
// Navega una ronda real con el Engine (createInitialBattleState +
// executeCommand + advanceBattleClock) y expone el readout del contrato
// (CONTROL · EXECUTION · INITIATIVE · ATTACKER · DEFENDER · PHASE ·
// DEFENSE · ROUND/EXCH · TICK). Consumido por el módulo Combat Contract
// y por verify-dev-studio (headless). 0 React · 0 DOM.
// ═══════════════════════════════════════════════════════════
import { createInitialBattleState } from '../battle/engine/state/createInitialBattleState';
import { executeCommand } from '../battle/engine/commands/executeCommand';
import { advanceBattleClock } from '../battle/engine/clock';
import { getControlBoundary, getActionExecution, activeAttacker, activeDefender, initiativeSide } from '../battle/engine/state/battleStateSelectors';
import type { BattleState } from '../battle/engine/state/BattleState';
import type { BattleCommand } from '../battle/engine/commands/BattleCommand';
import type { BattleEvent } from '../battle/engine/events/BattleEvent';
import type { StageKey } from '../battle/stageInputMap';
import { BattlePosition } from '../data/positions';

export interface ContractReadout {
  round: number;
  exchange: number;
  initiative: 'PLAYER' | 'ENEMY';
  attacker: 'PLAYER' | 'ENEMY';
  defender: 'PLAYER' | 'ENEMY';
  phase: string;
  defense: string;
  control: ReturnType<typeof getControlBoundary>;
  execution: ReturnType<typeof getActionExecution>;
  tick: number;
  stageQte: string;
}

/** Lectura del contrato sobre un estado (fase observada = state.phase). */
export function contractReadout(state: BattleState): ContractReadout {
  const attacker = activeAttacker(state);
  return {
    round: state.turn,
    exchange: state.exchange,
    initiative: initiativeSide(state).toUpperCase() as 'PLAYER' | 'ENEMY',
    attacker: attacker.toUpperCase() as 'PLAYER' | 'ENEMY',
    defender: activeDefender(state).toUpperCase() as 'PLAYER' | 'ENEMY',
    phase: state.phase,
    defense: state.defenseState,
    control: getControlBoundary(state),
    execution: getActionExecution(state),
    tick: state.tick,
    stageQte: state.stageQte.state,
  };
}

/** Estado inicial del simulador (versus Goku vs Piccolo). Arranca YA en la
 *  frontera de decisión correcta según la iniciativa: initiative player →
 *  ATTACK (phase command) · initiative enemy → DEFENSE (AWAITING_CHOICE). */
export function simInitialState(firstAttacker: 'player' | 'enemy' = 'player'): BattleState {
  const s = createInitialBattleState({
    playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 8, playerSpd: 9,
    playerMaxCc: 99, playerCc: 30,
    enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 9, enemyKi: 10, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 0,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: { drawPile: [], hand: [], discardPile: [] },
    enemyDeck: { drawPile: [], hand: [], discardPile: [] },
    playerLimits: [], playerFighterLimits: [],
    firstAttacker,
    seed: 4242,
  });
  return firstAttacker === 'player'
    ? { ...s, phase: 'command' as never }
    : { ...s, phase: 'defend' as never, defenseState: 'AWAITING_CHOICE' as const };
}

/** Limpia el QTE tras una acción terminada (paridad con finishPlayerTurnStage
 *  del orquestador: stageQte WAITING sin secuencia). */
export function simClearQte(state: BattleState): BattleState {
  return { ...state, stageQte: { ...state.stageQte, state: 'WAITING' as const, seq: [], idx: 0, correct: 0 } };
}

export interface SimResult {
  state: BattleState;
  events: BattleEvent[];
  ok: boolean;
  reason?: string;
}

/** Ejecuta un comando sobre el estado y devuelve estado + eventos. */
export function simCommand(state: BattleState, command: BattleCommand, opts?: Parameters<typeof executeCommand>[2]): SimResult {
  const r = executeCommand(state, command, opts);
  return { state: r.state, events: r.events, ok: r.ok, reason: r.ok ? undefined : r.reason };
}

/** Avanza el reloj N ticks (para abrir ventanas QTE, etc.). */
export function simAdvance(state: BattleState, ticks: number): SimResult {
  const c = advanceBattleClock(state, ticks);
  return { state: c.state, events: c.events, ok: true };
}

/** Abre la ventana de inputs del QTE actual (advance hasta inputOpenTick). */
export function simOpenQte(state: BattleState): SimResult {
  const q = state.stageQte;
  if (q.state !== 'PREPARING') return { state, events: [], ok: false, reason: 'QTE_NOT_PREPARING' };
  return simAdvance(state, q.inputOpenTick - state.tick + 1);
}

/** Siguiente tecla esperada del QTE (o null si no hay ventana). */
export function simExpectedKey(state: BattleState): StageKey | null {
  const q = state.stageQte;
  if (q.state !== 'INPUT_WINDOW') return null;
  return q.seq[q.idx] ?? null;
}

/** Tecla EQUIVOCADA (para forzar el counter). */
export function simWrongKey(state: BattleState): StageKey | null {
  const k = simExpectedKey(state);
  return k === 'A' ? 'B' : k === 'B' ? 'A' : k;
}

/** Descripción humana del último evento (para el log del simulador). */
export function eventLabel(e: BattleEvent): string {
  switch (e.type) {
    case 'COMMAND_ACCEPTED': return '✓ comando aceptado';
    case 'ACTION_STARTED': return '▶ acción iniciada';
    case 'STAGE_PREP_STARTED': return '🎬 preparación Stage';
    case 'QTE_STARTED': return '⌨ ventana de inputs abierta';
    case 'QTE_INPUT_RESOLVED': return (e as { success: boolean }).success ? '✓ input correcto' : '✗ input erróneo';
    case 'QTE_COMPLETED': return '🏁 Stage completado';
    case 'QTE_FAILED': return '✗ Stage fallido';
    case 'QTE_COUNTER_STARTED': return '⚔ contraataque';
    case 'QTE_COUNTER_RESOLVED': return '⚔ counter resuelto';
    case 'ATTACK_HIT': return `💥 impacto (${(e as { outcome: string }).outcome})`;
    case 'ATTACK_MISSED': return '💨 esquivado';
    case 'DAMAGE_APPLIED': return `🩸 daño ${(e as { amount: number }).amount}`;
    case 'DEFENSE_COMMITTED': return '🛡 defensa comprometida';
    case 'GUARD_STARTED': return '🛡 guardia activa';
    case 'POSITION_CHANGED': return '👣 posición cambiada';
    case 'PHASE_CHANGED': return `fase → ${(e as { to: string }).to}`;
    case 'ACTION_RESOLVED': return '✅ acción resuelta';
    case 'FIGHTER_DEFEATED': return '☠ K.O.';
    default: return e.type;
  }
}
