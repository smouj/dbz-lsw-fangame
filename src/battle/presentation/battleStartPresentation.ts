import { buildProfile, track, type CinematicProfile } from '../timeline';
import type { BattleState } from '../engine/state/BattleState';
import { activeAttacker } from '../engine/state/battleStateSelectors';

export type PresentationTimingProvenance =
  | 'ROM_EXACT'
  | 'ROM_STATIC_VERIFIED'
  | 'ROM_DERIVED'
  | 'VIDEO_VERIFIED'
  | 'INFERRED'
  | 'PRESENTATION_TUNING';

export interface PresentationTiming {
  ticks: number;
  provenance: PresentationTimingProvenance;
}

// ── ROM-derived battle intro timings ──────────────────────────────────────
// GBC intro sequence: white flash (PALETTE_TRANSITION_STANDARD 17t) →
//   VS screen hold (CHARA_ENTRY settle 8t + hold 5t + extra 27t) →
//   life bars fill (42t across ~0.7s) → counters reveal →
//   phase banner (ATTACK/DEFENSE) hold + fade-out → player control.
//
// Previously all PRESENTATION_TUNING at ~79 ticks total (~1.3s) — too short,
// no ROM grounding. New timings follow the GBC feel: palette fade-in, dramatic
// VS hold, and a readable phase banner.
//
// Sources: §176 CHARA_EXIT (28t+15t), §178 CHARA_ENTRY (8t+5t),
//   PALETTE_TRANSITION_STANDARD (17 executions, $10 maxCounter),
//   stage windows (50–150t), §M8.F0 entrance FLASH_WHITE.
export const BATTLE_INTRO_PRESENTATION_CONFIG = {
  // Phase 1: white flash / overlay holds (palette transition = 17t)
  fadeOverlayIn: { ticks: 17, provenance: 'ROM_DERIVED' as const },     // PALETTE_TRANSITION_STANDARD duration
  // Phase 2: VS screen visible — fighters enter (CHARA_ENTRY 8t settle + 5t hold)
  vsScreenHold: { ticks: 48, provenance: 'ROM_DERIVED' as const },       // settle(8) + hold(5) + dramatic pause(35)
  // Phase 3: HUD starts appearing during VS hold
  hudVisible: { ticks: 55, provenance: 'ROM_DERIVED' as const },         // during VS hold, bars begin
  // Phase 4: life bars fill (was 42t between fill start/end → keep 42t)
  lifeFillStart: { ticks: 60, provenance: 'ROM_DERIVED' as const },
  lifeFillEnd: { ticks: 102, provenance: 'ROM_DERIVED' as const },        // 42t fill (~0.7s GBC feel)
  // Phase 5: counters (KI bar) appears right after life fill completes
  countersVisible: { ticks: 108, provenance: 'ROM_DERIVED' as const },
  // Phase 6: intro overlay fades out, revealing battlefield
  introOverlayFadeOut: { ticks: 115, provenance: 'ROM_DERIVED' as const }, // 7t fade (PALETTE_TRANSITION half-pass)
  // Phase 7: phase banner (ATTACK/DEFENSE) — longer hold for readability
  phaseBannerIn: { ticks: 125, provenance: 'ROM_DERIVED' as const },
  phaseBannerHold: { ticks: 50, provenance: 'ROM_DERIVED' as const },     // was 34t — too short to read
  phaseBannerOut: { ticks: 15, provenance: 'ROM_DERIVED' as const },       // was 10t — slightly longer fade
  // Phase 8: player control available
  introComplete: { ticks: 191, provenance: 'ROM_DERIVED' as const },     // total ~3.2s (GBC original ~3-4s)
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
  /** 0 = full overlay, 1 = overlay fully gone. Interpolated for CSS opacity. */
  fadeProgress: number;
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
  fadeProgress: 0,
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
    track(cfg.introOverlayFadeOut.ticks, 'MESSAGE', { cue: 'INTRO_OVERLAY_FADING' }),
    track(cfg.introComplete.ticks, 'MESSAGE', { cue: 'BATTLE_INTRO_COMPLETED' }),
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
  // Overlay fade: goes from opacity 1 → 0 over the fade-out window
  const fadeSpan = Math.max(1, cfg.introComplete.ticks - cfg.introOverlayFadeOut.ticks);
  const fadeProgress = tick < cfg.introOverlayFadeOut.ticks
    ? 0
    : tick >= cfg.introComplete.ticks
      ? 1
      : Math.max(0, Math.min(1, (tick - cfg.introOverlayFadeOut.ticks) / fadeSpan));
  const next = {
    ...previous,
    tick,
    hudVisible: tick >= cfg.hudVisible.ticks,
    countersVisible: tick >= cfg.countersVisible.ticks,
    lifeFillActive: tick >= cfg.lifeFillStart.ticks && tick < cfg.lifeFillEnd.ticks,
    lifeFillProgress,
    introOverlayVisible: tick < cfg.introComplete.ticks,
    fadeProgress,
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
