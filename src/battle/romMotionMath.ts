/**
 * romMotionMath.ts — matemática determinista de motion ROM por segmentos.
 *
 * SSOT puro (sin PixiJS ni estado de renderer) para la integración discreta
 * tick-a-tick de FIGHTER_MOTION (RUSH, BEAM_SETUP, CHARA_EXIT, CHARA_ENTRY).
 *
 * La posición se calcula solo desde `elapsed` (tick GBC), nunca desde el número
 * de frames renderizados. Así el resultado es idéntico a cualquier Hz.
 */

/** Segmento discreto de movimiento ROM (dxPerTick por tick GBC, sin easing). */
export interface RomMotionSegment {
  dxPerTick: number;
  dyPerTick: number;
  ticks: number;
}

/**
 * positionAtTick determinista: desplazamiento acumulado (x, y) al tick `elapsed`
 * y si la motion ha terminado (elapsed >= Σ ticks).
 */
export function positionFromSegments(
  segments: ReadonlyArray<RomMotionSegment>,
  elapsed: number,
): { x: number; y: number; done: boolean } {
  let x = 0;
  let y = 0;
  let remaining = Math.max(0, elapsed);
  for (const seg of segments) {
    if (remaining < seg.ticks) {
      return { x: x + seg.dxPerTick * remaining, y: y + seg.dyPerTick * remaining, done: false };
    }
    x += seg.dxPerTick * seg.ticks;
    y += seg.dyPerTick * seg.ticks;
    remaining -= seg.ticks;
  }
  return { x, y, done: true };
}

/** Suma de ticks totales de la motion (duración fija en ticks GBC). */
export function segmentsTotalTicks(segments: ReadonlyArray<RomMotionSegment>): number {
  return segments.reduce((sum, s) => sum + s.ticks, 0);
}

/** Desplazamiento neto (x, y) de la motion. */
export function segmentsNetDelta(segments: ReadonlyArray<RomMotionSegment>): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const s of segments) {
    x += s.dxPerTick * s.ticks;
    y += s.dyPerTick * s.ticks;
  }
  return { x, y };
}
