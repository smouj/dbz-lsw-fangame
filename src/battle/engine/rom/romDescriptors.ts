// ═══════════════════════════════════════════════════════════════════════
// ROM LOTE 6 — Descriptores ROM de presentación, Support y Defense.
// Fuente: docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md §174–207.
// ═══════════════════════════════════════════════════════════════════════
// Estos tipos DESCRIBEN la ROM; no ejecutan gameplay. La presentación los
// consume para construir la Timeline; el Engine usa los descriptors de
// Support/Defense para despachar por identidad ROM real (nunca generic).
//
// Guardrail §193: estos items NO son ActionExecution — jamás disparan
// postActionMaintenance() (único boundary: ActionExecution completa).
// ═══════════════════════════════════════════════════════════════════════

// ─── Presentation macros (SUPERSEDES §174: NO son recursos gráficos) ───
/** ID de macro de presentación (Bank30:$5D00) — comportamiento, no recurso. */
export type RomPresentationMacroId = 0x19 | 0x1a | 0x27 | 0x28;

/** Semántica humana documentada aparte (no inventar nombres creativos). */
export const ROM_PRESENTATION_MACROS: Record<RomPresentationMacroId, string> = {
  0x19: 'SET_ANIMATION_STATE slot=0 (estado neutro del actor)',
  0x1a: 'SET_ANIMATION_STATE slot=1 (compañero)',
  0x27: 'CHARA_EXIT (-98px / 28t + hold 15t)',
  0x28: 'CHARA_ENTRY (+106 → +98, settle -8px / 8t)',
};

// ─── CGB palette transition (SUPERSEDES §179: NO es camera/tilemap) ───
export interface PaletteTransitionJob {
  state: 'IDLE' | 'RUNNING' | 'DONE';
  sourcePalette: number; // Palette ID ROM (Bank30:$6E00)
  targetPalette: number; // Palette ID ROM
  tick: number;          // tick GBC actual de la interpolación
}

// ─── Action scene load (TACTICAL→ACTION, §180-182) ───
export interface ActionSceneLoad {
  /** VRAM load asociado a $8E00 (gráficos ACTION). */
  vramLoad: '$8E00';
  /** Macros de inicialización de actores en orden (§182). */
  macros: RomPresentationMacroId[];
  /** Transición de paleta CGB (start → poll → done). */
  paletteTransition: PaletteTransitionJob;
}

// ─── CHARA exact motion (§176-178) ───
// CORRECCIÓN (2026-08-28): CHARA_ENTRY total = 32t (no 13t). §177 descompone
// +8×8 +6×4 +4×3 +2×2 +1×2 = +106px/19t → WAIT 5 → settle -1×8 = -8px/8t.
export const CHARA_EXIT = {
  deltaPx: -98,
  moveTicks: 28,
  holdTicks: 15,
  totalTicks: 43,
} as const;

/** Segmentos discretos exactos de $27 (§176): -1×2 · -2×2 · -3×4 · -4×20 = -98px/28t. */
export const CHARA_EXIT_MOTION_SEGMENTS: ReadonlyArray<{ dxPerTick: number; dyPerTick: number; ticks: number }> = [
  { dxPerTick: -1, dyPerTick: 0, ticks: 2 },
  { dxPerTick: -2, dyPerTick: 0, ticks: 2 },
  { dxPerTick: -3, dyPerTick: 0, ticks: 4 },
  { dxPerTick: -4, dyPerTick: 0, ticks: 20 },
];

export const CHARA_ENTRY = {
  deltaPx: +106,
  settlePx: -8,
  settleTicks: 8,
  netPx: +98,
  holdTicks: 5,
  entryTicks: 19,
  totalTicks: 32,
} as const;

/** Segmentos discretos exactos de $28 (§177): +8×8 +6×4 +4×3 +2×2 +1×2 = +106px/19t. */
export const CHARA_ENTRY_MOTION_SEGMENTS: ReadonlyArray<{ dxPerTick: number; dyPerTick: number; ticks: number }> = [
  { dxPerTick: +8, dyPerTick: 0, ticks: 8 },
  { dxPerTick: +6, dyPerTick: 0, ticks: 4 },
  { dxPerTick: +4, dyPerTick: 0, ticks: 3 },
  { dxPerTick: +2, dyPerTick: 0, ticks: 2 },
  { dxPerTick: +1, dyPerTick: 0, ticks: 2 },
];

// ─── Coreografía CHARACTER_SWITCH (§178) ───
//   ACTION SETUP → state 0 → palette $0348 → WAIT 20 → MACRO $27 (EXIT 43t)
//   → CHARACTER_SWITCH_COMMIT → MACRO $28 (ENTRY 32t) → palette $31 → FX.
//  El commit (activeMember = selectedMember) ocurre ENTRE $27 y $28; la
//  presentación no debe cambiar el miembro visible antes de terminar los 43t.

/** §178 — WAIT 20 antes del MACRO $27 (pre-switch). */
export const CHARA_SWITCH_PRE_WAIT_TICKS = 20;

/** Offset desde CHARACTER_SWITCH_STARTED hasta COMMIT (WAIT 20 + EXIT 43). */
export const CHARA_SWITCH_COMMIT_OFFSET = CHARA_SWITCH_PRE_WAIT_TICKS + CHARA_EXIT.totalTicks;

/** Offset desde STARTED hasta COMPLETED (COMMIT 63 + ENTRY 32). */
export const CHARA_SWITCH_COMPLETED_OFFSET = CHARA_SWITCH_COMMIT_OFFSET + CHARA_ENTRY.totalTicks;


// ─── Support ROM descriptor (§185: gameplay y presentation SEPARADOS) ───
export type RomSupportContext = 'ATTACK' | 'DEFENSE';

export type RomSupportOperation =
  | 'HEAL'
  | 'RESOURCE'
  | 'BUFF'
  | 'DEBUFF'
  | 'CLEANSE'
  | 'DISPEL'
  | 'NEXT_ATTACK_MODIFIER'
  | 'ONE_SHOT_SHIELD'
  | 'GATHER_INTERACTION'
  | 'DIRECT_SPECIAL'
  | 'SCRIPTED_SPECIAL';

export interface SupportRomDescriptor {
  cardId: number;
  gameplay: {
    operation: RomSupportOperation;
    target: 'self' | 'opponent' | 'ally';
    persistence: 'instant' | 'persistent' | 'until_consumed';
    consumePolicy: 'none' | 'on_next_attack' | 'on_hit' | 'on_beam' | 'on_damage';
    /** Regla concreta ROM (p. ej. 'kaioKen ×2 base' · '+5 CC' · 'hitThreshold >> 1'). */
    rule: string;
  };
  presentation: {
    workerFamily: string;
    macros: RomPresentationMacroId[];
    palette: number | null;
    fx: string | null;
  };
}

// ─── Defense ROM rules (§192: tabla explícita, no switch genérico) ───
export enum RomResolutionMode {
  NORMAL = 0,
  SPECIAL_SUPPORT = 1,
  BASIC_GUARD = 2,
  BASIC_MOVE = 3,
}

export type RomDefenseResult =
  | 'AVOIDED'          // CA53=1 · damage 0
  | 'NULLIFIED'        // CA53=3 · damage 0
  | 'ATTENUATED'       // CA53=2 · damage = CC cost
  | 'ABSORBED'         // CA53=4 · heal = Beam power
  | 'COMMAND_CANCELLED'; // $40 · clear success flags Command/Stage

export interface DefenseRomRuleDescriptor {
  cardId: number;
  /** Bit CA83 (§197). */
  ca83: number;
  /** Familia CA53 resultante. */
  resultFamily: 0 | 1 | 2 | 3 | 4;
  /** Resultado semántico para la presentación. */
  result: RomDefenseResult;
  /** Regla ROM concreta. */
  rule: string;
}

/** Tabla explícita card id → regla (no switch(effect) que pierda identidad ROM).
 *  IDs reales de src/data/cards.ts (125 cartas ROM USA). */
export const DEFENSE_ROM_RULES: Record<number, DefenseRomRuleDescriptor> = {
  // Taiyoken → $01 (19)
  19: { cardId: 19, ca83: 0x01, resultFamily: 1, result: 'AVOIDED', rule: 'Taiyoken: anulación CA53=1 (Sunglasses la bypassa, CA83=0x81)' },
  // Instant Transmission (Teleport.) → $02 (26)
  26: { cardId: 26, ca83: 0x02, resultFamily: 1, result: 'AVOIDED', rule: 'IT/Avoiding: CA53=1, damage 0' },
  // Barrier → $04 (45)
  45: { cardId: 45, ca83: 0x04, resultFamily: 3, result: 'NULLIFIED', rule: 'Barrier: CA53=3, damage 0, rama visual propia' },
  // Time Freeze → $40 (52)
  52: { cardId: 52, ca83: 0x40, resultFamily: 0, result: 'COMMAND_CANCELLED', rule: 'TimeFreeze: clear $CA6A..$CA73 (success flags Stage)' },
  // Breath → $04 (53)
  53: { cardId: 53, ca83: 0x04, resultFamily: 3, result: 'NULLIFIED', rule: 'Breath: CA53=3, damage 0' },
  // Energy Absorb → $08 (76)
  76: { cardId: 76, ca83: 0x08, resultFamily: 4, result: 'ABSORBED', rule: 'Energy Absorb: CA53=4, heal=incomingCard.power (modo HEAL)' },
  // Endurance → $10 (121)
  121: { cardId: 121, ca83: 0x10, resultFamily: 2, result: 'ATTENUATED', rule: 'Endurance: CA53=2, damage=card.CC_cost' },
  // Telepathy → $40 (122)
  122: { cardId: 122, ca83: 0x40, resultFamily: 0, result: 'COMMAND_CANCELLED', rule: 'Telepathy: clear $CA6A..$CA73' },
  // Foresight → $40 (123)
  123: { cardId: 123, ca83: 0x40, resultFamily: 0, result: 'COMMAND_CANCELLED', rule: 'Foresight: clear $CA6A..$CA73' },
  // Shockwave → $01 (124)
  124: { cardId: 124, ca83: 0x01, resultFamily: 1, result: 'AVOIDED', rule: 'Shockwave: anulación CA53=1' },
  // Avoiding → $02 (125)
  125: { cardId: 125, ca83: 0x02, resultFamily: 1, result: 'AVOIDED', rule: 'Avoiding: CA53=1, damage 0' },
};

/** Todos los IDs de Defense Cards con descriptor ROM (para verificación). */
export const DEFENSE_CARD_IDS = Object.keys(DEFENSE_ROM_RULES).map(Number);

// ─── Fidelity / trazabilidad ───
export type RomFidelity = 'ROM_CONFIRMED' | 'ROM_INFERRED' | 'REMAKE_CANON' | 'OBSOLETE';

// ═══════════════════════════════════════════════════════════════════════
// ROM LOTE 7 — STANDARD_ATTACK: gramática común Damage/Beam (§208-244).
// Fuente: docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md §208–244.
// ═══════════════════════════════════════════════════════════════════════

/** Dispatcher STANDARD_ATTACK (§208): subtype → worker Bank03. */
export const STANDARD_ATTACK_HANDLERS: Record<number, number> = {
  0x02: 0x5776, // BEAM_BASE
  0x03: 0x5a6b, // BEAM_RELEASE_FRAME_5
  0x04: 0x5ac7, // BURNING_ATTACK_RELEASE (frame 17)
  0x05: 0x5b38, // PROJECTILE_SCROLL (screen -6×19)
  0x06: 0x5b9e, // PROJECTILE_ALT_SCROLL (frame 7, screen -6×16)
  0x07: 0x5dfe, // SPECIAL_PROJECTILE_PATH (WAIT2→FX→WAIT4→SCREEN_PATH)
  0x08: 0x5e67, // SPECIAL
  0x0a: 0x5fe3, // DAMAGE_BASE
  0x0b: 0x61c5, // TAIL
  0x0c: 0x62d4, // BUU_BALL
  0x0d: 0x5c04, // PURPLE_COMET
  0x0e: 0x5d0c, // PURPLE_COMET_Z
};

/** Subtipos que coordinan dos animadores (§225). */
export type ActionParticipantRole = 'ACTOR_PRIMARY' | 'ACTOR_SUPPORT' | 'TARGET';

/** Movimiento discreto gobernado por ticks GBC (§211 — NO lerp/easing). */
export interface RomDiscreteMotion {
  segments: { dxPerTick: number; dyPerTick: number; ticks: number }[];
  mirrorBySide: boolean;
}

/** Rush físico — macro $1C (§211): +4px×24t + +2px×1t = +98px/25t. */
export const ROM_RUSH_MOTION: RomDiscreteMotion = {
  segments: [{ dxPerTick: 4, dyPerTick: 0, ticks: 24 }, { dxPerTick: 2, dyPerTick: 0, ticks: 1 }],
  mirrorBySide: true,
};

/** CHARA_EXIT — macro $27 (§176): -98px/28t + WAIT 15t = 43t total.
 *  El hold se codifica como segmento dx=0 para positionAtTick determinista. */
export const ROM_CHARA_EXIT_MOTION: RomDiscreteMotion = {
  segments: [
    ...CHARA_EXIT_MOTION_SEGMENTS,
    { dxPerTick: 0, dyPerTick: 0, ticks: 15 }, // WAIT 15 (hold)
  ],
  mirrorBySide: true,
};

/** CHARA_ENTRY — macro $28 (§177): +106px/19t → WAIT 5 → settle -8px/8t = 32t total.
 *  Neto +98px. El hold se codifica como segmento dx=0. */
export const ROM_CHARA_ENTRY_MOTION: RomDiscreteMotion = {
  segments: [
    ...CHARA_ENTRY_MOTION_SEGMENTS,
    { dxPerTick: 0, dyPerTick: 0, ticks: 5 },    // WAIT 5 (hold)
    { dxPerTick: -1, dyPerTick: 0, ticks: 8 },   // settle -8px/8t
  ],
  mirrorBySide: true,
};

/** Preparación Beam — macro $1E (§212): -1×2t + -2×10t + -1×5t = -27px/17t. */
export const ROM_BEAM_SETUP_MOTION: RomDiscreteMotion = {
  segments: [
    { dxPerTick: -1, dyPerTick: 0, ticks: 2 },
    { dxPerTick: -2, dyPerTick: 0, ticks: 10 },
    { dxPerTick: -1, dyPerTick: 0, ticks: 5 },
  ],
  mirrorBySide: true,
};

/** Desplazamiento de pantalla (§222-223/§232): -6 × N ticks (SCREEN_MOTION). */
export interface RomScreenMotion {
  dxPerTick: number;
  ticks: number;
  restore: boolean;
}

export const ROM_SCREEN_MOTION_19T: RomScreenMotion = { dxPerTick: -6, ticks: 19, restore: true }; // $05
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ROM_SCREEN_MOTION_16T: RomScreenMotion = { dxPerTick: -6, ticks: 16, restore: true }; // $06/impacto

/** CA54 — Power ≥ 30 cambia la cinematografía (§226/§229-230). */
export function ca54ForPower(power: number): 0 | 1 {
  return power >= 30 ? 1 : 0;
}

export type RomImpactClass = 'NORMAL_POWER' | 'HIGH_POWER';

export function impactClassForPower(power: number): RomImpactClass {
  return power >= 30 ? 'HIGH_POWER' : 'NORMAL_POWER';
}

/** Perfil de ataque estándar (§235) — data-driven, sin switches por nombre. */
export interface RomStandardAttackProfile {
  cardId: number;
  handler: number;
  actorAnimationResource: number | null;
  effectResource: number | null;
  paletteId: number | null;
  audioScriptId: number | null;
  launch?: {
    syncFrame: number | null;
    screenMotion?: RomScreenMotion;
    pathId?: number;
  };
  resolution: {
    normalHitMacro: number | null;
    normalMissMacro: number | null;
    specialDefenseMacro: number | null;
    highPowerHitMacro?: number | null;
    highPowerMissMacro?: number | null;
  };
}

/** Kamehameha — perfil ROM real (§227-230): Card #12. */
export const KAMEHAMEHA_ROM_PROFILE: RomStandardAttackProfile = {
  cardId: 12,
  handler: 0x02,
  actorAnimationResource: 0x03,
  effectResource: 0x05,
  paletteId: 0x2c,
  audioScriptId: 0x0c,
  launch: { syncFrame: 4 }, // WAIT actor frame 4 → FX → WAIT 60
  resolution: {
    normalHitMacro: 0x2b, // low power hit (§228)
    normalMissMacro: 0x32, // low power miss
    specialDefenseMacro: null,
    highPowerHitMacro: 0x2c, // Super Kamehameha (Power 30)
    highPowerMissMacro: 0x33,
  },
};

/** Macros de resolución física (§215-217): HIT/MISS/SPECIAL_DEFENSE. */
export const PHYSICAL_RESOLUTION_MACROS = {
  hit: 0x2f,
  miss: 0x30,
  specialDefense: 0x31,
} as const;

/** Familias visuales físicas (§217). */
export type RomPhysicalVisualFamily = 'PHYSICAL_HIT' | 'PHYSICAL_MISS' | 'PHYSICAL_SPECIAL_DEFENSE';

/** Categorías de proyectil según evidencia (§231). */
export type RomProjectileKind =
  | 'ENTITY_PROJECTILE'
  | 'SCREEN_FX'
  | 'SCREEN_PATH_FX'
  | 'BEAM_RAY'
  | 'ATTACHED_FX';

/**
 * Resuelve el perfil STANDARD_ATTACK de una carta de forma DATA-DRIVEN
 * (§208/§235): el perfil manda cuando existe; sin switches por nombre de
 * carta en el Presenter. Si no hay perfil ROM devuelve null (el perfil
 * INFERRED antiguo queda como fallback, §238 — nunca al revés).
 */
export function standardAttackProfileFor(card: { id: number; type: string; atk: number }): RomStandardAttackProfile | null {
  // Perfiles ROM_CONFIRMED por cardId (ampliar con cada carta trazada).
  const known: Record<number, RomStandardAttackProfile> = {
    12: KAMEHAMEHA_ROM_PROFILE,
  };
  return known[card.id] ?? null;
}

/**
 * Beam LaunchProfile por handler (§218-224, §3858-3859).
 *
 * $03-$07 hacen `if state != $14: jump Handler02` — comparten la máquina
 * Beam ($5776) y SOLO reemplazan el tramo de lanzamiento. Cada handler tiene
 * un `releaseSyncFrame` distinto y, según el caso, screen-motion o path:
 *   $02 release frame 4 (sin screen motion)
 *   $03 release frame 5
 *   $04 release frame 17
 *   $05 release frame 4 + screen -6×19t (restore)
 *   $06 release frame 7 + screen -6×16t (restore)
 *   $07 WAIT2 → FX → WAIT4 → SCREEN_PATH (release frame 2)
 * Evidencia: docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md §218-224 y
 * §3858-3859 (R4 Rocket Punch $05 · R4b Potbelly $06).
 */
export interface BeamLaunchProfile {
  handler: number;
  releaseSyncFrame: number;
  screenMotion?: RomScreenMotion;
  /** $07 usa screen-path opcode $11 en lugar de screen motion. */
  screenPath?: boolean;
}

export const BEAM_LAUNCH_PROFILES: readonly BeamLaunchProfile[] = [
  { handler: 0x02, releaseSyncFrame: 4 },
  { handler: 0x03, releaseSyncFrame: 5 },
  { handler: 0x04, releaseSyncFrame: 17 },
  { handler: 0x05, releaseSyncFrame: 4, screenMotion: ROM_SCREEN_MOTION_19T },
  { handler: 0x06, releaseSyncFrame: 7, screenMotion: ROM_SCREEN_MOTION_16T },
  { handler: 0x07, releaseSyncFrame: 2, screenPath: true },
];

/** Resuelve el LaunchProfile de un handler Beam ($02-$07). */
export function beamLaunchProfileForHandler(handler: number): BeamLaunchProfile | null {
  return BEAM_LAUNCH_PROFILES.find(profile => profile.handler === handler) ?? null;
}

// ═══════════════════════════════════════════════════════════════════════
// ROM LOTE 8 — ActionObject core, per-frame timing, handlers especiales
// (§245-276). Fuente: docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md §245–276.
// ═══════════════════════════════════════════════════════════════════════

/** Contrato de memoria de los ActionObjects (§245). */
export const ACTION_OBJECT_MEMORY = {
  base: 0xc3a0,
  stride: 0x13, // 19 bytes
  slot1: 0xc3b3,
  activeIndex: 0xc3c6,
} as const;

/** Estado cinematográfico de un ActionObject (§245). */
export interface RomActionObjectState {
  slot: 0 | 1;
  active: boolean;
  animationSetId: number | null;
  clipId: number | null;
  frameIndex: number;
  frameElapsedTicks: number;
  x: number;
  y: number;
  flipX: boolean;
  flipY: boolean;
  renderPriority: number;
  /** Útil mientras los 19 bytes no estén completamente decodificados. */
  raw?: readonly number[];
}

/** Binding temporal slot → rol (§246-247) — slot ≠ identidad ≠ rol permanente. */
export interface ActionObjectBinding {
  slot: 0 | 1;
  role: 'ACTOR' | 'TARGET' | 'ACTOR_PRIMARY' | 'ACTOR_SUPPORT' | 'FX_PARTICIPANT';
  fighterSide?: 'PLAYER' | 'ENEMY';
  characterId?: string;
  formId?: string;
}

/** Recursos ACTION de un participante (§248-249). */
export interface FighterActionResources {
  characterId: string;
  formId: string;
  animationSetId: number | string;
  paletteId: number | string;
  sourceEvidence: 'ROM_STATIC_VERIFIED' | 'ROM_DYNAMIC_VERIFIED' | 'PROJECT_MAPPING';
}

/** Frame de animación ROM — 4 bytes (§250-251). */
export interface RomAnimationFrame {
  visualFrameId: number;
  durationTicks: number;
  offsetX: number;
  offsetY: number;
}

/** Bridge hacia V9 (§251-252): fps pasa a compat legacy. */
export interface RuntimePoseFrame {
  asset: string;
  durationTicks?: number;
  rom?: {
    visualFrameId?: number;
    offsetX?: number;
    offsetY?: number;
    evidence: 'ROM_STATIC_VERIFIED' | 'FRAME_VERIFIED' | 'INFERRED';
  };
}

/** Orden de dibujo derivado de la rama $CA39 == 2 (§264). */
export type ActionDrawOrder = 'SLOT_0_THEN_1' | 'SLOT_1_THEN_0';

/** Opcode $0A — semántica PARTIAL (§265). */
export interface RomSetObjectPosition {
  slot: 0 | 1;
  x: number;
  y: number;
  semantics: 'ABSOLUTE_OR_BASE_POSITION_UNRESOLVED';
}

/** Descriptor de handler ROM (§269). */
export interface RomActionHandlerDescriptor {
  subtype: number;
  worker: { bank: number; address: number };
  family: 'BEAM' | 'DAMAGE' | 'SPECIAL' | 'TAIL' | 'BUU_BALL' | 'MULTI_ACTOR_SCRIPT';
  variant?: string;
  evidence: 'ROM_HANDLER_VERIFIED' | 'ROM_SEQUENCE_VERIFIED' | 'PENDING_ROM_TRACE';
}

/** Descriptores de los handlers especiales (§256-261, §269). */
export const SPECIAL_HANDLER_DESCRIPTORS: Record<number, RomActionHandlerDescriptor> = {
  0x08: { subtype: 0x08, worker: { bank: 3, address: 0x5e67 }, family: 'SPECIAL', evidence: 'ROM_HANDLER_VERIFIED' },
  0x0b: { subtype: 0x0b, worker: { bank: 3, address: 0x61c5 }, family: 'TAIL', evidence: 'ROM_HANDLER_VERIFIED' },
  0x0c: { subtype: 0x0c, worker: { bank: 3, address: 0x62d4 }, family: 'BUU_BALL', evidence: 'ROM_HANDLER_VERIFIED' },
  0x0d: { subtype: 0x0d, worker: { bank: 3, address: 0x5c04 }, family: 'MULTI_ACTOR_SCRIPT', variant: 'PURPLE_COMET', evidence: 'ROM_HANDLER_VERIFIED' },
  0x0e: { subtype: 0x0e, worker: { bank: 3, address: 0x5d0c }, family: 'MULTI_ACTOR_SCRIPT', variant: 'PURPLE_COMET_Z', evidence: 'ROM_HANDLER_VERIFIED' },
};

/** Perfil multi-actor (§271). */
export interface RomMultiActorProfile {
  handler: 0x0d | 0x0e;
  variant: 'PURPLE_COMET' | 'PURPLE_COMET_Z';
  maxSimultaneousActionObjects: 2;
  bindings: 'DYNAMIC';
  sequenceEvidence: 'ROM_HANDLER_VERIFIED' | 'ROM_SEQUENCE_VERIFIED' | 'PENDING_ROM_TRACE';
}

/** Unión de perfiles de acción (§270). */
export type RomActionProfile =
  | RomStandardAttackProfile
  | RomMultiActorProfile;

// ─── romCA53 contract (V6.6): numérico en la capa ROM, semántica contextual ───
// V5: CA53=2 NO es universalmente MISS. La capa ROM conserva el valor
// numérico (resultFamily 0..4); la semántica (NATURAL_MISS, ENDURANCE_PARTIAL,
// …) procede SIEMPRE de contexto + EventLog, nunca de un switch(romCA53).
/** Valor numérico CA53 conservado de la ROM (RESULT_0..RESULT_4). */
export type RomCA53 = 0 | 1 | 2 | 3 | 4;

/** Resultado semántico que aporta la capa de gameplay/EventLog. */
export type RomCA53SemanticOutcome =
  | 'NATURAL_HIT'
  | 'NATURAL_MISS'
  | 'AVOID'
  | 'ENDURANCE_PARTIAL'
  | 'NULLIFICATION'
  | 'ENERGY_ABSORB'
  | 'COMMAND_CANCELLED'
  | 'UNKNOWN_CONTEXT';

/** Contexto requerido para traducir romCA53 → semántica. */
export interface RomCA53Context {
  /** Carta de defensa jugada (si la hay). */
  defenseCardId?: number | null;
  /** Evento del log que decidió el resultado (si es un ataque sin defensa). */
  sourceEvent?: 'ATTACK_HIT' | 'ATTACK_MISSED' | null;
}

/** Contrato V5/V6: par numérico + semántico. */
export interface RomCA53Resolution {
  romCA53: RomCA53;
  semanticOutcome: RomCA53SemanticOutcome;
}

/**
 * Traducción contextual de romCA53. NUNCA traduce el valor numérico solo:
 * sin contexto devuelve UNKNOWN_CONTEXT (protege contra `case 2: return 'MISS'`).
 * - Con carta de defensa: la semántica sale de DEFENSE_ROM_RULES (identidad ROM).
 * - Sin defensa: el EventLog decide (ATTACK_HIT / ATTACK_MISSED).
 */
export function semanticOutcomeForCA53(
  romCA53: RomCA53,
  ctx: RomCA53Context = {},
): RomCA53SemanticOutcome {
  if (ctx.defenseCardId != null) {
    const rule = DEFENSE_ROM_RULES[ctx.defenseCardId];
    if (rule && rule.resultFamily === romCA53) {
      switch (rule.result) {
        case 'AVOIDED':
          return 'AVOID';
        case 'NULLIFIED':
          return 'NULLIFICATION';
        case 'ATTENUATED':
          return 'ENDURANCE_PARTIAL';
        case 'ABSORBED':
          return 'ENERGY_ABSORB';
        case 'COMMAND_CANCELLED':
          return 'COMMAND_CANCELLED';
      }
    }
  }
  if (ctx.sourceEvent === 'ATTACK_MISSED') return 'NATURAL_MISS';
  if (ctx.sourceEvent === 'ATTACK_HIT') return 'NATURAL_HIT';
  return 'UNKNOWN_CONTEXT';
}

/**
 * Resuelve el descriptor de handler especial de una carta (§269/§273).
 * Mapeo data-driven cardId → subtype; sin mapeo devuelve null (la UI no
 * muestra timeline inventada — solo worker/family/variant/evidence).
 * Ampliar con cada carta trazada (Lote 9).
 */
export function specialHandlerForCard(card: { id: number; type: string }): RomActionHandlerDescriptor | null {
  const known: Record<number, number> = {
    // cardId → subtype (ROM byte5). Trazas pendientes: ampliar en L9.
    29: 0x0b, // Tail
    57: 0x0d, // Purple Comet
    58: 0x0e, // P.Comet Z
  };
  const subtype = known[card.id];
  return subtype !== undefined ? (SPECIAL_HANDLER_DESCRIPTORS[subtype] ?? null) : null;
}
