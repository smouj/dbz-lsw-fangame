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

/** Las vistas canónicas del contrato visual + la especial. */
export type BattleSceneMode =
  | 'OVERVIEW'
  | 'PLAYER_ACTION'
  | 'ENEMY_ACTION'
  | 'SPECIAL_ACTION'
  | 'ACTION_DUEL'
  // M8.C2a — plano DEFENSIVO: cámara en el DEFENSOR (su preparación visual:
  // guard idle → guard en contacto · move local sin mutar posición táctica ·
  // support con FX antes del ataque). Mismos FighterActor — nunca reparent.
  | 'DEFENDER_ACTION';

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
  /** M8.F0 — FLASH_WHITE: transición de entrada GBC (pantalla blanca). */
  action: 'CUT' | 'TRACK' | 'IMPACT' | 'RESET' | 'FLASH_WHITE';
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

// ── ROM LOTE 6 (§194/§206) — cues de trazabilidad ROM. NUNCA autoridad de
// gameplay: describen la VM de presentación (macros, carga ACTION, paleta
// CGB, motion CHARA, FX Support/Defense). No disparan postActionMaintenance.

/** Macro de presentación ROM (Bank30:$5D00 — §174: comportamiento, no recurso). */
export interface RomMacroCue {
  type: 'MACRO';
  tick: number;
  /** ID de macro ROM ($19/$1A/$27/$28). */
  macroId: number;
  side?: BattleSide;
}

/** Carga de escena ACTION (VRAM $8E00 — §180-182). */
export interface RomSceneLoadCue {
  type: 'SCENE_LOAD';
  tick: number;
  /** VRAM load asociado. */
  vramLoad: string;
  mode: 'TACTICAL_TO_ACTION' | 'ACTION_READY' | 'RESTORE_TACTICAL';
}

/** Interpolación de paletas CGB ($07F4/$080C — §179). */
export interface RomPaletteTransitionCue {
  type: 'PALETTE_TRANSITION';
  tick: number;
  durationTicks: number;
  sourcePalette: number;
  targetPalette: number;
}

/** Movimiento de fighter gobernado por ticks GBC (CHARA exit/entry — §176-178). */
export interface RomFighterMotionCue {
  type: 'FIGHTER_MOTION';
  tick: number;
  durationTicks: number;
  side: BattleSide;
  kind: 'CHARA_EXIT' | 'CHARA_ENTRY' | 'RUSH' | 'BEAM_SETUP';
  deltaPx: number;
  holdTicks: number;
  /** Segmentos ROM discretos; no colapsar a lerp/easing. */
  segments?: { dxPerTick: number; dyPerTick: number; ticks: number }[];
}

/** FX de Support (§185-186) — presentation separada del efecto. */
export interface RomSupportFxCue {
  type: 'SUPPORT_FX';
  tick: number;
  durationTicks: number;
  side: BattleSide;
  workerFamily: string;
  palette: number | null;
}

/** FX de Defense (§192) — presentation consume el resultado, no reinterpreta CA83. */
export interface RomDefenseFxCue {
  type: 'DEFENSE_FX';
  tick: number;
  durationTicks: number;
  side: BattleSide;
  result: 'AVOIDED' | 'NULLIFIED' | 'ATTENUATED' | 'ABSORBED' | 'COMMAND_CANCELLED';
}

// ── ROM V6 — Support card-indexed visual (Bank00:$2C30 -> banks $6B+) ──
// Trazabilidad del loader card-indexed de Support. Sin autoridad de gameplay:
// describe la carga del descriptor físico ($2C30), el ensamblaje BG ($19/$1A)
// y la macro literal usada por el worker. Ver docs/rom/research-v6-support-physicals.

/** Carga del visual card-indexed de Support (Bank00:$2C30). */
export interface RomSupportVisualLoadCue {
  type: 'SUPPORT_VISUAL_LOAD';
  tick: number;
  /** Banco del loader ($6B + floor(cardId/$20)). */
  loaderBank: number;
  /** Índice local (cardId % $20). */
  localIndex: number;
  /** Dirección del descriptor físico ($4000 + word*4). */
  descriptorAddress: number;
  /** Tiles 2bpp del payload (30 para las 48 Support). */
  tileCount: number;
}

/** Ensamblaje de un BG auxiliar ROM ($19 Support / $1A CHARA+Gather). */
export interface RomBgAssemblyCue {
  type: 'BG_ASSEMBLY';
  tick: number;
  resource: 0x19 | 0x1a;
  rows: number;
  cols: number;
  bgRowStart: number;
  bgCol: number;
  paletteSlot: number;
  /** V5: las 7 iteraciones ensamblan UN solo gráfico BG; no son 7 frames. */
  note: 'SINGLE_BG_GRAPHIC';
}

/** Invocación de macro literal de Support con contexto de worker (V6.4). */
export interface RomSupportMacroCue {
  type: 'SUPPORT_MACRO';
  tick: number;
  macroId: number;
  macroHex: string;
  workerFamily: string;
  /** Programa literal completo (ROM_VERIFIED); semántica humana solo si se demuestra. */
  literalProgramStatus: 'COMPLETE_ROM_VERIFIED';
  semanticStatus: 'UNRESOLVED' | 'RESOLVED';
}

// ── ROM V7 — display consumption (V7.1/V7.5) ──
// Primitivas de display que el Presenter puede ejecutar sin conocer ROM.

/** Componer el visual card-indexed en el BG (V7.1: secuencias $5A68+ -> $9800). */
export interface RomDisplayComposeCue {
  type: 'DISPLAY_COMPOSE';
  tick: number;
  /** Familias con composición demostrada; null = pendiente de evidencia. */
  composeEvidence: 'ROM_STATIC_VERIFIED' | 'ROM_PARTIAL';
  note?: string;
}

/** Limpiar el área BG del visual (V7.1: jobs $C459+, flags $C45C/$C45D). */
export interface RomDisplayClearCue {
  type: 'DISPLAY_CLEAR';
  tick: number;
  evidence: 'ROM_STATIC_VERIFIED' | 'ROM_PARTIAL';
}

/** Carga de palette del visual card-indexed ($36CA -> Bank30:$6E00+idx*8). */
export interface RomPaletteLoadCue {
  type: 'PALETTE_LOAD';
  tick: number;
  paletteIndex: number;
  /** $FF se conserva como índice físico; nunca NONE. */
  paletteIsPhysical: boolean;
}

// ── ROM LOTE 7 (§236) — cues de la VM STANDARD_ATTACK. Igual que los del
// Lote 6: trazabilidad de la gramática ROM, NUNCA autoridad de gameplay.

/** Iniciar/configurar animación (opcode $01). */
export interface RomAnimationStartCue {
  type: 'ANIMATION_START';
  tick: number;
  slot: 0 | 1;
  resource: number | null;
}

/** Binding de producción frame-a-frame decidido por ProductionFrameResolver. */
export interface RomPhysicalFrameCue {
  type: 'ROM_PHYSICAL_FRAME';
  tick: number;
  slot: 0 | 1;
  formId: string;
  resource: number;
  sequence: number;
  frameIndex: number;
  source: 'ROM_PHYSICAL' | 'CANONICAL_PHYSICAL' | 'MANIFEST_FALLBACK' | 'UNRESOLVED';
  physicalId: string | null;
  frameInstanceId: string | null;
  file: string | null;
  durationTicks: number | null;
  offsetX: number | null;
  offsetY: number | null;
  rawOffsetX: number | null;
  rawOffsetY: number | null;
  visualFrameId: number | null;
  evidence: string[];
  fallbackReason: string | null;
}

/** Cambiar estado animado (opcode $04). */
export interface RomAnimationStateCue {
  type: 'ANIMATION_STATE';
  tick: number;
  slot: 0 | 1;
  variant: number;
}

/** Esperar fin/marcador (opcode $05) — ticks de presentation, no timers. */
export interface RomWaitAnimationCue {
  type: 'WAIT_ANIMATION';
  tick: number;
  durationTicks: number;
  slot: 0 | 1;
}

/** Esperar frame/índice concreto (opcode $06) — p. ej. release frame 4. */
export interface RomWaitAnimationFrameCue {
  type: 'WAIT_ANIMATION_FRAME';
  tick: number;
  slot: 0 | 1;
  frame: number;
}

/** Fijar coordenadas absolutas del ActionObject (opcode $0A). */
export interface RomActionObjectPositionCue {
  type: 'ACTION_OBJECT_POSITION';
  tick: number;
  slot: 0 | 1;
  x: number | null;
  y: number | null;
}

/** Movimiento del ActionObject durante N ticks (opcode $0B). */
export interface RomActionObjectMotionCue {
  type: 'ACTION_OBJECT_MOTION';
  tick: number;
  durationTicks: number;
  slot: 0 | 1;
  dxPerTick: number;
  dyPerTick: number;
}

/** Aplicar ΔX/ΔY del frame actual al actor (opcode $10). */
export interface RomApplyFrameDeltaCue {
  type: 'APPLY_FRAME_DELTA';
  tick: number;
  slot: 0 | 1;
}

/** Cargar/activar FX (opcode $0C). */
export interface RomFxLoadCue {
  type: 'FX_LOAD';
  tick: number;
  durationTicks: number;
  resource: number | null;
  palette?: number | null;
}

/** FX auxiliar (opcode $12). */
export interface RomFxAuxCue {
  type: 'FX_AUX';
  tick: number;
  durationTicks: number;
}

/** Configurar escena/pantalla (opcode $0D). */
export interface RomSceneConfigureCue {
  type: 'SCENE_CONFIGURE';
  tick: number;
  durationTicks: number;
}

/** Desplazamiento progresivo de pantalla (opcode $0E). */
export interface RomScreenMotionCue {
  type: 'SCREEN_MOTION';
  tick: number;
  durationTicks: number;
  dxPerTick: number;
  restore: boolean;
}

/** Restaurar pantalla (opcode $0F). */
export interface RomScreenRestoreCue {
  type: 'SCREEN_RESTORE';
  tick: number;
}

/** Ejecutar path de pantalla (opcode $11). */
export interface RomScreenPathCue {
  type: 'SCREEN_PATH';
  tick: number;
  durationTicks: number;
  pathId: number | null;
}

/** SFX directo (opcode $13). */
export interface RomSfxCue {
  type: 'ROM_SFX';
  tick: number;
  sfxId: number;
}

/** Script de audio/triggers (opcode $14). */
export interface RomAudioScriptCue {
  type: 'ROM_AUDIO_SCRIPT';
  tick: number;
  scriptId: number | null;
}

/** Invocación de macro ROM (Bank30:$5D00) — el nivel literal. */
export interface RomMacroInvokeCue {
  type: 'ROM_MACRO';
  tick: number;
  macroId: number;
}

/** Espera literal de la VM ROM. No implica pose ni animacion semantica. */
export interface RomWaitCue {
  type: 'ROM_WAIT';
  tick: number;
  durationTicks: number;
  reason: string;
}

/** Rama de resultado declarada por evidencia ROM; no evalua gameplay. */
export interface RomResultBranchCue {
  type: 'ROM_RESULT_BRANCH';
  tick: number;
  family: string;
  /** Resultado real seleccionado desde BattleEventLog; null si aún no se conoce. */
  selectedFamily?: string | null;
  /** Evento autoritativo usado para seleccionar la rama. */
  selectedSourceEvent?: string | null;
  selectedMacroId?: number | null;
  selectedMacroHex?: string | null;
  branches: {
    family: string;
    condition: string;
    macroId: number | null;
    macroHex: string | null;
  }[];
}

/** Hueco explicito: compilable, pero no inventado. */
export interface RomPendingCue {
  type: 'ROM_PENDING';
  tick: number;
  reason: string;
  boundary: 'STATIC' | 'DYNAMIC';
}

// ── ROM LOTE 8 (§272) — ActionObject core. Sin autoridad de gameplay. ──

/** Asignación temporal de un slot (§246-247). */
export interface RomActionObjectBindCue {
  type: 'ACTION_OBJECT_BIND';
  tick: number;
  slot: 0 | 1;
  role: 'ACTOR' | 'TARGET' | 'ACTOR_PRIMARY' | 'ACTOR_SUPPORT' | 'FX_PARTICIPANT';
  fighterSide?: 'PLAYER' | 'ENEMY';
}

/** Liberación de un slot. */
export interface RomActionObjectUnbindCue {
  type: 'ACTION_OBJECT_UNBIND';
  tick: number;
  slot: 0 | 1;
}

/** Orden de dibujo ($CA39 == 2 — §264). */
export interface RomActionObjectDrawOrderCue {
  type: 'ACTION_OBJECT_DRAW_ORDER';
  tick: number;
  order: 'SLOT_0_THEN_1' | 'SLOT_1_THEN_0';
}

/** Frame actual del animador (visualId + durationTicks). */
export interface RomActionObjectFrameCue {
  type: 'ACTION_OBJECT_FRAME';
  tick: number;
  slot: 0 | 1;
  frameIndex: number;
  durationTicks: number;
  visualFrameId: number | null;
}

/** Offset del frame (§253-254) — no confundir con motion ni posición táctica. */
export interface RomActionObjectFrameOffsetCue {
  type: 'ACTION_OBJECT_FRAME_OFFSET';
  tick: number;
  slot: 0 | 1;
  offsetX: number;
  offsetY: number;
}

/** Stop/reset del animador (opcode $08 — §255). */
export interface RomActionObjectStopCue {
  type: 'ACTION_OBJECT_STOP';
  tick: number;
  slot: 0 | 1;
}

/** Sincronización multi-actor ($0D/$0E — §262). */
export interface RomMultiActorSyncCue {
  type: 'MULTI_ACTOR_SYNC';
  tick: number;
  variant: 'PURPLE_COMET' | 'PURPLE_COMET_Z';
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
  | AudioCue
  // ROM LOTE 6
  | RomMacroCue
  | RomSceneLoadCue
  | RomPaletteTransitionCue
  | RomFighterMotionCue
  | RomSupportFxCue
  | RomDefenseFxCue
  // ROM V6 — Support card-indexed visual
  | RomSupportVisualLoadCue
  | RomBgAssemblyCue
  | RomSupportMacroCue
  // ROM V7 — display consumption
  | RomDisplayComposeCue
  | RomDisplayClearCue
  | RomPaletteLoadCue
  // ROM LOTE 7 (§236)
  | RomAnimationStartCue
  | RomPhysicalFrameCue
  | RomAnimationStateCue
  | RomWaitAnimationCue
  | RomWaitAnimationFrameCue
  | RomActionObjectPositionCue
  | RomActionObjectMotionCue
  | RomApplyFrameDeltaCue
  | RomFxLoadCue
  | RomFxAuxCue
  | RomSceneConfigureCue
  | RomScreenMotionCue
  | RomScreenRestoreCue
  | RomScreenPathCue
  | RomSfxCue
  | RomAudioScriptCue
  | RomMacroInvokeCue
  | RomWaitCue
  | RomResultBranchCue
  | RomPendingCue
  // ROM LOTE 8 (§272)
  | RomActionObjectBindCue
  | RomActionObjectUnbindCue
  | RomActionObjectDrawOrderCue
  | RomActionObjectFrameCue
  | RomActionObjectFrameOffsetCue
  | RomActionObjectStopCue
  | RomMultiActorSyncCue;

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
  /** Provenance del camino ROM-backed. No implica anchors/coordenadas ROM. */
  romSource?: {
    kind: 'ROM_PRESENTATION';
    cardId: number;
    handler: number;
    profileFamily: string;
    staticCompletion: string;
    dynamicPending: boolean;
    pendingCues: number;
  };
}

export interface BattleTimeline {
  startTick: number;
  endTick: number;
  /** Ordenado por tick de presentación (estable: mismo input → mismo orden). */
  entries: TimelineEntry[];
}
