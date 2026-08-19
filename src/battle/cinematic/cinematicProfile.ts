// ═══════════════════════════════════════════════════════════════════════
// CINEMATIC PROFILE — sistema cinematográfico DECLARATIVO y auditable.
// Contrato (docs/COMBAT_CONTRACT.md §cinematografía):
//   · La cinematografía NO decide gameplay (HP/CC/fase/exchange/QTE =
//     Engine). Solo plano, fondo, fade, poses, posición visual, FX,
//     proyectil, impacto, pausas y audio.
//   · Resolución por HERENCIA: GLOBAL GRAMMAR → FAMILY PROFILE →
//     SIGNATURE PROFILE → CARD OVERRIDES (declarativo, nunca 125 if).
//   · Roles SIEMPRE relativos (ACTOR/TARGET/DEFENDER) — jamás coordenadas
//     por carta. El ancla pertenece al PLANO, no al personaje.
//   · Movimientos: STATIC | LOCAL | APPROACH | KNOCKBACK | SHOT_TRANSFER.
//     Ninguno modifica la posición táctica (BattleState).
//   · Cambios de plano SOLO por SHOT explícito; fades con swapShotAt en
//     FULL_BLACK; pausas en ticks (HoldSpec) — jamás setTimeout.
//   · FIDELIDAD por dato: FRAME_VERIFIED · VIDEO_VERIFIED ·
//     ROM_ASSET_VERIFIED · MANUAL_VERIFIED · INFERRED. Los timings sin
//     medir son INFERRED — nunca canon GBC.
// ═══════════════════════════════════════════════════════════════════════

// ── Vocabulario del contrato ──
export type ShotId = 'FIELD' | 'ACTION' | 'ACTION_DUEL' | 'SPECIAL';
export type TransitionType = 'NONE' | 'CUT' | 'FADE_BLACK' | 'FLASH_WHITE' | 'FLASH_BLACK';
export type MovementType = 'STATIC' | 'LOCAL' | 'APPROACH' | 'KNOCKBACK' | 'SHOT_TRANSFER';
export type HoldPoint = 'PREPARATION' | 'ANTICIPATION' | 'CONTACT' | 'IMPACT' | 'REACTION' | 'RECOVERY';
export type AnchorId =
  | 'ACTOR_HOME' | 'TARGET_HOME' | 'ACTOR_ENTRY' | 'TARGET_ENTRY'
  | 'CONTACT_POINT' | 'PROJECTILE_ORIGIN' | 'PROJECTILE_TARGET'
  | 'OFFSCREEN_LEFT' | 'OFFSCREEN_RIGHT' | 'GROUND_BASELINE';
export type CinematicFidelity =
  | 'FRAME_VERIFIED' | 'VIDEO_VERIFIED' | 'ROM_ASSET_VERIFIED' | 'MANUAL_VERIFIED' | 'INFERRED';

export interface TransitionSpec {
  type: TransitionType;
  /** Tick absoluto (respecto al inicio de la acción) del arranque. */
  startTick: number;
  durationTicks: number;
  /** Tick en el que se produce el cambio real de plano/fondo (FULL_BLACK). */
  swapShotAt: number;
  fidelity: CinematicFidelity;
}

export interface HoldSpec {
  at: HoldPoint;
  durationTicks: number;
  fidelity: CinematicFidelity;
}

export interface MovementSpec {
  type: MovementType;
  fromAnchor: AnchorId;
  toAnchor: AnchorId;
  startTick: number;
  endTick: number;
  easing: 'stepped' | 'linear';
  /** Al terminar, el actor vuelve a su ancla de origen (nunca queda a la deriva). */
  restoreAnchor: boolean;
  fidelity: CinematicFidelity;
}

export interface PoseBeatSpec {
  /** Pose semántica (idle, beam_charge, punch_right…). */
  pose: string;
  /** Frame del beat respecto al inicio de la acción. */
  atTick: number;
  fidelity: CinematicFidelity;
}

export interface CinematicProfile {
  /** Familia de la acción (stage | melee | beam | support | guard | move | gather). */
  family: string;
  /** Variante del perfil (ej. beam_ray · rising_kick · stage_3). */
  variant: string;
  /** Flujo de planos EXPLÍCITO (todo cambio de plano es un SHOT declarado). */
  shotFlow: ShotId[];
  entryTransition: TransitionSpec;
  exitTransition: TransitionSpec;
  /** Anclas relativas — el personaje se coloca sobre el ancla del PLANO. */
  actorAnchor: AnchorId;
  targetAnchor: AnchorId;
  /** Desplazamientos CINEMATOGRÁFICOS (jamás tocan la posición táctica). */
  actorMovement: MovementSpec[];
  targetMovement: MovementSpec[];
  /** Pausas cinematográficas en ticks. */
  holds: HoldSpec[];
  /** Beats del actor (preparación → ejecución). */
  actorBeats: PoseBeatSpec[];
  /** Reacción del objetivo (hit/block/guard) con su fidelidad. */
  reactionPose: { pose: string; fidelity: CinematicFidelity } | null;
  /** Proyectil: origen y destino SIEMPRE por anclas relativas. */
  projectile: { kind: string; origin: AnchorId; target: AnchorId } | null;
  fx: string[];
  /** Si la acción requiere input interactivo (Stage QTE / counter). */
  input: 'NONE' | 'STAGE_QTE' | 'COUNTER';
  /** Fidelidad MÍNIMA del perfil (lo menos verificado manda). */
  fidelity: CinematicFidelity;
  evidence: string;
}

// ── GLOBAL GRAMMAR: el armazón común de TODA acción ──
// FIELD → TRANSITION IN → ACTION → preparación → [input] → ejecución →
// impacto/reacción → recovery → TRANSITION OUT → FIELD.
// Los timings son INFERRED hasta medir el GBC (F0).
const T = (type: TransitionType, startTick: number, durationTicks: number, swap: number): TransitionSpec =>
  ({ type, startTick, durationTicks, swapShotAt: swap, fidelity: 'INFERRED' });

// ── FAMILY PROFILES: variaciones por familia (timings INFERRED) ──
function familyProfile(family: string, variant: string, opts: {
  shotFlow: ShotId[];
  actorAnchor?: AnchorId;
  targetAnchor?: AnchorId;
  actorMovement?: MovementSpec[];
  reactionPose?: { pose: string; fidelity: CinematicFidelity };
  projectile?: { kind: string; origin: AnchorId; target: AnchorId } | null;
  input?: CinematicProfile['input'];
  entry?: TransitionType;
}): CinematicProfile {
  return {
    family,
    variant,
    shotFlow: opts.shotFlow,
    entryTransition: T(opts.entry ?? 'CUT', 0, 6, 3),
    exitTransition: T('CUT', opts.shotFlow.length * 16, 6, 3),
    actorAnchor: opts.actorAnchor ?? 'ACTOR_HOME',
    targetAnchor: opts.targetAnchor ?? 'TARGET_HOME',
    actorMovement: opts.actorMovement ?? [],
    targetMovement: [],
    holds: [],
    actorBeats: [],
    reactionPose: opts.reactionPose ?? null,
    projectile: opts.projectile ?? null,
    fx: [],
    input: opts.input ?? 'NONE',
    fidelity: 'INFERRED',
    evidence: 'family profile — timings INFERRED hasta F0 (nunca canon GBC)',
  };
}

/** Herramientas de movimiento por familia (sin ticks concretos: el perfil
 *  firma los ajusta; el runtime los emite por el canon). */
const APPROACH_MELEE: MovementSpec = {
  type: 'APPROACH', fromAnchor: 'ACTOR_HOME', toAnchor: 'CONTACT_POINT',
  startTick: 0, endTick: 0, easing: 'stepped', restoreAnchor: true, fidelity: 'INFERRED',
};

export const FAMILY_PROFILES: Record<string, CinematicProfile> = {
  stage: familyProfile('stage', 'stage_general', {
    shotFlow: ['FIELD', 'ACTION', 'ACTION_DUEL', 'FIELD'], input: 'STAGE_QTE',
  }),
  melee: familyProfile('melee', 'melee_general', {
    shotFlow: ['FIELD', 'ACTION', 'ACTION_DUEL', 'FIELD'],
    actorMovement: [APPROACH_MELEE],
    reactionPose: { pose: 'knockback_back', fidelity: 'ROM_ASSET_VERIFIED' },
  }),
  beam: familyProfile('beam', 'beam_general', {
    shotFlow: ['FIELD', 'ACTION', 'ACTION_DUEL', 'FIELD'],
    projectile: { kind: 'ray', origin: 'PROJECTILE_ORIGIN', target: 'PROJECTILE_TARGET' },
  }),
  support: familyProfile('support', 'support_general', {
    shotFlow: ['FIELD', 'ACTION', 'FIELD'],
  }),
  gather: familyProfile('gather', 'gather_general', {
    shotFlow: ['FIELD', 'ACTION', 'FIELD'],
  }),
  guard: familyProfile('guard', 'guard_general', {
    shotFlow: ['FIELD', 'ACTION', 'FIELD'],
  }),
  move: familyProfile('move', 'move_general', {
    shotFlow: ['FIELD', 'ACTION', 'FIELD'],
  }),
};

// ── SIGNATURE: poses/impacto/proyectil REALES del perfil firma (runtime) ──
// Las poses vienen del manifest/canon (ROM_ASSET_VERIFIED); los TIEMPOS se
// quedan INFERRED. Nunca se deriva fade/duración/plano exacto del catálogo.
export interface SignatureInput {
  id: string;
  label: string;
  kind: string;
  visual: string;
  fidelity: string;
  actorBeats?: Array<{ frame: number; pose: string }>;
  impact?: { targetPose?: string; strikePose?: string };
  projectile?: { kind: string } | null;
  rush?: { startFrame?: number; duration?: number } | null;
}

const ROM: CinematicFidelity = 'ROM_ASSET_VERIFIED';

/** Resuelve el perfil cinematográfico de una acción por herencia:
 *  GLOBAL GRAMMAR → FAMILY → SIGNATURE (el perfil firma aporta poses,
 *  impacto y proyectil REALES; los timings quedan INFERRED). */
export function resolveCinematicProfile(sig: SignatureInput): CinematicProfile {
  const family = sig.kind === 'command' ? 'stage'
    : sig.kind === 'damage' ? 'melee'
    : sig.kind === 'beam' ? 'beam'
    : sig.kind === 'support' ? 'support'
    : sig.kind === 'gather' ? 'gather'
    : sig.kind === 'guard' ? 'guard'
    : sig.kind === 'move' ? 'move'
    : 'melee';
  const base = FAMILY_PROFILES[family] ?? FAMILY_PROFILES.melee;

  const actorBeats: PoseBeatSpec[] = (sig.actorBeats ?? []).map(b => ({
    pose: b.pose, atTick: b.frame, fidelity: ROM,
  }));
  const variant = sig.projectile?.kind ?? (family === 'stage' ? `stage_${sig.visual}` : sig.id);

  return {
    ...base,
    variant,
    actorBeats,
    reactionPose: sig.impact?.targetPose
      ? { pose: sig.impact.targetPose, fidelity: ROM }
      : base.reactionPose,
    projectile: sig.projectile
      ? { kind: sig.projectile.kind, origin: 'PROJECTILE_ORIGIN', target: 'PROJECTILE_TARGET' }
      : base.projectile,
    // El APPROACH solo se activa si la firma declara rush (evidencia).
    actorMovement: sig.rush ? [APPROACH_MELEE] : family === 'melee' ? [] : base.actorMovement,
    evidence: `signature '${sig.id}' (poses ROM_ASSET_VERIFIED) — timings INFERRED hasta F0`,
  };
}
