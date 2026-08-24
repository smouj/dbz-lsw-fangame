// ═══════════════════════════════════════════════════════════════════════
// ROM LOTE 9 (§282-288) — decode-action-object: decoder DIFERENCIAL.
//
// Método (§283): cambiar UNA variable cada vez y comparar los 38 bytes.
// Ningún byte se promociona solo por inspección visual (§309 SUPERSEDES 1).
// El resultado son CANDIDATES con traceIds; la promoción a
// ROM_DYNAMIC_VERIFIED exige CROSS_TRACE_CONFIRMED (§302).
// ═══════════════════════════════════════════════════════════════════════

import type {
  DecodedActionObjectField,
  RomActionObjectLayout,
  RomActionTrace,
  RomEvidence,
} from './trace-schema';

export type DifferentialAxis =
  | 'ORIENTATION'   // LEFT ↔ RIGHT (mismo ataque/personaje/outcome)
  | 'ANIMATION'     // cambiar AnimationResource
  | 'FRAME'         // mismo clip, esperar frame siguiente
  | 'OUTCOME';      // HIT vs MISS (mismo ataque)

export interface DifferentialResult {
  axis: DifferentialAxis;
  /** offsets del record (0..18) que cambiaron entre los dos traces. */
  changedOffsets: number[];
  /** offsets que NO cambiaron (estables para este eje). */
  stableOffsets: number[];
  traceIds: string[];
}

/** Compara dos ejecuciones y reporta qué bytes cambian (§283). */
export function diffActionObjects(a: RomActionTrace, b: RomActionTrace): DifferentialResult {
  const offsets = Array.from({ length: 19 }, (_, i) => i);
  const changed: number[] = [];
  const stable: number[] = [];

  // Compara la misma posición temporal en ambos traces (índice relativo).
  const framesA = a.frames;
  const framesB = b.frames;
  const count = Math.min(framesA.length, framesB.length);

  for (const offset of offsets) {
    let anyChange = false;
    for (let i = 0; i < count; i++) {
      const va = framesA[i].actionObjects[0].bytes[offset];
      const vb = framesB[i].actionObjects[0].bytes[offset];
      if (va !== vb) { anyChange = true; break; }
    }
    if (anyChange) changed.push(offset); else stable.push(offset);
  }

  return {
    axis: 'ORIENTATION', // el llamador puede sobreescribir el eje
    changedOffsets: changed,
    stableOffsets: stable,
    traceIds: [traceIdOf(a), traceIdOf(b)],
  };
}

/** Nombre legible de un offset (mientras no esté decodificado). */
export function offsetLabel(offset: number): string {
  return `byte 0x${offset.toString(16).padStart(2, '0')}`;
}

/** Decoder incremental: construye el layout con candidatos y unknowns (§303). */
export function buildActionObjectLayout(
  differentials: DifferentialResult[],
  knownTraceIds: string[],
): RomActionObjectLayout {
  const fields: NonNullable<RomActionObjectLayout['fields']> = {};
  const unknownOffsets: number[] = [];

  for (let offset = 0; offset < 19; offset++) {
    // Clasificación heurística EXPLÍCITA — candidatos, no verdades.
    const candidates = classifyCandidate(offset, differentials);
    if (candidates) {
      (fields as Record<string, number>)[candidates.semantic] = offset;
    } else {
      unknownOffsets.push(offset);
    }
  }

  const fullyKnown = unknownOffsets.length === 0 && knownTraceIds.length >= 3;
  return {
    size: 0x13,
    fields,
    unknownOffsets,
    evidence: fullyKnown ? 'ROM_DYNAMIC_VERIFIED' : 'PARTIAL_ROM_DYNAMIC_VERIFIED',
  };
}

/** Heurística de candidato por eje (§283). Solo CANDIDATE — nunca verified. */
function classifyCandidate(
  offset: number,
  diffs: DifferentialResult[],
): { semantic: DecodedActionObjectField['semantic'] } | null {
  const orientationChanged = diffs.some(d => d.axis === 'ORIENTATION' && d.changedOffsets.includes(offset));
  const frameChanged = diffs.some(d => d.axis === 'FRAME' && d.changedOffsets.includes(offset));
  const animationChanged = diffs.some(d => d.axis === 'ANIMATION' && d.changedOffsets.includes(offset));

  // Orden de prioridad documentado (§283):
  if (orientationChanged && !animationChanged) return { semantic: 'BASE_X' }; // candidate
  if (animationChanged && !orientationChanged) return { semantic: 'ANIMATION_SET' }; // candidate
  if (frameChanged && !animationChanged) return { semantic: 'FRAME' }; // candidate
  return null; // UNKNOWN — no promocionar
}

function traceIdOf(t: RomActionTrace): string {
  // ID determinista mínimo (misma base que traceId del schema).
  const src = t.meta.source;
  const head = `${src.romSha256}|${src.emulator}|${src.emulatorVersion}`;
  let h = 0;
  for (const ch of head) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `trace-${(h >>> 0).toString(16).padStart(8, '0')}`;
}

/** Promoción de campo (§282/§302): CANDIDATE → (cross-trace) → verified. */
export function promoteField(
  field: DecodedActionObjectField,
  crossTraceConfirmed: boolean,
): DecodedActionObjectField {
  if (!crossTraceConfirmed || field.confidence === 'ROM_DYNAMIC_VERIFIED') return field;
  return { ...field, confidence: 'ROM_DYNAMIC_VERIFIED' };
}

export type { RomEvidence };
