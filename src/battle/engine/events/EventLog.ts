// ═══════════════════════════════════════════════════════════════════════
// M4/M6 — EventLog: el stream de eventos nace SECUENCIADO y CON TICK.
// ═══════════════════════════════════════════════════════════════════════
// Cada ejecución produce un log con:
//   sequence — orden canónico causal (0,1,2,3...) · NUNCA se reordena.
//   tick     — tick GBC (M6) en el que ocurrió el hecho. Varios eventos
//              pueden compartir tick; el sequence conserva el orden causal
//              dentro del mismo tick.
// El log es un VALOR: serializable, comparable, reproducible y auditable.
// No es un emitter — el Engine devuelve datos, nunca efectos laterales.
// ═══════════════════════════════════════════════════════════════════════

import type { BattleEvent } from './BattleEvent';
import type { BattleState } from '../state/BattleState';

export interface BattleEventEnvelope {
  sequence: number;
  tick: number;
  event: BattleEvent;
}

export interface BattleEventLog {
  entries: BattleEventEnvelope[];
}

export function emptyEventLog(): BattleEventLog {
  return { entries: [] };
}

/**
 * Numera una tanda de eventos desde `startAt`, todos en el tick dado.
 * (para resultados de executeCommand: el tick del estado contra el que
 * se ejecutó el comando — el hecho ocurre EN ese tick).
 */
export function sequenceEvents(events: BattleEvent[], startAt = 0, tick = 0): BattleEventEnvelope[] {
  return events.map((event, i) => ({ sequence: startAt + i, tick, event }));
}

/** Añade una tanda al final del log continuando la secuencia (mismo tick). */
export function appendToEventLog(log: BattleEventLog, events: BattleEvent[], tick = 0): BattleEventLog {
  return {
    entries: [...log.entries, ...sequenceEvents(events, log.entries.length, tick)],
  };
}

/**
 * Añade el resultado de un paso del Engine (executeCommand o
 * advanceBattleClock) usando los eventTicks reales de cada hecho.
 * executeCommand: eventTicks = [state.tick × n] (todos en el mismo tick).
 */
export function appendOutcomeToEventLog(
  log: BattleEventLog,
  events: BattleEvent[],
  eventTicks: number[],
): BattleEventLog {
  const ticks = eventTicks.length === events.length ? eventTicks : events.map(() => 0);
  return {
    entries: [
      ...log.entries,
      ...events.map((event, i) => ({ sequence: log.entries.length + i, tick: ticks[i], event })),
    ],
  };
}

/** Secuencia de tipos (helper de tests/golden: solo los `type`). */
export function eventTypeSequence(events: BattleEvent[]): string[] {
  return events.map(e => e.type);
}
