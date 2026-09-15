// ═══════════════════════════════════════════════════════════
// DBZ LSW — Renderer PixiJS (barrel)
// ═══════════════════════════════════════════════════════════

export { BattleRenderer } from './BattleRenderer';
export { BattleCanvas } from './BattleCanvas';
export type { BattleCanvasHandle } from './BattleCanvas';
export { FighterActor } from './actors/FighterActor';
export { currentFrame } from './systems/SpriteAnimator';
export type { SpriteAnimState } from './systems/SpriteAnimator';
export { loadFormAtlas, loadPixelTexture } from './assets/AtlasLoader';
export type { FormAtlas, FormManifest, PoseAnim, PoseFrame } from './assets/AtlasLoader';

// Presentación (contrato + adaptador)
export type { BattlePresentation, BattleScene } from './presentation/BattlePresentation';
export { PixiBattlePresentation } from './presentation/PixiBattlePresentation';
export type { PixiPresentationConfig } from './presentation/PixiBattlePresentation';
export { applyCinematicEvent } from './presentation/CinematicAdapter';

// Escenas + director + sistemas
export { SceneDirector } from './director/SceneDirector';
export { TacticalScene } from './scenes/TacticalScene';
export { ActionScene, ACTION_ACTOR_X, ACTION_TARGET_X } from './scenes/ActionScene';
export { ImpactSystem } from './systems/ImpactSystem';
export type { ImpactSnapshot } from './systems/ImpactSystem';
export { rushX, lerp, easeOutCubic, easeInOutCubic, easeOutQuad, ACTION_GROUND_Y } from './systems/MotionSystem';
export type { RushMotion, Easing } from './systems/MotionSystem';

// Config
export {
  BATTLE_LOGICAL_W,
  BATTLE_LOGICAL_H,
  BATTLE_OUTPUT_H,
  BATTLE_OUTPUT_Y,
  BG_NATIVE_W,
  BG_NATIVE_H,
  BG_SCALE,
  ACTION_NATIVE_W,
  ACTION_NATIVE_H,
  ACTION_WORLD_SCALE,
} from './config';
