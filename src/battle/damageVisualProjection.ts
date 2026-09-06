import type { PresentationCue } from './engine/presentation/PresentationCue';
import type { BattleSide } from './engine/state/BattleState';
import type { StandardDamageRuntimeBranch, StandardDamageRuntimeCutover } from './standardDamageRomCutover';

/**
 * Presentation-only HP shadow for one resolved STANDARD_DAMAGE action.
 * BattleRuntime already owns `afterHp`; this model only controls when the HUD
 * is allowed to reveal it. It cannot write BattleState or calculate damage.
 */
export interface DamageVisualProjection {
  actionId: string;
  targetSide: BattleSide;
  beforeHp: number;
  afterHp: number;
  outcome: StandardDamageRuntimeBranch;
  revealed: boolean;
}

export function createDamageVisualProjection(
  cutover: StandardDamageRuntimeCutover,
  targetSide: BattleSide,
  beforeHp: number,
  afterHp: number,
): DamageVisualProjection | null {
  if (!cutover.outcome.family) return null;
  return {
    actionId: cutover.actionId,
    targetSide,
    beforeHp,
    afterHp,
    outcome: cutover.outcome.family,
    revealed: false,
  };
}

export function revealDamageVisualProjection(projection: DamageVisualProjection): DamageVisualProjection {
  return projection.revealed ? projection : { ...projection, revealed: true };
}

export function projectedHp(
  side: BattleSide,
  authoritativeHp: number,
  projection: DamageVisualProjection | null,
): number {
  if (!projection || projection.targetSide !== side || projection.revealed) return authoritativeHp;
  return projection.beforeHp;
}

/** STANDARD_DAMAGE uses its selected ROM result branch as the impact boundary. */
export function isStandardDamageImpactBoundary(cue: PresentationCue): boolean {
  return cue.type === 'ROM_RESULT_BRANCH';
}
