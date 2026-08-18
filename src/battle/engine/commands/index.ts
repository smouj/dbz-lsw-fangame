// ═══════════════════════════════════════════════════════════════════════
// M2 — commands/index.ts: superficie pública de comandos.
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
