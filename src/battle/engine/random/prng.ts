// ═══════════════════════════════════════════════════════════════════════
// M5 — PRNG canónico del BattleEngine (mulberry32, puro y explícito).
// ═══════════════════════════════════════════════════════════════════════
// REGLAS:
//  - El estado del RNG vive SOLO en state.rngState (número entero 32-bit).
//  - Todas las funciones son PURAS: rngState → { value, rngState }.
//  - Cero Math.random / Date.now / performance.now dentro del Engine.
//  - Un comando rechazado NO consume RNG. Una acción determinista NO lo
//    consume. Una tirada = exactamente un avance conocido de rngState
//    (crítico para Replay: una tirada extra = divergencia detectable).
//  - NUNCA usar este PRNG para cosmética (shake/partículas/flash):
//    Presentation tendrá su propia fuente en M7.
// ═══════════════════════════════════════════════════════════════════════

export type RngState = number;

/** Constante de avance mulberry32 (misma que state.ts seededRng). */
export const RNG_ADVANCE = 0x6d2b79f5;

/** Estado inicial determinista desde un seed explícito (nunca Date.now). */
export function initRng(seed: number): RngState {
  return seed >>> 0;
}

/** Semilla por defecto CANÓNICA (Engine determinista sin semilla externa). */
export const DEFAULT_RNG_SEED = 1;

/**
 * Avanza el PRNG un paso y devuelve el valor [0,1) + el nuevo estado.
 * Puro: el estado de entrada nunca se muta.
 */
export function nextRng(rngState: RngState): { value: number; rngState: RngState } {
  const a = (rngState + RNG_ADVANCE) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, rngState: a >>> 0 };
}

/**
 * Tirada de porcentaje (chance 0..100): true si el valor < chance.
 * Consume EXACTAMENTE 1 avance.
 */
export function rollPercent(rngState: RngState, chancePct: number): { value: boolean; rngState: RngState } {
  const { value, rngState: next } = nextRng(rngState);
  return { value: value * 100 < chancePct, rngState: next };
}

/**
 * Tirada de rango entero [min, max] (inclusive). Consume 1 avance.
 */
export function rollRange(rngState: RngState, min: number, max: number): { value: number; rngState: RngState } {
  const { value, rngState: next } = nextRng(rngState);
  const span = max - min + 1;
  return { value: min + Math.min(span - 1, Math.floor(value * span)), rngState: next };
}
