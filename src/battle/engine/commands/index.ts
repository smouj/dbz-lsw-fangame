// ═══════════════════════════════════════════════════════════════════════
// M2/M4 — commands/index.ts: superficie pública de comandos.
// ═══════════════════════════════════════════════════════════════════════

export type { BattleCommand } from './BattleCommand';
export type { CommandCheck, CommandRejectionReason, CommandExecutionResult } from './CommandResult';
export { ok, reject } from './CommandResult';
export { canExecute, getAvailableCommands } from './canExecute';

// reglas por dominio (para tests y selectores avanzados)
export * as resourceRules from './rules/resourceRules';
export * as cardRules from './rules/cardRules';
export * as movementRules from './rules/movementRules';
export * as defenseRules from './rules/defenseRules';

// M3 — executeCommand / reducer puro
export { executeCommand, mustExecute } from './executeCommand';
export { reduceAcceptedCommand } from './reduceAcceptedCommand';
export type { ReductionOutcome } from './reduceAcceptedCommand';

// M4 — descriptores de acción para ACTION_STARTED / ACTION_RESOLVED
export { actionDescriptorForCard, actionDescriptorForStage } from './buildActionDescriptor';

// M4 — eventos (hechos resultantes de la resolución)
export type {
  BattleEvent,
  BattleActionDescriptor,
  ActionKind,
  ActionVisualKind,
  ActionFidelity,
  DamageCause,
} from '../events/BattleEvent';
export {
  emptyEventLog,
  sequenceEvents,
  appendToEventLog,
  eventTypeSequence,
} from '../events/EventLog';
export type { BattleEventEnvelope, BattleEventLog } from '../events/EventLog';
