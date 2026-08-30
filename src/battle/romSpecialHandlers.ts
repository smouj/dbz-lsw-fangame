// ═══════════════════════════════════════════════════════════════════════
// P7 ROM RE — RomSpecialHandlers SSOT (handlers antes "dinámicos" — ahora cerrados)
// ═══════════════════════════════════════════════════════════════════════
// Fuente: RE pasada (2026-08-29). Los cinco handlers que figuraban como cajas
// negras dinámicas dejan de serlo: su estructura es determinista y ya puede
// reconstruirse desde ROM (no mantener bajo el rótulo "handler dinámico").
//
// Nivel de evidencia: ROM_STATIC_VERIFIED (estructura leída directamente;
// la coreografía espacial exacta HIT/MISS sigue en PENDING_ROM_TRACE, pero
// las secuencias/waits/scroll/cleanup ya son conocidas).
// ═══════════════════════════════════════════════════════════════════════

export type SpecialHandlerEvidence = 'ROM_STATIC_VERIFIED' | 'ROM_DERIVED';

/** Un paso de secuencia (macro record) dentro de un handler. */
export interface SpecialHandlerMacroRecord {
  /** slot del ActionObject (0 = participante activo, 1 = contraparte). */
  slot: 0 | 1;
  /** secuencia de animación a cargar. */
  sequence: number;
  /** si es un WAIT (esperar a slot). */
  wait: boolean;
}

export interface SpecialHandlerMacro {
  /** Nombre del macro (p. ej. $3B). */
  name: string;
  /** Byte del macro. */
  byte: number;
  /** Records de la secuencia, en orden. */
  records: SpecialHandlerMacroRecord[];
}

export interface SpecialHandlerEntry {
  /** Resource/handler id (formId físico del ataque). */
  resourceId: number;
  name: string;
  /** Descripción de la estructura cerrada. */
  structure: string;
  /** Handler base al que delega (si aplica). */
  delegatesTo?: string;
  /** Bloque de lanzamiento (wait frame + scroll). */
  launch?: { waitFrame: number; scrollPerTick: number; scrollTicks: number };
  /** Recurso físico usado por el override de lanzamiento. */
  physicalAnimation?: {
    animationResource: number;
    sequence: number;
    frameInstances: number;
    physicalFrames: number;
    totalTicks: number;
  };
  /** Relación con STANDARD_ATTACK cuando sólo reemplaza un estado. */
  standardAttackOverride?: {
    overrideState: number;
    returnsToCommonWorker: boolean;
    setupResultCleanupShared: boolean;
  };
  /** Hold / restore de pantalla. */
  restoreScreen: boolean;
  holdTicks: number;
  /** ActionObjects activados (seq0/seq1 o seq2/seq3). */
  activatedObjects?: { sequences: [number, number]; waitSecondFrame?: number | null };
  /** Coordinación temporal de ActionObjects físicos. */
  ownership?: {
    partnerForm: 'attackerFormId XOR 1';
    secondaryObject: 'temporary target-object visual rebind';
    cleanup: 'hide object0/object1 and restore original target form graphics';
    note: string;
  };
  /** FSM (estados ROM) si aplica. */
  fsm?: string;
  /** Macros extraídos (V-ball Crash). */
  macros?: SpecialHandlerMacro[];
  evidence: SpecialHandlerEvidence;
  source: string;
}

// ═══════════════════════════════════════════════════════════════════════
// V-ball Crash $0C — macros corregidos por extracción directa
// ═══════════════════════════════════════════════════════════════════════

export const VBALL_CRASH_MACROS: SpecialHandlerMacro[] = [
  {
    name: '$3B',
    byte: 0x3b,
    records: [
      { slot: 1, sequence: 15, wait: false },
      { slot: 1, sequence: 0, wait: true },
      { slot: 0, sequence: 1, wait: false },
      { slot: 1, sequence: 16, wait: false },
      { slot: 0, sequence: 0, wait: true },
    ],
  },
  {
    name: '$3C',
    byte: 0x3c,
    records: [
      { slot: 0, sequence: 2, wait: false },
      { slot: 1, sequence: 17, wait: false },
      { slot: 1, sequence: 0, wait: true },
    ],
  },
  {
    name: '$3D',
    byte: 0x3d,
    records: [
      { slot: 0, sequence: 3, wait: false },
      { slot: 1, sequence: 18, wait: false },
      { slot: 0, sequence: 0, wait: true },
      { slot: 1, sequence: 19, wait: false },
      { slot: 1, sequence: 0, wait: true },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════

export const ROM_SPECIAL_HANDLERS: SpecialHandlerEntry[] = [
  {
    resourceId: 0x05,
    name: 'Rocket Punch',
    structure: 'STANDARD_ATTACK con override exclusivo de state $14; setup, resultado, ramas, cleanup y retorno vuelven al worker común.',
    delegatesTo: 'beam $02',
    launch: { waitFrame: 4, scrollPerTick: -6, scrollTicks: 19 },
    physicalAnimation: { animationResource: 0x1d, sequence: 0, frameInstances: 9, physicalFrames: 4, totalTicks: 82 },
    standardAttackOverride: { overrideState: 0x14, returnsToCommonWorker: true, setupResultCleanupShared: true },
    restoreScreen: true,
    holdTicks: 60,
    evidence: 'ROM_STATIC_VERIFIED',
    source: 'USA ROM static: Rocket Punch $05 overrides STANDARD_ATTACK state $14 with AnimationResource $1D seq0, wait frame 4, scroll -6×19, restore, hold 60.',
  },
  {
    resourceId: 0x06,
    name: 'Potbelly',
    structure: 'STANDARD_ATTACK con override exclusivo de state $14; setup, resultado, ramas, cleanup y retorno vuelven al worker común.',
    delegatesTo: 'beam $02',
    launch: { waitFrame: 7, scrollPerTick: -6, scrollTicks: 16 },
    physicalAnimation: { animationResource: 0x1f, sequence: 0, frameInstances: 12, physicalFrames: 6, totalTicks: 183 },
    standardAttackOverride: { overrideState: 0x14, returnsToCommonWorker: true, setupResultCleanupShared: true },
    restoreScreen: true,
    holdTicks: 60,
    evidence: 'ROM_STATIC_VERIFIED',
    source: 'USA ROM static: Potbelly $06 overrides STANDARD_ATTACK state $14 with AnimationResource $1F seq0, wait frame 7, scroll -6×16, restore, hold 60.',
  },
  {
    resourceId: 0x0d,
    name: 'Purple Comet',
    structure: 'Usa dos ActionObjects físicos (object0 seq0 / object1 seq1). El segundo objeto se re-bindea temporalmente del target al compañero vía attackerFormId XOR 1; espera frame $4B, FX + scroll, restaura y oculta ambos.',
    activatedObjects: { sequences: [0, 1], waitSecondFrame: 0x4b },
    ownership: {
      partnerForm: 'attackerFormId XOR 1',
      secondaryObject: 'temporary target-object visual rebind',
      cleanup: 'hide object0/object1 and restore original target form graphics',
      note: 'No third ActionObject. The target physical object is reused as the attacker partner (Jeice $1E ↔ Burter $1F) and then restored.',
    },
    launch: { waitFrame: 0x4b, scrollPerTick: -6, scrollTicks: 16 },
    restoreScreen: true,
    holdTicks: 0,
    evidence: 'ROM_STATIC_VERIFIED',
    source: 'RE pasada: Purple Comet $0D — seq0/seq1, wait frame $4B, FX + scroll -6×16, restore, hide ambos',
  },
  {
    resourceId: 0x0e,
    name: 'Purple Comet Z',
    structure: 'Usa dos ActionObjects físicos (object0 seq2 / object1 seq3) con el mismo rebind temporal del segundo objeto; espera fin de animación, WAIT 20, scroll, restore y cleanup.',
    activatedObjects: { sequences: [2, 3], waitSecondFrame: null },
    ownership: {
      partnerForm: 'attackerFormId XOR 1',
      secondaryObject: 'temporary target-object visual rebind',
      cleanup: 'hide object0/object1 and restore original target form graphics',
      note: 'Sequence ownership is physical-object based, not hardcoded as Jeice/Burter identity. Visible identity changes with side/binding.',
    },
    launch: { waitFrame: 0, scrollPerTick: -6, scrollTicks: 42 },
    restoreScreen: true,
    holdTicks: 20,
    evidence: 'ROM_STATIC_VERIFIED',
    source: 'RE pasada: Purple Comet Z $0E — seq2/seq3, wait anim end, WAIT 20, scroll -6×42, restore, cleanup',
  },
  {
    resourceId: 0x0c,
    name: 'V-ball Crash',
    structure: 'FSM ROM 0x32→0x38 con macros $3B/$3C/$3D reconstruidos por extracción directa.',
    fsm: '0x32 → 0x38',
    macros: VBALL_CRASH_MACROS,
    restoreScreen: true,
    holdTicks: 0,
    evidence: 'ROM_STATIC_VERIFIED',
    source: 'RE pasada: V-ball Crash $0C — FSM 0x32→0x38 + macros $3B/$3C/$3D',
  },
];

// ═══════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════

export function specialHandlerById(resourceId: number): SpecialHandlerEntry | undefined {
  return ROM_SPECIAL_HANDLERS.find(h => h.resourceId === resourceId);
}

export function specialHandlerEvidenceSummary(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const h of ROM_SPECIAL_HANDLERS) {
    counts[h.evidence] = (counts[h.evidence] || 0) + 1;
  }
  return counts;
}
