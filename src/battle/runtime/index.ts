// ═══════════════════════════════════════════════════════════════════════
// M8 — runtime/index.ts: superficie pública del Runtime de combate.
// ═══════════════════════════════════════════════════════════════════════

export { BattleRuntime, defaultBattleContext } from './BattleRuntime';
export type { BattleRuntimeOptions, DispatchResult, AdvanceResult, BattlePresenter } from './BattleRuntime';
export { createCuePresenter, resolvePoseSrc } from './BattlePresenter';
export type { CueHandlers, FighterPoseView } from './BattlePresenter';
export { useBattleRuntime } from './useBattleRuntime';
export type { UseBattleRuntimeOptions, BattleRuntimeApi } from './useBattleRuntime';
