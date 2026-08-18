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
 * Resuelve la pose SEMÁNTICA de un fighter al frame físico del manifest V9.
 * (capa fina — el renderer Pixi real usará FighterActor; esto sirve para
 * DOM/Dev Studio/tests y para la resolución de fallbacks V9.)
 */
export async function resolvePoseSrc(formId: string, pose: string): Promise<string | null> {
  const { spriteDirFor, spriteFrameUrl, spritePoseFrameUrl } = await import('../../data/spriteManifest');
  void spriteDirFor;
  void spriteFrameUrl;
  const url = await spritePoseFrameUrl(formId, pose, 0);
  return url ?? null;
}
