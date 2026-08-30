// ═══════════════════════════════════════════════════════════════════════
// P9 ROM RE — RomScreenPath SSOT (SCREEN_PATH $11 — path fijo implícito)
// ═══════════════════════════════════════════════════════════════════════
// Fuente: RE pasada (2026-08-29). La trayectoria de SCREEN_PATH $11 ya NO
// necesita tracer ni pathId: la ROM tiene un único programa fijo en Bank7E:$73C5.
//
// Formato del paso: (deltaY, deltaX) — el primer componente es Y (SCY),
// el segundo es X (SCX).
//
// Acumulado total:
//   ΔSCY = -42
//   ΔSCX = -156  (reflejado por lado: -156 ↔ +156)
//
// ⚠ El X se refleja según el lado del actor. La Y no se refleja.
// ═══════════════════════════════════════════════════════════════════════

export type ScreenPathEvidence = 'ROM_STATIC_VERIFIED' | 'ROM_DERIVED';

/** Un paso de la trayectoria ROM (deltaY, deltaX). */
export interface ScreenPathStep {
  deltaY: number;
  deltaX: number;
}

/** Tabla ROM de la trayectoria (Bank7E:$73C5). */
export const SCREEN_PATH_TABLE = {
  address: 0x73c5,
  bank: 0x7e,
  stepCount: 18,
  hasPathIdOperand: false,
  pathSelection: 'implicit single fixed path',
  evidence: 'ROM_STATIC_VERIFIED' as const,
  source: 'Bank7E:$73C5 (SCREEN_PATH $11)',
} as const;

/**
 * Los 18 pasos, en orden. Los 8 primeros explícitos; los 10 restantes repiten
 * (-2,-10). Primer componente = deltaY, segundo = deltaX.
 */
export const SCREEN_PATH_STEPS: ReadonlyArray<ScreenPathStep> = [
  { deltaY: -5, deltaX: -5 },
  { deltaY: -4, deltaX: -5 },
  { deltaY: -3, deltaX: -6 },
  { deltaY: -2, deltaX: -6 },
  { deltaY: -2, deltaX: -7 },
  { deltaY: -2, deltaX: -8 },
  { deltaY: -2, deltaX: -9 },
  { deltaY: -2, deltaX: -10 },
  { deltaY: -2, deltaX: -10 },
  { deltaY: -2, deltaX: -10 },
  { deltaY: -2, deltaX: -10 },
  { deltaY: -2, deltaX: -10 },
  { deltaY: -2, deltaX: -10 },
  { deltaY: -2, deltaX: -10 },
  { deltaY: -2, deltaX: -10 },
  { deltaY: -2, deltaX: -10 },
  { deltaY: -2, deltaX: -10 },
  { deltaY: -2, deltaX: -10 },
];

/** Suma acumulada total de la trayectoria. */
export function screenPathNetDelta(): { deltaY: number; deltaX: number } {
  let y = 0;
  let x = 0;
  for (const s of SCREEN_PATH_STEPS) {
    y += s.deltaY;
    x += s.deltaX;
  }
  return { deltaY: y, deltaX: x };
}

/** Offset acumulado (y, x) tras `stepCount` pasos (0..18). */
export function screenPathOffsetAt(stepCount: number): { deltaY: number; deltaX: number } {
  const n = Math.max(0, Math.min(SCREEN_PATH_STEPS.length, stepCount));
  let y = 0;
  let x = 0;
  for (let i = 0; i < n; i++) {
    y += SCREEN_PATH_STEPS[i].deltaY;
    x += SCREEN_PATH_STEPS[i].deltaX;
  }
  return { deltaY: y, deltaX: x };
}

/**
 * Offset final con X reflejado por lado.
 * `side` == 'left' (SIDE_1): SCX negativo; 'right' (SIDE_2): SCX positivo.
 */
export function screenPathFinalOffset(side: 'SIDE_1' | 'SIDE_2'): { deltaY: number; deltaX: number } {
  const net = screenPathNetDelta();
  return {
    deltaY: net.deltaY,
    deltaX: side === 'SIDE_1' ? net.deltaX : -net.deltaX,
  };
}
