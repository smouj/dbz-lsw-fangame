// ═══════════════════════════════════════════════════════════════════════
// P7 ROM RE — RomActionObject SSOT (ActionObject: anchors / binding / visibility)
// ═══════════════════════════════════════════════════════════════════════
// Fuente: RE pasada (2026-08-29) sobre ROM canónica España/USA. Todo aquí es
// dato ROM estático leído directamente — no hay semántica inventada.
//
// El ActionObject es el "participante físico" de una acción. NO es player vs
// enemy: es un par físico reutilizable cuyo significado lógico depende del
// binder de contexto.
//
// Piezas cerradas en esta pasada:
//   1. Tabla de anchors físicos      — Bank7E:$5A68 (consumer $597E, wrapper $3764)
//   2. Layout de memoria del objeto  — $C3C8/$C3C9 (baseY/baseX por slot)
//   3. Opcode $0A = SET_OBJECT_POSITION [slot, baseY, baseX]  (NO [slot,x,y])
//   4. Binding lógico→físico         — CA59/CA5A + $7318/$3F05
//   5. Visibilidad                   — ActionObject+0 & $80 ; $08 → $0938 (+0=0)
//   6. Conversión de coordenadas     — GBC→Pixi (×2), con wrap modular 8-bit
// ═══════════════════════════════════════════════════════════════════════

// ── Evidencia ──

export type ActionObjectEvidence =
  | 'ROM_STATIC_VERIFIED' // tabla/constante leída directamente de la ROM
  | 'ROM_DERIVED';        // derivación matemática sobre dato ROM verificado

// ── Grupos de anchor ──

export type AnchorGroupId = 'ANCHOR_GROUP_0' | 'ANCHOR_GROUP_1' | 'ANCHOR_GROUP_2' | 'ANCHOR_GROUP_3_OFFSCREEN';
export type AnchorGroupSemantic = 'CENTER' | 'INNER_ACTION' | 'UNUSED_RESERVED' | 'OFFSCREEN_ENTRY';

/** Coordenada física ROM de un anchor (raw, pre-conversión). */
export interface RawAnchorPoint {
  /** Y física ROM (rawY). */
  rawY: number;
  /** X física ROM (rawX). */
  rawX: number;
}

/** Tabla de anchors físicos de la ACTION scene (Bank7E:$5A68). */
export interface ActionAnchorGroup {
  id: AnchorGroupId;
  semantic: AnchorGroupSemantic;
  /** Whether any Bank00:$3764 → Bank7E:$597E callsite uses this group. */
  consumed: boolean;
  /** lado A (participante 1) y lado B (participante 2). */
  sideA: RawAnchorPoint;
  sideB: RawAnchorPoint;
  /** Evidencia de la lectura. */
  evidence: ActionObjectEvidence;
  /** Referencia ROM. */
  source: string;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. TABLA DE ANCHORS — Bank7E:$5A68
//    consumer: Bank7E:$597E · wrapper: Bank00:$3764
// ═══════════════════════════════════════════════════════════════════════

export const ACTION_ANCHOR_TABLE: ActionAnchorGroup[] = [
  { id: 'ANCHOR_GROUP_0',           semantic: 'CENTER',          consumed: true,  sideA: { rawY: 96, rawX: 88  }, sideB: { rawY: 96, rawX: 88  }, evidence: 'ROM_STATIC_VERIFIED', source: 'Bank7E:$5A68 group 0 — CENTER / SOLO_CENTER; used by common Support worker and a defensive route.' },
  { id: 'ANCHOR_GROUP_1',           semantic: 'INNER_ACTION',    consumed: true,  sideA: { rawY: 96, rawX: 71  }, sideB: { rawY: 96, rawX: 105 }, evidence: 'ROM_STATIC_VERIFIED', source: 'Bank7E:$5A68 group 1 — INNER_ACTION; used by Purple Comet/Z, support-on-second-participant, action resolution, defense/reaction.' },
  { id: 'ANCHOR_GROUP_2',           semantic: 'UNUSED_RESERVED', consumed: false, sideA: { rawY: 96, rawX: 43  }, sideB: { rawY: 96, rawX: 133 }, evidence: 'ROM_STATIC_VERIFIED', source: 'Bank7E:$5A68 group 2 — no Bank00:$3764 → Bank7E:$597E consumer in USA/Spain/reskin.' },
  { id: 'ANCHOR_GROUP_3_OFFSCREEN', semantic: 'OFFSCREEN_ENTRY', consumed: true,  sideA: { rawY: 96, rawX: 233 }, sideB: { rawY: 96, rawX: 198 }, evidence: 'ROM_STATIC_VERIFIED', source: 'Bank7E:$5A68 group 3 — OFFSCREEN_ENTRY; used for attacker entry, Stage, STANDARD_DAMAGE before ROM movement.' },
] as const;

export const ACTION_ANCHOR_CALLSITE_GROUPS = [3, 3, 0, 1, 1, 1, 3, 3, 1, 1, 0, 1] as const;

/** Consumer de la tabla de anchors. */
export const ACTION_ANCHOR_TABLE_CONSUMER = 'Bank7E:$597E';
/** Wrapper externo de la tabla. */
export const ACTION_ANCHOR_TABLE_WRAPPER = 'Bank00:$3764';
/** Resolución: logical slot + participant side (CA59/CA5A) + anchor group → physical Y/X. */
export const ACTION_ANCHOR_RESOLVER = 'Bank7E:$597E: logical slot + participant side (CA59/CA5A) + anchor group → physical Y/X';

// ═══════════════════════════════════════════════════════════════════════
// 2. LAYOUT DE MEMORIA DEL ActionObject
// ═══════════════════════════════════════════════════════════════════════

export interface ActionObjectField {
  name: string;
  /** Byte offset dentro del record de un ActionObject (record = 2*i stride). */
  offset: number;
  description: string;
  evidence: ActionObjectEvidence;
}

/** Physical ActionObject state records. Position base is outside these records. */
export const ACTION_OBJECT_MEMORY = {
  object0: { start: 0xc3a0, end: 0xc3b2, sizeBytes: 0x13 },
  object1: { start: 0xc3b3, end: 0xc3c5, sizeBytes: 0x13 },
  contextSlot: 0xc3c6,
  pointOrFrameIndex: 0xc3c7,
  /** Base-position array lives outside ActionObject state records. */
  basePositionAddress: 0xc3c8,
  basePositionStrideBytes: 2,
  /** Campo baseY (byte 0 del record, $C3C8 + 2*i). */
  baseY: { offset: 0, address: 0xc3c8, description: 'Y física del objeto (rawY)' },
  /** Campo baseX (byte 1 del record, $C3C9 + 2*i). */
  baseX: { offset: 1, address: 0xc3c9, description: 'X física del objeto (rawX)' },
} as const;

export const ACTION_OBJECT_BASE_POSITION = {
  object0: { baseY: 0xc3c8, baseX: 0xc3c9 },
  object1: { baseY: 0xc3ca, baseX: 0xc3cb },
  setRoutine: 0x0943,
  addRoutine: 0x0955,
  setSemantics: 'Bank00:$0943 selects physical object via C3C6 and writes baseY=E, baseX=D',
  addSemantics: 'Bank00:$0955 selects physical object via C3C6 and applies baseY += E, baseX += D',
  positionModel: 'rendered OAM position = canonical base position + current animation frame offset, except when opcode $10 commits frame delta into base position',
  evidence: 'ROM_STATIC_VERIFIED',
} as const;

export interface RomActionObjectPosition {
  baseX: number;
  baseY: number;
  frameOffsetX: number;
  frameOffsetY: number;
}

/** Opcode cinematográfico $0A: SET_OBJECT_POSITION [slot, baseY, baseX]. */
export const SET_OBJECT_POSITION_OPCODE = {
  byte: 0x0a,
  name: 'SET_OBJECT_POSITION',
  /** Orden de operandos: [slot, baseY, baseX] — NO [slot, x, y]. */
  operandOrder: ['slot', 'baseY', 'baseX'],
  evidence: 'ROM_STATIC_VERIFIED',
  source: 'RE pasada: opcode $0A = SET_OBJECT_POSITION [slot, baseY, baseX]',
} as const;

export type PresentationVmOpcodeDomain = 'object' | 'wait' | 'screen' | 'audio' | 'card';

export interface PresentationVmOpcodeSemantic {
  opcode: number;
  name: string;
  domain: PresentationVmOpcodeDomain;
  /** True only when the opcode writes or commits ActionObject body position. */
  mutatesFighterPosition: boolean;
  evidence: ActionObjectEvidence;
}

export const PRESENTATION_VM_OPCODE_SEMANTICS: readonly PresentationVmOpcodeSemantic[] = [
  { opcode: 0x01, name: 'START_ACTION_OBJECT', domain: 'object', mutatesFighterPosition: false, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x04, name: 'START_ANIMATION_FROM_SLOT', domain: 'object', mutatesFighterPosition: false, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x05, name: 'WAIT_ANIMATION_COMPLETE', domain: 'wait', mutatesFighterPosition: false, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x06, name: 'WAIT_FRAME', domain: 'wait', mutatesFighterPosition: false, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x07, name: 'WAIT_TICKS', domain: 'wait', mutatesFighterPosition: false, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x08, name: 'STOP_HIDE_OBJECT', domain: 'object', mutatesFighterPosition: false, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x0a, name: 'SET_OBJECT_POSITION', domain: 'object', mutatesFighterPosition: true, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x0b, name: 'OBJECT_MOTION', domain: 'object', mutatesFighterPosition: true, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x0d, name: 'SCREEN_DISPLAY_COORD_SETUP', domain: 'screen', mutatesFighterPosition: false, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x0e, name: 'SCREEN_MOTION', domain: 'screen', mutatesFighterPosition: false, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x0f, name: 'SCREEN_RESTORE', domain: 'screen', mutatesFighterPosition: false, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x10, name: 'APPLY_FRAME_DELTA', domain: 'object', mutatesFighterPosition: true, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x11, name: 'SCREEN_PATH', domain: 'screen', mutatesFighterPosition: false, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x13, name: 'SFX', domain: 'audio', mutatesFighterPosition: false, evidence: 'ROM_STATIC_VERIFIED' },
  { opcode: 0x14, name: 'CARD_PRESENTATION_AUDIO_SCRIPT', domain: 'card', mutatesFighterPosition: false, evidence: 'ROM_STATIC_VERIFIED' },
] as const;

export function presentationVmOpcodeByByte(opcode: number): PresentationVmOpcodeSemantic | undefined {
  return PRESENTATION_VM_OPCODE_SEMANTICS.find(entry => entry.opcode === opcode);
}

// ═══════════════════════════════════════════════════════════════════════
// 3. BINDING lógico → físico
// ═══════════════════════════════════════════════════════════════════════
// slot0 NO significa player ni actor universal. El modelo correcto:
//
//   contexto ofensivo estándar (Bank1:$6708):
//     slot0 = physical(CA59 >> 1) = ACTOR/ATTACKER
//     slot1 = physical(CA5A >> 1) = TARGET/DEFENDER
//
//   contexto defensivo/reacción (Bank1:$6750):
//     slot0 = physical(CA5A >> 1) = DEFENDER
//     slot1 = physical(CA59 >> 1) = ATTACKER
//
//        ↓ CA59/CA5A intercambian 1/2 ↔ 2/1
//   physical ActionObject 0/1
//
// CA59/CA5A intercambian 1/2 ↔ 2/1 dependiendo de quién ejecuta; luego se
// enlazan con los ActionObjects físicos vía $7318/$3F05.
// ═══════════════════════════════════════════════════════════════════════

export type ActionObjectBindContext = 'OFFENSE' | 'DEFENSE_REACTION';

/**
 * B7B1 — instrucción de binding FÍSICA derivada del binder ROM.
 * No la decide quién ejecuta la carta: la decide el contexto ROM del film.
 */
export interface ActionObjectBindingInstruction {
  slot: 0 | 1;
  /** Semántica física del slot EN ESTE contexto. */
  semantic: 'ATTACKER' | 'DEFENDER';
  role: 'ACTOR' | 'TARGET';
  fighterSide: 'PLAYER' | 'ENEMY';
  /** Binder ROM de origen (bank:address). */
  binder: { bank: number; address: number };
}

/**
 * Binding de slots para un film, desde `ACTION_OBJECT_BINDING.binders`.
 *   OFFENSE          → slot0 = ATTACKER · slot1 = DEFENDER
 *   DEFENSE_REACTION → slot0 = DEFENDER · slot1 = ATTACKER
 */
export function actionObjectBindingInstructions(
  context: ActionObjectBindContext,
  sides: { attacker: 'player' | 'enemy'; defender: 'player' | 'enemy' },
): readonly [ActionObjectBindingInstruction, ActionObjectBindingInstruction] {
  const binder = ACTION_OBJECT_BINDING.binders.find(b => b.context === context);
  if (!binder) throw new Error(`B7B1: binder ROM desconocido: ${context}`);
  const at = { bank: binder.bank, address: binder.address };
  const attackerFirst = context === 'OFFENSE';
  const up = (s: 'player' | 'enemy'): 'PLAYER' | 'ENEMY' => (s === 'player' ? 'PLAYER' : 'ENEMY');
  return [
    {
      slot: 0,
      semantic: attackerFirst ? 'ATTACKER' : 'DEFENDER',
      role: attackerFirst ? 'ACTOR' : 'TARGET',
      fighterSide: up(attackerFirst ? sides.attacker : sides.defender),
      binder: at,
    },
    {
      slot: 1,
      semantic: attackerFirst ? 'DEFENDER' : 'ATTACKER',
      role: attackerFirst ? 'TARGET' : 'ACTOR',
      fighterSide: up(attackerFirst ? sides.defender : sides.attacker),
      binder: at,
    },
  ] as const;
}

/**
 * P0.4R-B7B4 — autoridad ROM del ORDEN DE PINTADO de ActionObjects.
 *
 * Precisión obligatoria: `$CA39 == 2` NO prueba `SLOT_0_THEN_1`. Leído aislado
 * probaría lo CONTRARIO (dibuja el objeto de índice 1 antes del 0). Lo que
 * prueba el orden es la ESTRUCTURA de la rama + la semántica de `$CA39`.
 *
 * Cadena ROM (bank_001:$4769 loop):
 *   escritores de $CA39 = los binder, y copian el registro del participante
 *   ligado al SLOT 0:
 *     Call_001_6708 (OFFENSE)          $CA39 ← $CA59
 *     Call_001_6750 (DEFENSE_REACTION) $CA39 ← $CA5A
 *   loop de pintado (bank_001:1399):
 *     C3C6=1 ; Call_000_0a01 ; Call_000_09da
 *     ld a,[$CA39] ; cp $02 ; jr z, jr_001_4769
 *     ≠2 → C3C6=0 → 0a60 ; C3C6=1 → 0a60      (objeto0, objeto1)
 *     =2 → C3C6=1 → 0a60 ; C3C6=0 → 0a60      (objeto1, objeto0)
 *   render por objeto: Call_000_0a60 → Call_000_0b07 (hl=$C3A0 + $13*índice)
 *     → `and $80` sobre ActionObject+0 → `ret z` si bit7 claro (no se dibuja)
 *
 * Como registro 1 → índice 0 y registro 2 → índice 1 (`>>1`), la rama mantiene
 * SIEMPRE el objeto de slot0 primero:
 *   CA39==1 (slot0→índice0) → dibuja 0,1
 *   CA39==2 (slot0→índice1) → dibuja 1,0
 * → el orden pertenece a los SLOTS físicos, no a player/enemy ni a attacker/defender.
 */
export const ACTION_OBJECT_DRAW_ORDER_AUTHORITY = {
  /** Registro de participante ligado al slot0 (selector de la rama). */
  selectorRegister: 0xca39,
  selectorWriters: [
    { symbol: 'Call_001_6708', context: 'OFFENSE', copies: 0xca59 },
    { symbol: 'Call_001_6750', context: 'DEFENSE_REACTION', copies: 0xca5a },
  ] as const,
  /** Loop de pintado: elige el orden de índice de objeto según el selector. */
  orderSite: { bank: 1, address: 0x4769, note: 'ld a,[$CA39] ; cp $02 ; jr z, jr_001_4769' },
  /** Render de UN objeto: comprueba bit7 de ActionObject+0 (ret z si claro). */
  objectRenderer: { symbol: 'Call_000_0a60', checks: 'ActionObject+0 & $80' },
  /** Resolutor de puntero: $C3A0 + $13 * índice de objeto. */
  objectPointer: { symbol: 'Call_000_0b07', base: 0xc3a0, stride: 0x13 },
  /** Conclusión demostrada. */
  conclusion:
    'la ROM pinta SIEMPRE el ActionObject del slot0 antes que el del slot1; la rama sobre $CA39 existe para conservar slot0-primero cuando el índice físico alterna',
  /** Lo que `$CA39 == 2` NO prueba por sí solo. */
  notProven: 'CA39 == 2 aislado NO demuestra SLOT_0_THEN_1: selecciona el orden de índice para que slot0 quede primero',
  evidence: 'ROM_STATIC_VERIFIED',
  source: 'bank_001:$4769 (loop) + Call_000_0a60/Call_000_0b07 (render) + Call_001_6708/Call_001_6750 (escritores de $CA39)',
} as const;

export const ACTION_OBJECT_BINDING = {
  /** Logical slot storage: $7318 stores logical slot0 → C7D5, slot1 → C7D6. */
  logicalSlotStore: [0xc7d5, 0xc7d6] as const,
  /** Logical→physical writer Bank7E:$7318: slot0 → C7D5, slot1 → C7D6. */
  logicalWriter: 0x7318,
  /** Wrapper Bank00:$3F05: slot0 → C7D5 → C3C6, slot1 → C7D6 → C3C6. */
  wrapper: 0x3f05,
  /** Physical index registers (participant side). 1>>1=ActionObject0, 2>>1=ActionObject1. */
  participantRegisters: [0xca59, 0xca5a] as const,
  /** Bank1 binders: $6708 slot0=CA59>>1 slot1=CA5A>>1 · $6750 slot0=CA5A>>1 slot1=CA59>>1. */
  binders: [
    { bank: 1, address: 0x6708, context: 'OFFENSE', slot0Source: 0xca59, slot1Source: 0xca5a, slot0Semantic: 'ACTOR_ATTACKER', slot1Semantic: 'TARGET_DEFENDER' },
    { bank: 1, address: 0x6750, context: 'DEFENSE_REACTION', slot0Source: 0xca5a, slot1Source: 0xca59, slot0Semantic: 'DEFENDER', slot1Semantic: 'ATTACKER' },
  ] as const,
  /** CA59/CA5A init alternately (1,2) or (2,1) depending on action branch. */
  initAlternating: [[1, 2], [2, 1]] as const,
  /** Shift: participant register >> 1 → physical ActionObject index. */
  participantShift: 1,
  /** Conclusion: logical slot0 ≠ ActionObject0 ≠ player; actor/target depends on binder/context. */
  conclusion: 'logical slot0 is NOT permanently ActionObject0 or player; OFFENSE slot0=actor, DEFENSE/REACTION slot0=defender',
  evidence: 'ROM_STATIC_VERIFIED',
  source: 'RE pasada: $7318/$3F05 + Bank1:$6708/$6750 (>>1) + CA59/CA5A alternating init',
} as const;

export const ACTION_OBJECT_FRAME_DELTA_COMMIT = {
  opcode: 0x10,
  name: 'APPLY_FRAME_DELTA',
  mechanism: 'logical slot → physical ActionObject → current animation frame ΔX/ΔY → commit to ActionObject position state',
  geometry: 'final position = base anchor + ROM movement + current physical frame delta',
  note: 'HIT/MISS final geometry does not require a hidden contact point; the remaining pixels near group1 are explained by frame deltas.',
  evidence: 'ROM_STATIC_VERIFIED',
} as const;

export const ACTION_ANCHOR_RUSH_RELATION = {
  from: 'ANCHOR_GROUP_3_OFFSCREEN',
  toward: 'ANCHOR_GROUP_1',
  rushDeltaPx: 98,
  sideA: { startRawX: 233, endAfterRushMod256: 75, group1RawX: 71, residualPx: 4 },
  sideB: { startRawX: 198, endAfterRush: 100, group1RawX: 105, residualPx: -5 },
  residualExplainedBy: 'APPLY_FRAME_DELTA opcode $10 current-frame ΔX/ΔY',
  semanticStatus: 'GROUP_1 = INNER_ACTION with strong contact-near evidence but not named CONTACT_POINT; GROUP_2 = UNUSED_RESERVED (no consumer in USA/Spain/reskin).',
  evidence: 'ROM_DERIVED',
} as const;

// ═══════════════════════════════════════════════════════════════════════
// 4. VISIBILIDAD
// ═══════════════════════════════════════════════════════════════════════
// El renderer de objetos comprueba ActionObject+0 & $80: sin ese bit no dibuja.
// Opcode $08 → $0938 hace ActionObject+0 = 0 (HIDE). Init típica: $80 / $A0
// (ambos visibles). macro $20 = { WAIT 10; HIDE slot0 }.
// ═══════════════════════════════════════════════════════════════════════

export const ACTION_OBJECT_VISIBILITY = {
  /** Bit que el renderer comprueba para dibujar (ActionObject+0 & $80). */
  visibleBit: 0x80,
  /** Opcode $08 → rutina $0938 → ActionObject+0 = 0 (HIDE). */
  hideOpcode: 0x08,
  hideRoutine: 0x0938,
  /** Valores de init típicos (ambos visibles). */
  initVisibleValues: [0x80, 0xa0] as const,
  /** macro $20 ejemplo: 07 0A 00 00 00 (WAIT 10) + 08 00 00 00 00 (HIDE slot0). */
  macro20Example: '07 0A 00 00 00 · 08 00 00 00 00',
  evidence: 'ROM_STATIC_VERIFIED',
  source: 'RE pasada: renderer comprueba +0 & $80; $08 → $0938',
} as const;

// ═══════════════════════════════════════════════════════════════════════
// 5. CONVERSIÓN DE COORDENADAS GBC → Pixi
// ═══════════════════════════════════════════════════════════════════════
// El fondo ACTION pasa de 160×80 (GBC) a 320×160 (Pixi) → escala ×2. La
// escena Pixi aplica esa conversión en el contenedor; sus hijos son nativos.
//   GBC visible X = rawX - 8
//   GBC visible Y = rawY - 16
//   pixiX = 2 * (rawX - 8)
//   pixiY = 2 * (rawY - 16)
//
// ⚠ OFFSCREEN NO debe convertirse tratando 0xE9 como entero negativo: el
// movimiento horizontal usa aritmética de 8 bits modular (wrap 255→0).
// ═══════════════════════════════════════════════════════════════════════

/** Offsets de origen del sistema de coordenadas GBC visible. */
export const GBC_VISIBLE_ORIGIN = { x: 8, y: 16 } as const;
/** Escala del plano ACTION (GBC 160×80 → Pixi 320×160). */
export const ACTION_SCENE_SCALE = 2;

/** Convierte una raw X GBC a Pixi (aplicando escala ×2). */
export function gbcRawXToPixi(rawX: number): number {
  return ACTION_SCENE_SCALE * (rawX - GBC_VISIBLE_ORIGIN.x);
}

/** Convierte una raw Y GBC a Pixi (aplicando escala ×2). */
export function gbcRawYToPixi(rawY: number): number {
  return ACTION_SCENE_SCALE * (rawY - GBC_VISIBLE_ORIGIN.y);
}

/** Anchors en espacio Pixi (derivados de la tabla ROM). */
export function pixiAnchors(): Record<AnchorGroupId, { sideA: { x: number; y: number }; sideB: { x: number; y: number } }> {
  const out = {} as Record<AnchorGroupId, { sideA: { x: number; y: number }; sideB: { x: number; y: number } }>;
  for (const g of ACTION_ANCHOR_TABLE) {
    out[g.id] = {
      sideA: { x: gbcRawXToPixi(g.sideA.rawX), y: gbcRawYToPixi(g.sideA.rawY) },
      sideB: { x: gbcRawXToPixi(g.sideB.rawX), y: gbcRawYToPixi(g.sideB.rawY) },
    };
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════

export function anchorGroupById(id: AnchorGroupId): ActionAnchorGroup | undefined {
  return ACTION_ANCHOR_TABLE.find(g => g.id === id);
}

export function actionObjectEvidenceSummary(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const g of ACTION_ANCHOR_TABLE) {
    counts[g.evidence] = (counts[g.evidence] || 0) + 1;
  }
  return counts;
}
