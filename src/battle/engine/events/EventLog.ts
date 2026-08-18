// ═══════════════════════════════════════════════════════════════════════
// M4 — EventLog: el stream de eventos nace SECUENCIADO.
// ═══════════════════════════════════════════════════════════════════════
// Cada ejecución produce un log con `sequence` monótono (0,1,2,3...) como
// orden canónico estable. El `tick` real se añadirá cuando M6 sea autoridad
// del reloj — NO se inventan timestamps falsos (contrato M4 §11).
//
// El log es un VALOR: se puede serializar, comparar, reproducir y auditar.
// No es un emitter — el Engine devuelve datos, nunca efectos laterales.
// ═══════════════════════════════════════════════════════════════════════

import type { BattleEvent } from './BattleEvent';

export interface BattleEventEnvelope {
  sequence: number;
  event: BattleEvent;
}

export interface BattleEventLog {
  entries: BattleEventEnvelope[];
}

export function emptyEventLog(): BattleEventLog {
  return { entries: [] };
}

/** Numera una tanda de eventos desde `startAt` (default 0). */
export function sequenceEvents(events: BattleEvent[], startAt = 0): BattleEventEnvelope[] {
  return events.map((event, i) => ({ sequence: startAt + i, event }));
}

/** Añade una tanda al final del log continuando la secuencia. */
export function appendToEventLog(log: BattleEventLog, events: BattleEvent[]): BattleEventLog {
  return {
    entries: [...log.entries, ...sequenceEvents(events, log.entries.length)],
  };
}

/** Secuencia de tipos (helper de tests/golden: solo los `type`). */
export function eventTypeSequence(events: BattleEvent[]): string[] {
  return events.map(e => e.type);
}
