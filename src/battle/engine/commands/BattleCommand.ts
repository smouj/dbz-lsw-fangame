// ═══════════════════════════════════════════════════════════════════════
// M2 — BattleCommand: TODA intención de gameplay como comando.
// ═══════════════════════════════════════════════════════════════════════
// Extraídos de las acciones REALES que hoy modifican gameplay en main.tsx
// (auditoría M2): command-strip (LIMIT/JOINT/BASIC/CHARA), mano (jugar
// carta), BASIC (stage/gather), defensa (limit/joint/basic → guard/move/
// carta defensiva), QTE (input + respuesta al contraataque).
// ═══════════════════════════════════════════════════════════════════════

import type { StageKey } from '../../stageInputMap';
import type { BattleSide } from '../state/BattleState';

export type BattleCommand =
  // ── command-strip (fase command) ──
  | { type: 'LIMIT' }
  | { type: 'JOINT' }
  | { type: 'BASIC' }
  /** M8.CHARA — cambio de miembro activo (ROM §116-126). `side` identifica
   *  qué lado cambia (el miembro entrante es su reserve: player2/enemy2).
   *  El swap autoritativo NO ocurre aquí: se difiere al COMMITTED @ T+63. */
  | { type: 'CHARACTER_ACTION'; side?: BattleSide }
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
  // ── orquestación (M8.C2a) ──
  /** Abre una ventana defensiva NUEVA (defenseState → AWAITING_CHOICE,
   *  defenseChoice = null). Lo llama el orquestador al entrar en fase
   *  'defend' — el Engine nunca deja la elección comprometida de un
   *  exchange anterior (contrato C2a: UNA elección por ventana). La
   *  espera es de ELECCIÓN TÁCTICA del menú defensivo (GUARD/MOVE/carta),
   *  jamás un QTE. Idempotente: si ya está limpia, no-op. */
  | { type: 'RESET_DEFENSE' }
  /** M8.C2a-L — avanza el exchange (transición autoritativa ÚNICA del
   *  lifecycle): exchange 0 → 1 (mismo turno, misma iniciativa) ·
   *  exchange 1 → turn+1, exchange 0 e iniciativa RECALCULADA por SPD
   *  efectiva (speedOrder). La iniciativa es del turno ACTUAL, nunca
   *  firstAttacker fijo. Primitiva de orquestación: sin eventos de
   *  dominio, no expuesta a la UI. */
  | { type: 'END_EXCHANGE' }
  // ── QTE / Stage Attack ──
  | { type: 'QTE_INPUT'; input: StageKey }
  | { type: 'QTE_COUNTER_DEFEND' }
  | { type: 'QTE_COUNTER_CONTINUE' };
