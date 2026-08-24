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
import { resolveCardAction } from '../engine/commands/reducers/damageReducer';
import { postActionMaintenance } from '../engine/commands/reducers/powerReducer';
import type { BattleCommand, CommandCheck, CommandExecutionResult } from '../engine/commands';
import { advanceBattleClock, type ClockAdvanceOutcome } from '../engine/clock';
import type { BattleSide, BattleState } from '../engine/state/BattleState';
import type { CardDef } from '../../data/cards';
import {
  appendOutcomeToEventLog,
  emptyEventLog,
  type BattleEventLog,
} from '../engine/events';
import type { BattleEvent } from '../engine/events';
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
    const { state, events, ticks } = this.finish(result.ok ? this.postActionMaintenanceIfNeeded(command, result) : result);
    this.state = state;
    this.log = appendOutcomeToEventLog(this.log, events, ticks);
    this.timeline = buildPresentationTimeline({ events: this.log.entries, context: this.context });
    if (this.presenter) this.presenter.consume({ timeline: this.timeline, state: this.state });
    if (this.history) this.history.push(this.timeline);
    return { ...result, state, events, log: this.log, timeline: this.timeline };
  }

  /**
   * POST_ACTION_MAINTENANCE (ROM §132-133): tras una ActionExecution
   * completada, decrementa la power window de AMBOS fighters antes del
   * siguiente control. Una acción rechazada o los ticks cinematográficos
   * NO pasan por aquí (§138). Solo se dispara cuando la resolución
   * contiene un marcador de fin de ejecución:
   *   ACTION_RESOLVED (carta o Stage completado) · GATHER_STARTED (Gather)
   *   QTE_COUNTER_RESOLVED DEFEND/TIMEOUT (Stage fallido/abortado)
   *   CHARACTER_ACTION aceptado (CHARA escribe 2 al final de su ejecución)
   * QTE_COUNTER_CONTINUE (B repair) NO cierra la acción → sin maintenance.
   */
  private actionCompletedBy(command: BattleCommand, result: CommandExecutionResult): boolean {
    if (!result.ok) return false;
    if (command.type === 'CHARACTER_ACTION') return true;
    return result.events.some((e: BattleEvent) => {
      switch (e.type) {
        case 'ACTION_RESOLVED':
        case 'GATHER_STARTED':
          return true;
        case 'QTE_COUNTER_RESOLVED':
          return e.action !== 'CONTINUE';
        default:
          return false;
      }
    });
  }

  private postActionMaintenanceIfNeeded(command: BattleCommand, result: CommandExecutionResult): CommandExecutionResult {
    if (!this.actionCompletedBy(command, result)) return result;
    const m = postActionMaintenance(result.state);
    return { ...result, state: m.state, events: [...result.events, ...m.events] };
  }

  private finish(result: CommandExecutionResult): { state: BattleState; events: BattleEvent[]; ticks: number[] } {
    const ticks = result.events.map(() => result.state.tick);
    return { state: result.state, events: result.events, ticks };
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

  /**
   * Resuelve UNA carta de acción al Engine (M5 resolveCardAction — daño /
   * precisión / evasión / stage). Puente de cutover: mientras la mano y la
   * cinemática sigan legacy, la RESOLUCIÓN (HP/events) pasa por el Engine
   * (única ruta de mutación) y la UI proyecta. Mismo flujo que dispatch:
   * state → log → timeline → presenter.
   */
  resolveCard(side: BattleSide, card: CardDef): DispatchResult {
    const outcome = resolveCardAction(this.state, side, card);
    const result: CommandExecutionResult = {
      ok: true,
      state: outcome.state,
      events: outcome.events,
    };
    // resolveCard es UNA resolución de carta completada (puente cutover):
    // maintenance siempre, sin depender de marcadores de evento.
    const m = postActionMaintenance(result.state);
    const events = [...result.events, ...m.events];
    this.state = m.state;
    const ticks = events.map(() => this.state.tick);
    this.log = appendOutcomeToEventLog(this.log, events, ticks);
    this.timeline = buildPresentationTimeline({ events: this.log.entries, context: this.context });
    if (this.presenter) this.presenter.consume({ timeline: this.timeline, state: this.state });
    if (this.history) this.history.push(this.timeline);
    return { ok: true, state: this.state, events, log: this.log, timeline: this.timeline };
  }

  /** Reconstruye el input de presentación (para inspección headless). */
  presentationInput(): PresentationInput {
    return { events: this.log.entries, context: this.context };
  }
}
