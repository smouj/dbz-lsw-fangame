// ═══════════════════════════════════════════════════════════════════════
// M7 — presentation/index.ts: superficie pública del Adapter de presentación.
// ═══════════════════════════════════════════════════════════════════════

export type {
  PresentationCue,
  SceneCue,
  FighterPoseCue,
  FighterVisibilityCue,
  FighterPositionCue,
  AuraCue,
  EffectCue,
  ProjectileCue,
  CameraCue,
  ImpactCue,
  HudCue,
  AudioCue,
  BattleSceneMode,
  FighterRole,
  TimelineEntry,
  BattleTimeline,
} from './PresentationCue';

export { buildPresentationTimeline, resolveFacing } from './buildTimeline';
export type { BattlePresentationContext, PresentationInput } from './buildTimeline';
