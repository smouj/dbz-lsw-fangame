// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — RomTimedFrameInstance (P0 ROM FIDELITY — SSOT de timing)
// ═══════════════════════════════════════════════════════════════════════
// La ÚNICA autoridad para el timing de un frame de animación ROM.
//
// Jerarquía de identidad:
//   PHYSICAL FRAME = identidad gráfica deduplicada (mismo PNG, mismo metasprite)
//   FRAME INSTANCE = form + resource + sequence + frameIndex (único por uso)
//
// Un mismo physicalId puede aparecer en N instancias con DIFERENTE durationTicks:
//   Resource A · seq 0 · frame 3 → 8 ticks
//   Resource B · seq 2 · frame 7 → 3 ticks
//   Mismo PNG, distinta cadencia.
//
// Esta estructura es la SSOT del timing. El manifest (pose → PNG) NO lo es.
// ═══════════════════════════════════════════════════════════════════════

import type { AnimationResourceDecodedFrame } from './animationResources';

/** Autoridad de timing ROM para una instancia de frame. */
export interface RomTimedFrameInstance {
  /** Forma que usa esta instancia. */
  formId: string;
  /** Resource de animación ROM (0x00-0x3F, 0x61 standing). */
  resourceId: number;
  /** Selector de secuencia dentro del resource. */
  sequenceSelector: number;
  /** Índice del frame dentro de la secuencia. */
  frameIndex: number;

  /** Identidad visual (metasprite) — deduplicada, NO unique por instancia. */
  visualFrameId: number;
  /** Identidad física del PNG deduplicado (form_r_vf). */
  physicalId: string;
  /** Archivo PNG relativo al directorio de forma. */
  file: string;

  /** ROM-native: duración en ticks GBC para ESTE frame en ESTA secuencia. */
  durationTicks: number;
  /** ROM-native: offset Y para ESTE frame en ESTA secuencia. */
  offsetY: number;
  /** ROM-native: offset X para ESTE frame en ESTA secuencia. */
  offsetX: number;

  /** Origen de los datos (para trazabilidad). */
  evidence: string;
}

/**
 * Construye una RomTimedFrameInstance a partir del frame decodificado ROM
 * y los datos físicos del corpus.
 */
export function romTimedFrameInstance(
  formId: string,
  resourceId: number,
  sequenceSelector: number,
  frameIndex: number,
  decoded: AnimationResourceDecodedFrame,
  physicalId: string,
  file: string,
  evidence: string,
): RomTimedFrameInstance {
  return {
    formId,
    resourceId,
    sequenceSelector,
    frameIndex,
    visualFrameId: decoded.visualFrameId,
    physicalId,
    file,
    durationTicks: decoded.durationTicks,
    offsetY: decoded.offsetY,
    offsetX: decoded.offsetX,
    evidence,
  };
}

/**
 * Fuente de timing para una animación. Determina QUÉ reloj gobierna
 * el avance de frames.
 */
export type TimingSource = 'ROM_TICKS' | 'LEGACY_FPS';

/**
 * Secuencia completa de instancias de frame temporizadas ROM.
 * Equivale a una AnimationResourceDecodedSequence, pero con physicalId
 * resuelto para cada frame.
 */
export interface RomTimedSequence {
  resourceId: number;
  sequenceSelector: number;
  totalTicks: number;
  frames: RomTimedFrameInstance[];
  timingSource: TimingSource;
}