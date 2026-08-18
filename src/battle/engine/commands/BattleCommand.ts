// ═══════════════════════════════════════════════════════════════════════
// M2 — BattleCommand: TODA intención de gameplay como comando.
// ═══════════════════════════════════════════════════════════════════════
// Extraídos de las acciones REALES que hoy modifican gameplay en main.tsx
// (auditoría M2): command-strip (LIMIT/JOINT/BASIC/CHARA), mano (jugar
// carta), BASIC (stage/gather), defensa (limit/joint/basic → guard/move/
// carta defensiva), QTE (input + respuesta al contraataque).
// ═══════════════════════════════════════════════════════════════════════

import type { StageKey } from '../../stageInputMap';

export type BattleCommand =
  // ── command-strip (fase command) ──
  | { type: 'LIMIT' }
  | { type: 'JOINT' }
  | { type: 'BASIC' }
  | { type: 'CHARACTER_ACTION' }
  // ── mano / cartas ──
  | { type: 'SELECT_CARD'; handIndex: number }
  | { type: 'PLAY_CARD'; handIndex: number }
  | { type: 'PLAY_LIMIT_CARD'; cardId: number }
  // ── BASIC ──
  | { type: 'BASIC_STAGE_ATTACK' }
  | { type: 'GATHER_POWER' }
  // ── defensa ──
  | { type: 'DEFENSE_LIMIT' }
  | { type: 'DEFENSE_JOINT' }
  | { type: 'DEFENSE_BASIC' }
  | { type: 'GUARD' }
  | { type: 'PLAY_DEFENSE_CARD'; handIndex: number }
  | { type: 'MOVE'; axis: 'HORIZONTAL' | 'VERTICAL' }
  // ── QTE / Stage Attack ──
  | { type: 'QTE_INPUT'; input: StageKey }
  | { type: 'QTE_COUNTER_DEFEND' }
  | { type: 'QTE_COUNTER_CONTINUE' };
