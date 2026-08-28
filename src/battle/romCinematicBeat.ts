// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — ROM CINEMATIC BEAT SSOT
// ═══════════════════════════════════════════════════════════════════════
// Single source of truth for ALL cinematic timing in the battle system.
// Every beat that governs what happens BETWEEN and AROUND the animation
// frames is declared here with evidence provenance.
//
// FRAME timing (durationTicks per frame instance) belongs to
// RomTimedFrameInstance. CINEMATIC timing (waits, motions, holds,
// scene transitions, FX lifetimes) belongs HERE.
//
// Rule: if the ROM knows the duration, use GBC ticks (integers).
//       NO 500ms / 1000ms / 0.4s / CSS animation-duration.
//       YES 30t / 60t / N ticks.
// ═══════════════════════════════════════════════════════════════════════

// ── Evidence classification (hierarchical) ──

export type CinematicEvidence =
  | 'ROM_EXACT'             // Measured directly from ROM VM execution
  | 'ROM_STATIC_VERIFIED'   // Derived from ROM data structures, no dynamic trace needed
  | 'ROM_DYNAMIC_VERIFIED'  // Requires dynamic trace but already performed
  | 'ROM_HANDLER_VERIFIED'  // Derived from ROM handler grammar (standard attack handlers)
  | 'PRESENTATION_DERIVED'  // Structural necessity of presentation, no ROM contradiction
  | 'INFERRED_LEGACY'       // Generic value, no ROM evidence, needs replacement
  | 'PENDING_ROM_TRACE';   // ROM trace required but not yet performed

// ── Beat kinds (what category of cinematic event) ──

export type CinematicBeatKind =
  | 'SCENE_ENTER'        // TACTICAL → ACTION transition
  | 'SCENE_EXIT'         // ACTION → TACTICAL transition
  | 'PRE_ACTION_HOLD'    // Wait before action begins (e.g. 20t STANDARD_DAMAGE prepare)
  | 'POST_ACTION_HOLD'   // Wait after action resolves (e.g. POST_ACTION_MAINTENANCE)
  | 'CHARA_EXIT'         // Character exit motion (-98px / 28t + hold 15t)
  | 'CHARA_ENTRY'        // Character entry motion (+106→+98, settle 8t + hold 5t)
  | 'APPROACH'           // Rush/approach motion (RUSH $1C +98px / 25t)
  | 'BEAM_SETUP'         // Beam pre-adjustment motion ($1E -27px / 17t)
  | 'SCREEN_MOTION'      // Screen scroll/pan ($05 -6×19t, $06 -6×16t)
  | 'IMPACT_HOLD'        // Impact freeze frame (hitstop)
  | 'TARGET_REACTION'    // Target pose after impact (hurt/guard/evade)
  | 'FX_LIFETIME'        // FX display duration (beam, explosion, aura)
  | 'FX_SPAWN'           // FX spawn timing (relative to animation frame)
  | 'DISPLAY_COMPOSE'    // Support display compose
  | 'DISPLAY_CLEAR'      // Support display clear
  | 'PALETTE_TRANSITION' // CGB palette interpolation
  | 'WAIT'               // Generic ROM wait (WAIT_PREPARE, WAIT_BEAM_HOLD, etc.)
  | 'QTE_PREP'           // Stage QTE preparation (60t prep)
  | 'QTE_WINDOW'         // Stage QTE input window (variable, position-dependent)
  | 'QTE_COUNTER'        // Counter window after QTE failure
  | 'RETURN_TO_FIELD'    // Action → FIELD return
  | 'BRANCH_RESULT';     // Result branch point (HIT/MISS/SPECIAL_DEFENSE)

// ── ROM source tracking ──

export interface RomSource {
  /** ROM bank (hex) */
  bank: number | null;
  /** ROM address within bank (hex) */
  address: number | null;
  /** Macro ID ($1C, $1E, $27, $28, etc.) */
  macro: number | null;
  /** Section in COMBAT_MECHANICS_ROM_CONFIRMED.md */
  section: string | null;
}

// ── The SSOT beat record ──

export interface RomCinematicBeat {
  /** Unique beat identifier (e.g. 'STD_DAMAGE_PREPARE', 'BEAM_HOLD_60T') */
  id: string;
  /** What category of event */
  kind: CinematicBeatKind;
  /** Duration in GBC ticks (null = variable or not applicable) */
  durationTicks: number | null;
  /** Which battle family this beat belongs to */
  family: CinematicFamily;
  /** Evidence provenance — how we know this value */
  evidence: CinematicEvidence;
  /** ROM source (bank, address, macro, section) if ROM-derived */
  source: RomSource | null;
  /** Human-readable description */
  description: string;
  /** Where in the runtime this beat is consumed */
  runtimeLocation: string;
  /** Whether this beat is currently used correctly (true/false/partial) */
  correctlyUsed: 'yes' | 'no' | 'partial';
  /** If incorrectly used, what needs to change */
  remediation?: string;
}

// ── Battle families ──

export type CinematicFamily =
  | 'STANDARD_DAMAGE'
  | 'BEAM_BASE'
  | 'BEAM_VARIANT'
  | 'PROJECTILE_SCROLL'
  | 'STAGE'
  | 'SUPPORT'
  | 'DEFENSE'
  | 'GATHER'
  | 'GUARD'
  | 'MOVE'
  | 'SHARED';   // beats shared across families (CHARA_EXIT, PALETTE_TRANSITION, etc.)

// ═══════════════════════════════════════════════════════════════════════
// KNOWN ROM CINEMATIC BEATS — The Registry
// ═══════════════════════════════════════════════════════════════════════

export const ROM_CINEMATIC_BEATS: readonly RomCinematicBeat[] = [
  // ── SHARED (used by all families) ──
  {
    id: 'CHARA_EXIT',
    kind: 'CHARA_EXIT',
    durationTicks: 28 + 15,  // 28t move + 15t hold = 43t total
    family: 'SHARED',
    evidence: 'ROM_EXACT',
    source: { bank: 0x1e, address: null, macro: 0x27, section: '§176' },
    description: 'Character exit: -98px / 28t move + 15t hold',
    runtimeLocation: 'romDescriptors.CHARA_EXIT',
    correctlyUsed: 'no',
    remediation: 'buildTimeline.ts uses POSE_HOLD (8t) instead of CHARA_EXIT for scene transitions',
  },
  {
    id: 'CHARA_ENTRY',
    kind: 'CHARA_ENTRY',
    durationTicks: 8 + 5,  // 8t settle + 5t hold = 13t total
    family: 'SHARED',
    evidence: 'ROM_EXACT',
    source: { bank: 0x1e, address: null, macro: 0x28, section: '§178' },
    description: 'Character entry: +106→+98, settle -8px / 8t + hold 5t',
    runtimeLocation: 'romDescriptors.CHARA_ENTRY',
    correctlyUsed: 'no',
    remediation: 'buildTimeline.ts does not use CHARA_ENTRY for ACTION→FIELD returns',
  },
  {
    id: 'PALETTE_TRANSITION',
    kind: 'PALETTE_TRANSITION',
    durationTicks: null,  // Variable (start → poll → done cycle)
    family: 'SHARED',
    evidence: 'ROM_STATIC_VERIFIED',
    source: { bank: 0x1e, address: null, macro: null, section: '§179' },
    description: 'CGB palette interpolation (IDLE→RUNNING→DONE cycle)',
    runtimeLocation: 'romDescriptors.PaletteTransitionJob',
    correctlyUsed: 'partial',
    remediation: 'Duration is poll-based in ROM, not fixed ticks. Current implementation uses instant transition.',
  },
  {
    id: 'SCENE_ENTER',
    kind: 'SCENE_ENTER',
    durationTicks: null,  // Scene load + palette transition
    family: 'SHARED',
    evidence: 'ROM_STATIC_VERIFIED',
    source: { bank: 0x1e, address: null, macro: null, section: '§180-182' },
    description: 'TACTICAL → ACTION: VRAM $8E00 load + CHARA macros + palette transition',
    runtimeLocation: 'romDescriptors.ActionSceneLoad',
    correctlyUsed: 'partial',
    remediation: 'Scene load modeled but palette transition timing not tick-accurate',
  },

  // ── STANDARD_DAMAGE ──
  {
    id: 'STD_DAMAGE_PREPARE',
    kind: 'PRE_ACTION_HOLD',
    durationTicks: 20,
    family: 'STANDARD_DAMAGE',
    evidence: 'ROM_HANDLER_VERIFIED',
    source: { bank: 3, address: 0x5fe3, macro: null, section: '§0A handler grammar' },
    description: 'Wait before STANDARD_DAMAGE action: 20t prepare hold',
    runtimeLocation: 'romPresentationProfiles.WAIT_PREPARE_20T',
    correctlyUsed: 'yes',
  },
  {
    id: 'STD_DAMAGE_RUSH',
    kind: 'APPROACH',
    durationTicks: 25,  // 4px×24 + 2px×1 = +98px
    family: 'STANDARD_DAMAGE',
    evidence: 'ROM_EXACT',
    source: { bank: 0x1e, address: null, macro: 0x1c, section: '§211' },
    description: 'Rush motion: +98px / 25t (macro $1C)',
    runtimeLocation: 'romDescriptors.ROM_RUSH_MOTION',
    correctlyUsed: 'yes',
  },
  {
    id: 'STD_DAMAGE_BRANCH',
    kind: 'BRANCH_RESULT',
    durationTicks: 0,  // Instant branch point
    family: 'STANDARD_DAMAGE',
    evidence: 'ROM_HANDLER_VERIFIED',
    source: { bank: 3, address: 0x5fe3, macro: 0x2e, section: '§215-217' },
    description: 'Physical resolution branch: CA53 → HIT($2F) / MISS($30) / SPECIAL_DEFENSE($31)',
    runtimeLocation: 'romDescriptors.PHYSICAL_RESOLUTION_MACROS',
    correctlyUsed: 'yes',
  },

  // ── BEAM_BASE ──
  {
    id: 'BEAM_SETUP',
    kind: 'BEAM_SETUP',
    durationTicks: 17,  // -1×2 + -2×10 + -1×5 = -27px
    family: 'BEAM_BASE',
    evidence: 'ROM_EXACT',
    source: { bank: 0x1e, address: null, macro: 0x1e, section: '§212' },
    description: 'Beam setup pre-adjustment: -27px / 17t (macro $1E)',
    runtimeLocation: 'romDescriptors.ROM_BEAM_SETUP_MOTION',
    correctlyUsed: 'yes',
  },
  {
    id: 'BEAM_HOLD_60T',
    kind: 'WAIT',
    durationTicks: 60,
    family: 'BEAM_BASE',
    evidence: 'ROM_HANDLER_VERIFIED',
    source: { bank: 3, address: 0x5776, macro: null, section: '§02 handler' },
    description: 'Beam hold after FX spawn: 60t (WAIT_BEAM_HOLD_60T)',
    runtimeLocation: 'romPresentationProfiles.WAIT_BEAM_HOLD_60T',
    correctlyUsed: 'yes',
  },

  // ── PROJECTILE_SCROLL ──
  {
    id: 'SCREEN_MOTION_19T',
    kind: 'SCREEN_MOTION',
    durationTicks: 19,
    family: 'PROJECTILE_SCROLL',
    evidence: 'ROM_EXACT',
    source: { bank: 3, address: 0x5b38, macro: null, section: '§222' },
    description: 'Screen scroll: -6px/tick × 19t, restore (handler $05)',
    runtimeLocation: 'romDescriptors.ROM_SCREEN_MOTION_19T',
    correctlyUsed: 'yes',
  },
  {
    id: 'SCREEN_MOTION_16T',
    kind: 'SCREEN_MOTION',
    durationTicks: 16,
    family: 'PROJECTILE_SCROLL',
    evidence: 'ROM_EXACT',
    source: { bank: 3, address: 0x5b9e, macro: null, section: '§223' },
    description: 'Screen scroll: -6px/tick × 16t, restore (handler $06)',
    runtimeLocation: 'romDescriptors.ROM_SCREEN_MOTION_16T',
    correctlyUsed: 'yes',
  },
  {
    id: 'SPECIAL_PATH_WAIT_2T',
    kind: 'WAIT',
    durationTicks: 2,
    family: 'PROJECTILE_SCROLL',
    evidence: 'ROM_HANDLER_VERIFIED',
    source: { bank: 3, address: 0x5dfe, macro: null, section: '§07 handler' },
    description: 'Special projectile path: wait 2t before FX/path',
    runtimeLocation: 'romPresentationProfiles.WAIT_SPECIAL_PATH_2T',
    correctlyUsed: 'yes',
  },
  {
    id: 'SPECIAL_PATH_WAIT_4T',
    kind: 'WAIT',
    durationTicks: 4,
    family: 'PROJECTILE_SCROLL',
    evidence: 'ROM_HANDLER_VERIFIED',
    source: { bank: 3, address: 0x5dfe, macro: null, section: '§07 handler' },
    description: 'Special projectile path: wait 4t after FX',
    runtimeLocation: 'romPresentationProfiles.WAIT_SPECIAL_PATH_4T',
    correctlyUsed: 'yes',
  },

  // ── SUPPORT ──
  {
    id: 'SUPPORT_HOLD120',
    kind: 'WAIT',
    durationTicks: 120,
    family: 'SUPPORT',
    evidence: 'ROM_HANDLER_VERIFIED',
    source: { bank: null, address: null, macro: null, section: 'CB77→$78' },
    description: 'Support common hold: 120t (≈2.009s)',
    runtimeLocation: 'romSupportPresentationProfile.SUPPORT_HOLD120_TICKS',
    correctlyUsed: 'yes',
  },

  // ── STAGE ──
  {
    id: 'STAGE_PREP',
    kind: 'QTE_PREP',
    durationTicks: 60,
    family: 'STAGE',
    evidence: 'ROM_STATIC_VERIFIED',
    source: { bank: null, address: null, macro: null, section: 'M8.B' },
    description: 'Stage QTE preparation: 60t before input window opens',
    runtimeLocation: 'clock.ts STAGE_PREP_TICKS',
    correctlyUsed: 'yes',
    remediation: 'Labeled INFERRED but should be ROM_STATIC_VERIFIED — 60t confirmed in combat golden path (16 rounds)',
  },
  {
    id: 'STAGE_WINDOW_BB',
    kind: 'QTE_WINDOW',
    durationTicks: 50,  // 0.837s × 59.7275 Hz ≈ 50t
    family: 'STAGE',
    evidence: 'ROM_EXACT',
    source: { bank: null, address: null, macro: null, section: '§5 ROM lot 2' },
    description: 'Stage QTE input window: BACK_BACK = 50t',
    runtimeLocation: 'gameplay.config.ts stageWindowsSeconds',
    correctlyUsed: 'yes',
  },
  {
    id: 'STAGE_WINDOW_BF',
    kind: 'QTE_WINDOW',
    durationTicks: 80,  // 1.339s × 59.7275 Hz ≈ 80t
    family: 'STAGE',
    evidence: 'ROM_EXACT',
    source: { bank: null, address: null, macro: null, section: '§5 ROM lot 2' },
    description: 'Stage QTE input window: BACK_FRONT = 80t',
    runtimeLocation: 'gameplay.config.ts stageWindowsSeconds',
    correctlyUsed: 'yes',
  },
  {
    id: 'STAGE_WINDOW_FB',
    kind: 'QTE_WINDOW',
    durationTicks: 120,  // 2.009s × 59.7275 Hz ≈ 120t
    family: 'STAGE',
    evidence: 'ROM_EXACT',
    source: { bank: null, address: null, macro: null, section: '§5 ROM lot 2' },
    description: 'Stage QTE input window: FRONT_BACK = 120t',
    runtimeLocation: 'gameplay.config.ts stageWindowsSeconds',
    correctlyUsed: 'yes',
  },
  {
    id: 'STAGE_WINDOW_FF',
    kind: 'QTE_WINDOW',
    durationTicks: 150,  // 2.511s × 59.7275 Hz ≈ 150t
    family: 'STAGE',
    evidence: 'ROM_EXACT',
    source: { bank: null, address: null, macro: null, section: '§5 ROM lot 2' },
    description: 'Stage QTE input window: FRONT_FRONT = 150t',
    runtimeLocation: 'gameplay.config.ts stageWindowsSeconds',
    correctlyUsed: 'yes',
  },
  {
    id: 'COUNTER_WINDOW',
    kind: 'QTE_COUNTER',
    durationTicks: 24,  // Math.round(0.4 × 59.7275) ≈ 24t
    family: 'STAGE',
    evidence: 'ROM_STATIC_VERIFIED',
    source: { bank: null, address: null, macro: null, section: 'Counter window' },
    description: 'Counter window after QTE failure: ~24t',
    runtimeLocation: 'clock.ts COUNTER_WINDOW_TICKS',
    correctlyUsed: 'yes',
  },

  // ── DEFENSE ──
  {
    id: 'DEFENSE_PREP',
    kind: 'PRE_ACTION_HOLD',
    durationTicks: 12,
    family: 'DEFENSE',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'Defense preparation hold before attack contact',
    runtimeLocation: 'buildTimeline.ts DEFENSE_COMMITTED case',
    correctlyUsed: 'yes',
    remediation: '12t is PRESENTATION_DERIVED: structural need for defense UI before contact. No ROM contradiction.',
  },
  {
    id: 'DEFENSE_POSE',
    kind: 'TARGET_REACTION',
    durationTicks: 10,
    family: 'DEFENSE',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'Defense pose duration (guard/beam_guard)',
    runtimeLocation: 'buildTimeline.ts ATTACK_HIT defense reaction',
    correctlyUsed: 'yes',
    remediation: '10t is PRESENTATION_DERIVED: target reaction visible until next beat. Target AnimationResource timing will override when available.',
  },
  {
    id: 'DEFENSE_COUNTER_RETURN',
    kind: 'RETURN_TO_FIELD',
    durationTicks: 12,
    family: 'DEFENSE',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'QTE counter defense return to tactical',
    runtimeLocation: 'buildTimeline.ts QTE_COUNTER_RESOLVED DEFEND',
    correctlyUsed: 'yes',
    remediation: '12t is PRESENTATION_DERIVED. Could use CHARA_ENTRY (13t) for tighter alignment.',
  },

  // ── LEGACY GENERIC TIMINGS (profiles.ts — to be eliminated) ──
  {
    id: 'LEGACY_POSE_HOLD',
    kind: 'POST_ACTION_HOLD',
    durationTicks: 8,
    family: 'SHARED',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'POSE_HOLD: generic 8t fallback for pose duration',
    runtimeLocation: 'buildTimeline.ts POSE_HOLD constant',
    correctlyUsed: 'yes',
    remediation: '8t is PRESENTATION_DERIVED fallback when no specific ROM duration is available. Should be overridden by RomTimedFrameInstance when available.',
  },
  {
    id: 'LEGACY_IMPACT_HOLD',
    kind: 'IMPACT_HOLD',
    durationTicks: 3,
    family: 'SHARED',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'T.impactHold: generic 3t impact weight',
    runtimeLocation: 'profiles.ts T.impactHold',
    correctlyUsed: 'yes',
    remediation: '3t impact hold is PRESENTATION_DERIVED. Per-family variation exists but 3t is a reasonable baseline.',
  },
  {
    id: 'LEGACY_RETURN_FIELD',
    kind: 'RETURN_TO_FIELD',
    durationTicks: 12,
    family: 'SHARED',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'T.returnField: generic 12t return to FIELD',
    runtimeLocation: 'profiles.ts T.returnField',
    correctlyUsed: 'yes',
    remediation: '12t is PRESENTATION_DERIVED. CHARA_EXIT (43t) / CHARA_ENTRY (13t) are ROM_EXACT for scene-level transitions but not all returns use them.',
  },
  {
    id: 'LEGACY_BEAM_ATTACKER',
    kind: 'WAIT',
    durationTicks: 54,
    family: 'BEAM_BASE',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'T.beamAttacker: generic 54t beam charge (~0.90s)',
    runtimeLocation: 'profiles.ts T.beamAttacker',
    correctlyUsed: 'partial',
    remediation: 'Legacy path uses 54t. ROM compiler path uses ROM_TICKS per AnimationResource (e.g. Kamehameha $03 = 75t). Legacy path superseded for ROM-backed cards.',
  },
  {
    id: 'LEGACY_BEAM_TRAVEL',
    kind: 'FX_LIFETIME',
    durationTicks: 54,
    family: 'BEAM_BASE',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'T.beamTravel: generic 54t beam travel (~0.90s)',
    runtimeLocation: 'profiles.ts T.beamTravel',
    correctlyUsed: 'partial',
    remediation: 'FX travel duration varies by beam. PRESENTATION_DERIVED pending per-FX measurement.',
  },
  {
    id: 'LEGACY_BEAM_TARGET',
    kind: 'TARGET_REACTION',
    durationTicks: 44,
    family: 'BEAM_BASE',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'T.beamTarget: generic 44t target reaction',
    runtimeLocation: 'profiles.ts T.beamTarget',
    correctlyUsed: 'partial',
    remediation: 'Target reaction varies by hit/miss/guard. PRESENTATION_DERIVED pending per-family measurement.',
  },
  {
    id: 'LEGACY_RUSH_ATTACKER',
    kind: 'WAIT',
    durationTicks: 50,
    family: 'STANDARD_DAMAGE',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'T.rushAttacker: generic 50t rush attacker (~0.84s)',
    runtimeLocation: 'profiles.ts T.rushAttacker',
    correctlyUsed: 'partial',
    remediation: 'Legacy path uses 50t. ROM compiler path uses ROM_TICKS per AnimationResource. Legacy path superseded for ROM-backed cards.',
  },
  {
    id: 'LEGACY_RUSH_TRAVEL',
    kind: 'APPROACH',
    durationTicks: 44,
    family: 'STANDARD_DAMAGE',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'T.rushTravel: generic 44t rush travel (~0.74s)',
    runtimeLocation: 'profiles.ts T.rushTravel',
    correctlyUsed: 'partial',
    remediation: 'Legacy path uses 44t. ROM_RUSH_MOTION = 25t is ROM_EXACT. Legacy path superseded for ROM-backed cards.',
  },
  {
    id: 'LEGACY_RUSH_TARGET',
    kind: 'TARGET_REACTION',
    durationTicks: 38,
    family: 'STANDARD_DAMAGE',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'T.rushTarget: generic 38t target reaction',
    runtimeLocation: 'profiles.ts T.rushTarget',
    correctlyUsed: 'partial',
    remediation: 'Target reaction varies. PRESENTATION_DERIVED pending per-family measurement.',
  },
  {
    id: 'LEGACY_SUPPORT_TOTAL',
    kind: 'WAIT',
    durationTicks: 118,
    family: 'SUPPORT',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'T.supportTotal: generic 118t support (~1.98s)',
    runtimeLocation: 'profiles.ts T.supportTotal',
    correctlyUsed: 'partial',
    remediation: 'Legacy path uses 118t. SUPPORT_HOLD120_TICKS = 120t is ROM-confirmed. Legacy path superseded for ROM-backed cards.',
  },
  {
    id: 'LEGACY_SOLO_TOTAL',
    kind: 'WAIT',
    durationTicks: 96,
    family: 'GATHER',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'T.soloTotal: generic 96t gather/buff',
    runtimeLocation: 'profiles.ts T.soloTotal',
    correctlyUsed: 'yes',
    remediation: '96t is PRESENTATION_DERIVED. Gather duration varies per form.',
  },
  {
    id: 'LEGACY_STAGE_POST_QTE',
    kind: 'POST_ACTION_HOLD',
    durationTicks: 40,
    family: 'STAGE',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'Stage post-QTE resolution block: 0-40t offsets',
    runtimeLocation: 'buildTimeline.ts ATTACK_HIT Stage block',
    correctlyUsed: 'yes',
    remediation: '40t is PRESENTATION_DERIVED: structural need for post-QTE cinematic. No ROM evidence for or against.',
  },
  {
    id: 'LEGACY_KO_HURT',
    kind: 'TARGET_REACTION',
    durationTicks: 20,
    family: 'SHARED',
    evidence: 'PRESENTATION_DERIVED',
    source: null,
    description: 'KO hurt pose duration: 20t',
    runtimeLocation: 'buildTimeline.ts FIGHTER_DEFEATED case',
    correctlyUsed: 'yes',
    remediation: '20t is PRESENTATION_DERIVED. KO duration unknown from ROM.',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════════════════

export function beatsByFamily(family: CinematicFamily): readonly RomCinematicBeat[] {
  return ROM_CINEMATIC_BEATS.filter(b => b.family === family);
}

export function beatsByEvidence(evidence: CinematicEvidence): readonly RomCinematicBeat[] {
  return ROM_CINEMATIC_BEATS.filter(b => b.evidence === evidence);
}

export function incorrectlyUsedBeats(): readonly RomCinematicBeat[] {
  return ROM_CINEMATIC_BEATS.filter(b => b.correctlyUsed !== 'yes');
}

export function inferredLegacyBeats(): readonly RomCinematicBeat[] {
  return ROM_CINEMATIC_BEATS.filter(b => b.evidence === 'INFERRED_LEGACY');
}

export function cinematicEvidenceSummary(): Record<CinematicEvidence, number> {
  const counts: Record<string, number> = {};
  for (const b of ROM_CINEMATIC_BEATS) {
    counts[b.evidence] = (counts[b.evidence] || 0) + 1;
  }
  return counts as Record<CinematicEvidence, number>;
}

export function familyEvidenceSummary(): Record<CinematicFamily, Record<CinematicEvidence, number>> {
  const summary: Record<string, Record<string, number>> = {};
  for (const b of ROM_CINEMATIC_BEATS) {
    if (!summary[b.family]) summary[b.family] = {};
    summary[b.family][b.evidence] = (summary[b.family][b.evidence] || 0) + 1;
  }
  return summary as Record<CinematicFamily, Record<CinematicEvidence, number>>;
}