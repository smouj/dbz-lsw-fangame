// ═══════════════════════════════════════════════════════════════════════
// ROM LOTE 9 (§277-310) — trace-schema: contrato de traza dinámica.
// Fuente: docs/rom/COMBAT_MECHANICS_ROM_CONFIRMED.md §277–310.
//
// REGLAS:
// - Un trace es una ejecución REPRODUCIBLE (no un log suelto).
// - Sin ROM SHA no puede promover datos canónicos (§278).
// - Los 19 bytes se guardan CRUDOS siempre (§281); el decoder vive encima.
// - Nada se promociona a ROM_DYNAMIC_VERIFIED sin traces reales (§302).
// - Esta infraestructura es dev/tooling ONLY: cero mutación de gameplay,
//   cero autoridad de Presentation, cero dependencia de producción (§308).
// ═══════════════════════════════════════════════════════════════════════

/** Niveles de evidencia (§277). */
export type RomEvidence =
  | 'ROM_STATIC_VERIFIED'
  | 'ROM_HANDLER_VERIFIED'
  | 'ROM_DYNAMIC_VERIFIED'
  | 'PENDING_ROM_TRACE';

/** Identidad de la ROM + herramienta que produjo el trace (§278). */
export interface RomTraceSource {
  romSha256: string;
  romSize: number;
  romLabel: string;
  emulator: string;
  emulatorVersion: string;
  traceToolVersion: string;
}

/** Metadata de una ejecución (§279). */
export interface RomTraceMeta {
  source: RomTraceSource;
  cardId?: number;
  subtype?: number;
  workerBank?: number;
  workerAddress?: number;
  attackerSide: 'LEFT' | 'RIGHT';
  attackerForm?: string;
  defenderForm?: string;
  initialTacticalPosition?: { attacker: number; defender: number };
  expectedOutcome?: string;
  firstFrame: number;
  lastFrame: number;
}

/** Los 19 bytes crudos de un ActionObject (§280-281). */
export interface RomActionObjectRaw {
  bytes: readonly [
    number, number, number, number, number,
    number, number, number, number, number,
    number, number, number, number, number,
    number, number, number, number,
  ];
}

/** Snapshot completo por tick (§280). */
export interface RomTraceFrame {
  frame: number;
  battle: {
    C0A0: number;
    CA01: number;
    CA02: number;
    CA03: number;
    CA04: number;
    CA06: number;
    CA7E: number;
    CB77: number;
  };
  actionObjects: [RomActionObjectRaw, RomActionObjectRaw];
  activeObject: number;
  drawState: number;
  /** $CA39 — rama de draw order (§264/§298). */
  drawOrderFlag?: number;
  display: { scx: number; scy: number; lcdc: number; stat: number };
}

/** Un trace = ejecución reproducible (§279). */
export interface RomActionTrace {
  meta: RomTraceMeta;
  frames: RomTraceFrame[];
}

/** ID determinista del trace (checksum reproducible, §301/§308). */
export function traceId(trace: RomActionTrace): string {
  const { romSha256, emulator, emulatorVersion, traceToolVersion } = trace.meta.source;
  const head = `${romSha256}|${emulator}|${emulatorVersion}|${traceToolVersion}`;
  const first = trace.frames[0]?.frame ?? -1;
  const last = trace.frames[trace.frames.length - 1]?.frame ?? -1;
  const frameCount = trace.frames.length;
  // Checksum simple y determinista sobre el contenido (no criptográfico —
  // suficiente para inmutabilidad del artefacto en repo).
  let h = 0;
  for (const ch of head) h = (h * 31 + ch.charCodeAt(0)) | 0;
  h = (h * 31 + first) | 0;
  h = (h * 31 + last) | 0;
  h = (h * 31 + frameCount) | 0;
  return `trace-${(h >>> 0).toString(16).padStart(8, '0')}`;
}

/** Valida las invariantes del formato (§308). */
export function validateTrace(trace: RomActionTrace): string[] {
  const issues: string[] = [];
  if (!trace.meta.source.romSha256 || trace.meta.source.romSha256.length !== 64) {
    issues.push('ROM SHA256 obligatorio (64 hex) — sin SHA no promueve datos');
  }
  if (!trace.meta.source.emulator || !trace.meta.source.emulatorVersion) {
    issues.push('emulator + version obligatorios');
  }
  const firstFrame = trace.frames[0];
  if (firstFrame) {
    for (const [i, obj] of firstFrame.actionObjects.entries()) {
      if (obj.bytes.length !== 19) issues.push(`actionObject[${i}] debe tener exactamente 19 bytes`);
    }
  } else {
    issues.push('trace vacío');
  }
  const monotonic = trace.frames.every((f, i) => i === 0 || f.frame > trace.frames[i - 1].frame);
  if (!monotonic) issues.push('frames deben ser estrictamente crecientes');
  return issues;
}

/** Contrato de direcciones (§280): slot0 = C3A0 · slot1 = C3B3. */
export const TRACE_ADDRESSES = {
  object0: 0xc3a0,
  object1: 0xc3b3,
  activeObject: 0xc3c6,
  drawState: 0xc3c7,
  drawOrderFlag: 0xca39,
  stateMachine: 0xca06,
} as const;

/** Puntos de captura por handler (§290-294) — identidad inequívoca. */
export const HANDLER_TRACE_TARGETS: Record<number, { cardId?: number; family: string }> = {
  0x08: { family: 'SPECIAL' }, // cardId NO demostrado — traceBySubtype(0x08)
  0x0b: { cardId: 29, family: 'TAIL' },
  0x0c: { family: 'BUU_BALL' }, // cardId NO demostrado
  0x0d: { cardId: 57, family: 'MULTI_ACTOR_SCRIPT' }, // PURPLE_COMET
  0x0e: { cardId: 58, family: 'MULTI_ACTOR_SCRIPT' }, // PURPLE_COMET_Z
};

/** Matriz mínima de outcomes por handler (§296). */
export const TRACE_OUTCOME_MATRIX = ['NORMAL_HIT', 'NORMAL_MISS'] as const;
export type TraceOutcome = (typeof TRACE_OUTCOME_MATRIX)[number] | 'SPECIAL_DEFENSE' | 'HIGH_POWER';

/** Transición de state machine OBSERVADA (§295). */
export interface RomStateTransition {
  tick: number;
  from: number;
  to: number;
  workerBank: number;
  workerAddress: number;
  object0Changed: boolean;
  object1Changed: boolean;
  displayChanged: boolean;
}

/** Binding observado (§297). */
export interface ActionObjectBindingTrace {
  tick: number;
  slot: 0 | 1;
  binding: 'PRIMARY' | 'SUPPORT' | 'TARGET' | 'UNKNOWN';
  evidence: RomEvidence;
}

/** Campo decodificado con evidencia (§282). */
export interface DecodedActionObjectField {
  offset: number;
  semantic:
    | 'ACTIVE' | 'ANIMATION_SET' | 'CLIP' | 'FRAME' | 'FRAME_ELAPSED'
    | 'BASE_X' | 'BASE_Y' | 'FLAGS' | 'UNKNOWN';
  confidence: 'CANDIDATE' | 'ROM_DYNAMIC_VERIFIED';
  evidenceTraceIds: string[];
}

/** Layout del record (§303) — aceptable parcial (12 conocidos + 7 UNKNOWN). */
export interface RomActionObjectLayout {
  size: 0x13;
  fields: {
    active?: number;
    animationSet?: number;
    clipId?: number;
    frameIndex?: number;
    frameElapsedTicks?: number;
    baseX?: number;
    baseY?: number;
    flags?: number;
  };
  unknownOffsets: number[];
  evidence: 'PARTIAL_ROM_DYNAMIC_VERIFIED' | 'ROM_DYNAMIC_VERIFIED';
}

/** Modelo de coordenadas (§286). */
export interface RomCoordinateModel {
  baseXOffset?: number;
  baseYOffset?: number;
  frameOffsetApplied: boolean | null;
  screenXDependency: 'NONE' | 'SCX' | 'UNKNOWN';
  screenYDependency: 'NONE' | 'SCY' | 'UNKNOWN';
  evidence: RomEvidence;
}

/** Anchor (§288) — solo con evidencia dinámica real. */
export interface RomActionAnchor {
  id: 'ACTOR_HOME' | 'TARGET_HOME' | 'CONTACT_POINT' | 'ACTOR_ENTRY' | 'TARGET_ENTRY';
  x: number;
  y: number;
  traces: string[];
  evidence: 'ROM_DYNAMIC_VERIFIED';
}
