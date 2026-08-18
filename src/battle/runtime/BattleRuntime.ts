// ═══════════════════════════════════════════════════════════════════════
// M8 — BattleRuntime: el ORQUESTADOR ÚNICO del combate real.
// ═══════════════════════════════════════════════════════════════════════
// Frontera única (contrato M8):
//
//   UI / IA → dispatch(BattleCommand) ─┐
//   Clock   → advance(ticks) ──────────┼→ Engine (M1-M6) → EventLog → M7 Timeline
//                                      └→ Presenter.consume(timeline)
//
// El Runtime posee UNA snapshot autoritativa (state). React/Pixi/HUD leen
// SIEMPRE de selectores sobre state — nunca duplican HP/CC/fase/posición.
// El Presenter ejecuta cues; jamás decide reglas (0 doble daño, 0 fases
// duplicadas, 0 timers legacy).
// ═══════════════════════════════════════════════════════════════════════

import { executeCommand, canExecute, getAvailableCommands } from '../engine/commands';
import type { BattleCommand, CommandCheck, CommandExecutionResult } from '../engine/commands';
import { advanceBattleClock, type ClockAdvanceOutcome } from '../engine/clock';
import type { BattleState } from '../engine/state/BattleState';
import {
  appendOutcomeToEventLog,
  emptyEventLog,
  type BattleEventLog,
} from '../engine/events';
import {
  buildPresentationTimeline,
  type BattlePresentationContext,
  type BattleTimeline,
  type PresentationInput,
} from '../engine/presentation';
import { SCENARIOS, SPECIAL_ACTION_BACKGROUND } from '../../data/scenarios';

/** Consumidor de timelines (Pixi / DOM / audio / replay — ver BattlePresenter). */
export interface BattlePresenter {
  /** El Runtime entrega un timeline NUEVO por cada dispatch/advance con eventos. */
  consume(input: { timeline: BattleTimeline; state: BattleState }): void;
}

export interface BattleRuntimeOptions {
  /** Estado inicial (M1 createInitialBattleState). */
  state: BattleState;
  /** Contexto visual del escenario (fondos OVERVIEW/ACTION/SPECIAL). */
  context?: BattlePresentationContext;
  /** Presenter opcional (se puede conectar/desconectar en caliente). */
  presenter?: BattlePresenter | null;
  /** Si true, acumula TODOS los timelines (para Replay/auditoría). */
  keepHistory?: boolean;
}

export type DispatchResult = CommandExecutionResult & {
  log: BattleEventLog;
  timeline: BattleTimeline;
};

export interface AdvanceResult {
  outcome: ClockAdvanceOutcome;
  log: BattleEventLog;
  timeline: BattleTimeline;
}

export function defaultBattleContext(): BattlePresentationContext {
  return {
    playerFormId: 'goku_base',
    enemyFormId: 'piccolo_base',
    overviewBackground: SCENARIOS[0]?.overviewBackground ?? '',
    actionBackground: SCENARIOS[0]?.actionBackground ?? '',
    specialActionBackground: SPECIAL_ACTION_BACKGROUND,
  };
}

/**
 * BattleRuntime — UNA frontera: input → Engine → EventLog → Timeline → Presenter.
 * No es un motor de reglas: delega en executeCommand/advanceBattleClock (M1-M6)
 * y en buildPresentationTimeline (M7). El estado SOLO cambia aquí.
 */
export class BattleRuntime {
  state: BattleState;
  log: BattleEventLog;
  timeline: BattleTimeline;
  presenter: BattlePresenter | null;
  private readonly context: BattlePresentationContext;
  private readonly history: BattleTimeline[];

  constructor(opts: BattleRuntimeOptions) {
    this.state = opts.state;
    this.log = emptyEventLog();
    this.timeline = { startTick: 0, endTick: 0, entries: [] };
    this.presenter = opts.presenter ?? null;
    this.context = opts.context ?? defaultBattleContext();
    this.history = [];
  }

  /** Legalidad (la UI consulta para deshabilitar — el Engine vuelve a validar). */
  can(command: BattleCommand, opts?: Parameters<typeof executeCommand>[2]): CommandCheck {
    return canExecute(this.state, command, opts);
  }

  /** Comandos disponibles (derivado de canExecute — una sola regla). */
  available(opts?: Parameters<typeof executeCommand>[2]): BattleCommand[] {
    return getAvailableCommands(this.state, opts);
  }

  /** Intención externa (UI o IA): resuelve, loguea, construye timeline, presenta. */
  dispatch(command: BattleCommand, opts?: Parameters<typeof executeCommand>[2]): DispatchResult {
    const result = executeCommand(this.state, command, opts);
    this.state = result.state;
    const ticks = result.events.map(() => result.state.tick);
    this.log = appendOutcomeToEventLog(this.log, result.events, ticks);
    this.timeline = buildPresentationTimeline({ events: this.log.entries, context: this.context });
    if (this.presenter) this.presenter.consume({ timeline: this.timeline, state: this.state });
    if (this.history) this.history.push(this.timeline);
    return { ...result, log: this.log, timeline: this.timeline };
  }

  /** Evolución temporal automática (ClockAdapter → ticks enteros). */
  advance(ticks: number): AdvanceResult {
    const outcome = advanceBattleClock(this.state, ticks);
    this.state = outcome.state;
    this.log = appendOutcomeToEventLog(this.log, outcome.events, outcome.eventTicks);
    this.timeline = buildPresentationTimeline({ events: this.log.entries, context: this.context });
    if (this.presenter) this.presenter.consume({ timeline: this.timeline, state: this.state });
    if (this.history) this.history.push(this.timeline);
    return { outcome, log: this.log, timeline: this.timeline };
  }

  /** Acceso a la historia de timelines (Replay M9 / auditoría). */
  timelineHistory(): BattleTimeline[] {
    return this.history;
  }

  /** Reconstruye el input de presentación (para inspección headless). */
  presentationInput(): PresentationInput {
    return { events: this.log.entries, context: this.context };
  }
}
