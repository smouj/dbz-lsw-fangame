import { buildProfile, track, type CinematicProfile } from '../timeline';
import type { BattleState } from '../engine/state/BattleState';
import { activeAttacker } from '../engine/state/battleStateSelectors';

export type PresentationTimingProvenance =
  | 'ROM_EXACT'
  | 'ROM_STATIC_VERIFIED'
  | 'VIDEO_VERIFIED'
  | 'INFERRED'
  | 'PRESENTATION_TUNING';

export interface PresentationTiming {
  ticks: number;
  provenance: PresentationTimingProvenance;
}

export const BATTLE_INTRO_PRESENTATION_CONFIG = {
  battlefieldVisible: { ticks: 0, provenance: 'PRESENTATION_TUNING' },
  hudVisible: { ticks: 18, provenance: 'PRESENTATION_TUNING' },
  lifeFillStart: { ticks: 30, provenance: 'PRESENTATION_TUNING' },
  lifeFillEnd: { ticks: 72, provenance: 'PRESENTATION_TUNING' },
  countersVisible: { ticks: 78, provenance: 'PRESENTATION_TUNING' },
  phaseBannerIn: { ticks: 86, provenance: 'PRESENTATION_TUNING' },
  phaseBannerHold: { ticks: 34, provenance: 'PRESENTATION_TUNING' },
  phaseBannerOut: { ticks: 10, provenance: 'PRESENTATION_TUNING' },
} as const satisfies Record<string, PresentationTiming>;

export type PhaseBannerKind = 'ATTACK' | 'DEFENSE';

export interface BattleIntroPresentationSnapshot {
  tick: number;
  inputLocked: boolean;
  hudVisible: boolean;
  countersVisible: boolean;
  lifeFillActive: boolean;
  lifeFillProgress: number;
  introOverlayVisible: boolean;
  phaseBanner: PhaseBannerKind | null;
  completed: boolean;
  cues: string[];
}

export const INITIAL_BATTLE_INTRO_PRESENTATION: BattleIntroPresentationSnapshot = {
  tick: 0,
  inputLocked: true,
  hudVisible: false,
  countersVisible: false,
  lifeFillActive: false,
  lifeFillProgress: 0,
  introOverlayVisible: true,
  phaseBanner: null,
  completed: false,
  cues: ['BATTLE_INTRO_STARTED'],
};

export function phaseBannerForState(state: BattleState): PhaseBannerKind {
  return activeAttacker(state) === 'player' ? 'ATTACK' : 'DEFENSE';
}

export function buildBattleIntroPresentation(state: BattleState): CinematicProfile {
  const cfg = BATTLE_INTRO_PRESENTATION_CONFIG;
  void state;
  return buildProfile('battle_intro_presentation', 'FIELD', [
    track(0, 'MESSAGE', { cue: 'BATTLE_INTRO_STARTED' }),
    track(cfg.hudVisible.ticks, 'MESSAGE', { cue: 'HUD_VISIBLE' }),
    track(cfg.lifeFillStart.ticks, 'MESSAGE', { cue: 'LIFE_FILL_STARTED' }),
    track(cfg.lifeFillEnd.ticks, 'MESSAGE', { cue: 'LIFE_FILL_COMPLETED' }),
    track(cfg.countersVisible.ticks, 'MESSAGE', { cue: 'COUNTERS_VISIBLE' }),
    track(cfg.countersVisible.ticks + 1, 'MESSAGE', { cue: 'BATTLE_INTRO_COMPLETED' }),
  ]);
}

export function reduceBattleIntroPresentation(
  previous: BattleIntroPresentationSnapshot,
  tick: number,
): BattleIntroPresentationSnapshot {
  const cfg = BATTLE_INTRO_PRESENTATION_CONFIG;
  const lifeSpan = Math.max(1, cfg.lifeFillEnd.ticks - cfg.lifeFillStart.ticks);
  const lifeFillProgress = tick < cfg.lifeFillStart.ticks
    ? 0
    : tick >= cfg.lifeFillEnd.ticks
      ? 1
      : Math.max(0, Math.min(1, (tick - cfg.lifeFillStart.ticks) / lifeSpan));
  const next = {
    ...previous,
    tick,
    hudVisible: tick >= cfg.hudVisible.ticks,
    countersVisible: tick >= cfg.countersVisible.ticks,
    lifeFillActive: tick >= cfg.lifeFillStart.ticks && tick < cfg.lifeFillEnd.ticks,
    lifeFillProgress,
    introOverlayVisible: tick < cfg.hudVisible.ticks,
    inputLocked: true,
  };
  return next;
}

export function buildPhaseBannerPresentation(phase: PhaseBannerKind): CinematicProfile {
  const cfg = BATTLE_INTRO_PRESENTATION_CONFIG;
  const clear = cfg.phaseBannerHold.ticks + cfg.phaseBannerOut.ticks;
  return buildProfile(`phase_banner_${phase.toLowerCase()}`, 'FIELD', [
    track(0, 'MESSAGE', { cue: 'PHASE_BANNER', phase }),
    track(clear, 'MESSAGE', { cue: 'PHASE_BANNER_CLEAR', phase }),
    track(clear + 1, 'MESSAGE', { cue: 'PLAYER_CONTROL_AVAILABLE' }),
  ]);
}
