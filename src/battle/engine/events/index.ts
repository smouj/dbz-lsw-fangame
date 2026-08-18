// ═══════════════════════════════════════════════════════════════════════
// M4 — events/index.ts: superficie pública de eventos.
// ═══════════════════════════════════════════════════════════════════════
// Consumidores: executeCommand (productor), Presentation Adapter (M7),
// Replay (M9), Engine Studio, tests y golden logs.
// ═══════════════════════════════════════════════════════════════════════

export type {
  BattleEvent,
  BattleActionDescriptor,
  ActionKind,
  ActionVisualKind,
  ActionFidelity,
  DamageCause,
} from './BattleEvent';

export {
  emptyEventLog,
  sequenceEvents,
  appendToEventLog,
  appendOutcomeToEventLog,
  eventTypeSequence,
} from './EventLog';
export type { BattleEventEnvelope, BattleEventLog } from './EventLog';
