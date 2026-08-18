// ═══════════════════════════════════════════════════════════════════════
// M6 — GbcClockAdapter: traduce tiempo REAL (ms) a ticks GBC enteros.
// ═══════════════════════════════════════════════════════════════════════
// VIVE FUERA del BattleEngine (contrato M6): el Engine solo conoce ticks
// enteros; la fracción sobrante pertenece al adaptador, NUNCA a BattleState.
//
//   Pixi ticker / RAF → deltaMs → GbcClockAdapter → 0..N ticks → advanceBattleClock()
//
// Ejemplo: 50 ms reales ≈ 2.986 ticks GBC → Engine recibe 2 · el adaptador
// conserva 0.986. Así 30/60/144 FPS y deltas irregulares producen la MISMA
// simulación: el adaptador solo decide CUÁNDO entrega ticks, nunca cómo se
// resuelven.
// ═══════════════════════════════════════════════════════════════════════

import { GAMEPLAY_CONFIG } from '../config/gameplay.config';

export const GBC_MS_PER_TICK = 1000 / GAMEPLAY_CONFIG.gbcNativeFps;

/**
 * Versión PURA del adaptador: acumula ms reales y devuelve los ticks GBC
 * enteros producidos + el sobrante (fracción) que sigue en el adaptador.
 */
export function ticksFromDeltaMs(accMs: number, deltaMs: number, fps = GAMEPLAY_CONFIG.gbcNativeFps): {
  ticks: number;
  accMs: number;
} {
  const msPerTick = 1000 / fps;
  const acc = Math.max(0, accMs) + Math.max(0, deltaMs);
  const ticks = Math.floor(acc / msPerTick);
  return { ticks, accMs: acc - ticks * msPerTick };
}

/** Adapter con estado (para el bucle real del juego — fuera del Engine). */
export class GbcClockAdapter {
  private accMs = 0;
  private readonly fps: number;
  private readonly msPerTick: number;

  constructor(fps = GAMEPLAY_CONFIG.gbcNativeFps) {
    this.fps = fps;
    this.msPerTick = 1000 / fps;
  }

  /** Recibe deltaMs reales y devuelve los ticks GBC enteros acumulados. */
  push(deltaMs: number): number {
    const r = ticksFromDeltaMs(this.accMs, deltaMs, this.fps);
    this.accMs = r.accMs;
    return r.ticks;
  }

  /** Fracción de tick pendiente (ms sin convertir) — del adaptador, no del estado. */
  get fractionalMs(): number {
    return this.accMs;
  }

  reset(): void {
    this.accMs = 0;
  }
}
