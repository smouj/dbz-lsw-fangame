// ═══════════════════════════════════════════════════════════════════════
// M6 — clock/index.ts: superficie pública del reloj lógico del Engine.
// ═══════════════════════════════════════════════════════════════════════

export {
  advanceBattleClock,
  COUNTER_WINDOW_TICKS,
  STAGE_PREP_TICKS,
  STAGE_PREP_BEATS,
  STAGE_PREP_FIDELITY,
  GBC_FPS,
} from './clock';
export type { ClockAdvanceOutcome } from './clock';
