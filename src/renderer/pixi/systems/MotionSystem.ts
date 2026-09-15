// ═══════════════════════════════════════════════════════════
// DBZ LSW — MotionSystem (movimiento = f(tick), NO tween(durationMs))
// ═══════════════════════════════════════════════════════════
// El desplazamiento de un luchador (rush/lunge) se calcula por tick GBC a
// partir del PROGRESS que emite el timeline (RUSH { progress, duration },
// progress }). No hay duraciones en ms: position = f(currentTick). Resultado
// idéntico en monitor 60/120/144/240 Hz.

export type Easing = (p: number) => number;

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(from: number, to: number, p: number): number {
  return from + (to - from) * p;
}

// Easing deterministas (sin tiempo, solo progreso 0..1)
export const easeOutCubic: Easing = p => {
  const q = 1 - p;
  return 1 - q * q * q;
};

export const easeInOutCubic: Easing = p =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

export const easeOutQuad: Easing = p => 1 - (1 - p) * (1 - p);

export interface RushMotion {
  /** X de salida del luchador. */
  start: number;
  /** X de contacto (junto al rival). */
  end: number;
  easing: Easing;
}

/** X del luchador durante un rush, en función del progress (0..1). */
export function rushX(motion: RushMotion, progress: number): number {
  const p = clamp01(progress);
  return lerp(motion.start, motion.end, motion.easing(p));
}

/**
 * Y nativa del punto de apoyo en ACTION.
 *
 * El plano ROM mide 160×80. La línea inferior de los metasprites de combate
 * queda ocho píxeles por encima del borde del plano (72), dejando el margen
 * inferior que se ve en la composición GBC. Todos los actores, movimientos y
 * anclas usan este mismo punto; la escena padre aplica después la escala ×2.
 * Mantenerlo como una constante derivada del tamaño nativo evita que cada
 * película vuelva a introducir un `y` distinto y que los sprites queden
 * pegados al borde inferior.
 */
export const ACTION_GROUND_Y = 72;
