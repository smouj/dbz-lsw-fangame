// ═══════════════════════════════════════════════════════════════════════
// M1 — state/index.ts: superficie pública del dominio de estado.
// ═══════════════════════════════════════════════════════════════════════
// Consumidores futuros: BattleEngine (M2+), Dev Studio (Battle Engine view),
// tests de invariantes. Nada aquí depende de React/Pixi/DOM/timers/audio.
// ═══════════════════════════════════════════════════════════════════════

export type {
  BattleState,
  BattlePhase,
  BattleSide,
  BattleFighterState,
  StageStages,
  DefenseChoice,
  GuardType,
  BattleQteState,
  EnemyAiState,
  PowerState,
  BattleDeckState,
} from './BattleState';

export { createInitialBattleState } from './createInitialBattleState';
export type { InitialBattleConfig } from './createInitialBattleState';

export {
  activeAttacker,
  activeDefender,
  effectiveSpd,
  speedOrder,
  positionOf,
  relativeDistance,
  isVulnerable,
  altitudeOf,
  depthOf,
  ccOf,
  hpOf,
  handOf,
  qteOf,
  isPowerWindowActive,
  getPowerState,
  isDefenseCommitted,
  defenseStateOf,
  defenseChoiceOf,
  getControlBoundary,
  getActionExecution,
} from './battleStateSelectors';

export { decrementPowerWindow, postActionMaintenance } from '../commands/reducers/powerReducer';
