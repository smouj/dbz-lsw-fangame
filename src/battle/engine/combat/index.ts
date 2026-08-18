// ═══════════════════════════════════════════════════════════════════════
// M5 — combat/index.ts: superficie pública de resolución de combate.
// ═══════════════════════════════════════════════════════════════════════

export {
  effectiveAttackAccuracy,
  effectiveDefenseAccuracy,
  accuracyHits,
  enemyResponseFromRoll,
  moveAxisFromRoll,
  hitBlockAvoidFromRoll,
  powerFor,
  spdFor,
  positionMultiplier,
  attackDamage,
  stageAttackDamage,
  stagePartialDamage,
  counterDamage,
  stageProgress,
  clampHp,
} from './resolution';
