// ═══════════════════════════════════════════════════════════════════════
// M7 — PresentationCue: unión discriminada de cues PURAMENTE visuales.
// ═══════════════════════════════════════════════════════════════════════
// Regla M7: el Adapter DESCRIBE — nunca ejecuta gameplay, nunca anima
// Pixi, nunca toca DOM/React/audio. Cada cue es un HECHO VISUAL con tick
// GBC absoluto y duración en ticks (nada de delayMs).
//
//   Engine (BattleEvent) → Adapter → BattleTimeline → M8 Presenter (Pixi)
//
// Las poses son SEMÁNTICAS ('beam_charge', 'attack_fwd'...): el manifest
// de la forma (V9) resuelve los frames físicos, con sus fallbacks. Nunca
// paths PNG dentro del timeline.
// ═══════════════════════════════════════════════════════════════════════

import type { BattlePosition } from '../../../data/positions';
import type { ProjectileVisualKind } from '../../actionProfiles';
import type { BattleSide } from '../state/BattleState';
import type { CanonPose } from '../../animationCanon';

/** Las tres vistas canónicas del contrato visual + la especial. */
export type BattleSceneMode = 'OVERVIEW' | 'PLAYER_ACTION' | 'ENEMY_ACTION' | 'SPECIAL_ACTION';

/** Rol relativo en la cinematografía (actor/target) — resuelto por el Presenter. */
export type FighterRole = 'ACTOR' | 'TARGET';

export interface SceneCue {
  type: 'SCENE';
  tick: number;
  /** Duración en ticks GBC del plano (hasta el siguiente SCENE). */
  durationTicks: number;
  mode: BattleSceneMode;
  /** Fondo canónico (del contexto del escenario — nunca un path de carta). */
  background: string;
}

export interface FighterPoseCue {
  type: 'FIGHTER_POSE';
  tick: number;
  durationTicks: number;
  role: FighterRole;
  side: BattleSide;
  /** Pose SEMÁNTICA (canon) — el manifest resuelve los frames físicos. */
  pose: CanonPose | string;
}

export interface FighterVisibilityCue {
  type: 'FIGHTER_VISIBILITY';
  tick: number;
  role: FighterRole;
  side: BattleSide;
  visible: boolean;
}

export interface FighterPositionCue {
  type: 'FIGHTER_POSITION';
  tick: number;
  role: FighterRole;
  side: BattleSide;
  position: BattlePosition;
}

/** Aura como CAPA superpuesta (nunca sustituye la pose del personaje). */
export interface AuraCue {
  type: 'AURA';
  tick: number;
  durationTicks: number;
  role: FighterRole;
  side: BattleSide;
  variant: 'power' | 'support';
  visible: boolean;
}

export interface EffectCue {
  type: 'EFFECT';
  tick: number;
  durationTicks: number;
  effect: string;
}

export interface ProjectileCue {
  type: 'PROJECTILE';
  tick: number;
  kind: ProjectileVisualKind;
  action: 'spawn' | 'travel' | 'impact' | 'explode';
  from: BattleSide;
  to: BattleSide;
}

export interface CameraCue {
  type: 'CAMERA';
  tick: number;
  action: 'CUT' | 'TRACK' | 'IMPACT' | 'RESET';
}

/** Resultado del ataque — SIEMPRE derivado del evento (nunca de mirar HP). */
export interface ImpactCue {
  type: 'IMPACT';
  tick: number;
  side: BattleSide;
  outcome: 'hit' | 'block' | 'guard' | 'miss';
}

export interface HudCue {
  type: 'HUD';
  tick: number;
  kind: 'cc' | 'qte' | 'damage_number' | 'phase' | 'message';
  side?: BattleSide;
  value?: number | string;
}

export interface AudioCue {
  type: 'AUDIO';
  tick: number;
  cue: string;
}

export type PresentationCue =
  | SceneCue
  | FighterPoseCue
  | FighterVisibilityCue
  | FighterPositionCue
  | AuraCue
  | EffectCue
  | ProjectileCue
  | CameraCue
  | ImpactCue
  | HudCue
  | AudioCue;

/** Metadata de trazabilidad de cada cue (Replay / Dev Studio / FRAME_VERIFIED). */
export interface TimelineEntry {
  cue: PresentationCue;
  /** Tick del BattleEvent que originó la familia (se preserva SIEMPRE). */
  logicalTick: number;
  /** Tipo del evento origen. */
  sourceEvent: string;
  /** Perfil firma (si la familia salió de una carta con perfil). */
  profileId: string | null;
  /** Fidelidad del perfil (FRAME_VERIFIED/VERIFIED/INFERRED...) o 'NONE'. */
  fidelity: string;
}

export interface BattleTimeline {
  startTick: number;
  endTick: number;
  /** Ordenado por tick de presentación (estable: mismo input → mismo orden). */
  entries: TimelineEntry[];
}
