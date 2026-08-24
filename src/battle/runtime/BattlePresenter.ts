// ═══════════════════════════════════════════════════════════════════════
// M8 — BattlePresenter: consumidor de cues (Pixi / DOM / audio / replay).
// ═══════════════════════════════════════════════════════════════════════
// El Presenter EJECUTA cues; jamás decide reglas. Cada cue llega con tick
// GBC absoluto y poses SEMÁNTICAS — el manifest V9 resuelve los frames.
//
// Este módulo expone:
//   · BattlePresenter (interfaz del Runtime)
//   · CueEventStream: descompone el timeline en un flujo imperativo por
//     tipo de cue (útil para adaptadores Pixi/DOM y para tests headless).
//   · DomFighterPresenter: presentador DOM mínimo (Dev Studio / pruebas en
//     navegador) que pinta poses reales del manifest según los cues.
// ═══════════════════════════════════════════════════════════════════════

import type { BattleTimeline, PresentationCue } from '../engine/presentation';
import type { BattleSide, BattleState } from '../engine/state/BattleState';
import type { BattlePresenter } from './BattleRuntime';

export type { BattlePresenter };

/** Callbacks por tipo de cue (adaptador imperativo, sin conocer el timeline). */
export interface CueHandlers {
  onScene?: (cue: Extract<PresentationCue, { type: 'SCENE' }>, state: BattleState) => void;
  onPose?: (cue: Extract<PresentationCue, { type: 'FIGHTER_POSE' }>, state: BattleState) => void;
  onVisibility?: (cue: Extract<PresentationCue, { type: 'FIGHTER_VISIBILITY' }>, state: BattleState) => void;
  onPosition?: (cue: Extract<PresentationCue, { type: 'FIGHTER_POSITION' }>, state: BattleState) => void;
  onAura?: (cue: Extract<PresentationCue, { type: 'AURA' }>, state: BattleState) => void;
  onProjectile?: (cue: Extract<PresentationCue, { type: 'PROJECTILE' }>, state: BattleState) => void;
  onCamera?: (cue: Extract<PresentationCue, { type: 'CAMERA' }>, state: BattleState) => void;
  onImpact?: (cue: Extract<PresentationCue, { type: 'IMPACT' }>, state: BattleState) => void;
  onHud?: (cue: Extract<PresentationCue, { type: 'HUD' }>, state: BattleState) => void;
  onAudio?: (cue: Extract<PresentationCue, { type: 'AUDIO' }>, state: BattleState) => void;
  /** ROM-level relative motion. Consumers must preserve cue.segments. */
  onRomMotion?: (cue: Extract<PresentationCue, { type: 'FIGHTER_MOTION' }>, state: BattleState) => void;
  /** Generic ROM cue hook for Dev Studio/replay adapters. */
  onRomCue?: (cue: PresentationCue, state: BattleState) => void;
}

/** Presenter genérico que reenvía cada cue al handler correspondiente. */
export function createCuePresenter(handlers: CueHandlers): BattlePresenter {
  return {
    consume({ timeline, state }) {
      for (const entry of timeline.entries) {
        const cue = entry.cue;
        switch (cue.type) {
          case 'SCENE': handlers.onScene?.(cue, state); break;
          case 'FIGHTER_POSE': handlers.onPose?.(cue, state); break;
          case 'FIGHTER_VISIBILITY': handlers.onVisibility?.(cue, state); break;
          case 'FIGHTER_POSITION': handlers.onPosition?.(cue, state); break;
          case 'AURA': handlers.onAura?.(cue, state); break;
          case 'PROJECTILE': handlers.onProjectile?.(cue, state); break;
          case 'CAMERA': handlers.onCamera?.(cue, state); break;
          case 'IMPACT': handlers.onImpact?.(cue, state); break;
          case 'HUD': handlers.onHud?.(cue, state); break;
          case 'AUDIO': handlers.onAudio?.(cue, state); break;
          case 'FIGHTER_MOTION': handlers.onRomMotion?.(cue, state); handlers.onRomCue?.(cue, state); break;
          case 'MACRO':
          case 'SCENE_LOAD':
          case 'PALETTE_TRANSITION':
          case 'SUPPORT_FX':
          case 'DEFENSE_FX':
          case 'SUPPORT_VISUAL_LOAD':
          case 'BG_ASSEMBLY':
          case 'SUPPORT_MACRO':
          case 'DISPLAY_COMPOSE':
          case 'DISPLAY_CLEAR':
          case 'PALETTE_LOAD':
          case 'ANIMATION_START':
          case 'ANIMATION_STATE':
          case 'WAIT_ANIMATION':
          case 'WAIT_ANIMATION_FRAME':
          case 'ACTION_OBJECT_POSITION':
          case 'ACTION_OBJECT_MOTION':
          case 'APPLY_FRAME_DELTA':
          case 'FX_LOAD':
          case 'FX_AUX':
          case 'SCENE_CONFIGURE':
          case 'SCREEN_MOTION':
          case 'SCREEN_RESTORE':
          case 'SCREEN_PATH':
          case 'ROM_SFX':
          case 'ROM_AUDIO_SCRIPT':
          case 'ROM_MACRO':
          case 'ROM_WAIT':
          case 'ROM_RESULT_BRANCH':
          case 'ROM_PENDING':
          case 'ACTION_OBJECT_BIND':
          case 'ACTION_OBJECT_UNBIND':
          case 'ACTION_OBJECT_DRAW_ORDER':
          case 'ACTION_OBJECT_FRAME':
          case 'ACTION_OBJECT_FRAME_OFFSET':
          case 'ACTION_OBJECT_STOP':
          case 'MULTI_ACTOR_SYNC':
            handlers.onRomCue?.(cue, state);
            break;
        }
      }
    },
  };
}

export interface FighterPoseView {
  formId: string;
  pose: string;
  side: BattleSide;
  src: string | null;
}

/**
 * Resuelve la pose SEMÁNTICA de un fighter al frame físico del manifest OUT_frames.
 * (capa fina — el renderer Pixi real usará FighterActor; esto sirve para
 * DOM/Dev Studio/tests y para la resolución de fallbacks de poses.)
 */
export async function resolvePoseSrc(formId: string, pose: string): Promise<string | null> {
  const { spriteDirFor, spriteFrameUrl, spritePoseFrameUrl } = await import('../../data/spriteManifest');
  void spriteDirFor;
  void spriteFrameUrl;
  const url = await spritePoseFrameUrl(formId, pose, 0);
  return url ?? null;
}
