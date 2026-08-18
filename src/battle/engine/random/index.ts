// ═══════════════════════════════════════════════════════════════════════
// M5 — random/index.ts: superficie pública del PRNG.
// ═══════════════════════════════════════════════════════════════════════

export {
  initRng,
  nextRng,
  rollPercent,
  rollRange,
  DEFAULT_RNG_SEED,
  RNG_ADVANCE,
} from './prng';
export type { RngState } from './prng';
