// ═══════════════════════════════════════════════════════════════════════
// M4 — BattleEvent: hechos RESULTANTES de la resolución del Engine.
// ═══════════════════════════════════════════════════════════════════════
// Regla central (contrato M4):
//
//   BattleCommand  = intención
//   BattleState    = verdad autoritativa
//   BattleEvent    = hechos que YA ocurrieron en el Engine
//
// Los eventos describen el pasado. NO ordenan al Engine qué hacer, NO
// ejecutan gameplay, NO son una cola de instrucciones para la presentación.
// Son JSON serializables, sin callbacks, sin DOM, sin React, sin Pixi.
//
//  BattleState + BattleCommand
//         │
//         ▼
//    executeCommand()
//         │
//         ▼
//   { state, events: BattleEvent[] }
//
// Contrato de orden: el array es DETERMINISTA y en orden semántico de
// resolución (COMMAND_ACCEPTED primero; PHASE_CHANGED después de la
// resolución que lo provoca). Presentation/Replay/Engine Studio consumen
// el MISMO stream sin duplicar reglas.
// ═══════════════════════════════════════════════════════════════════════

import type { BattlePosition, MoveAxis } from '../../../data/positions';
import type { StageKey } from '../../stageInputMap';
import type {
  BattlePhase,
  BattleSide,
  DefenseChoice,
  GuardType,
  PowerState,
} from '../state/BattleState';
import type { BattleCommand } from '../commands/BattleCommand';
import type { CommandRejectionReason } from '../commands/CommandResult';

// ─── Descriptor de acción (payload de ACTION_STARTED / ACTION_RESOLVED) ───
// Datos PLANOS y serializables que identifican QUÉ acción empezó/resolvió.
// La presentación lo usa para elegir perfil cinematográfico (actionProfiles)
// y poses (animationCanon) — nunca al revés.

export type ActionKind =
  | 'command'      // Stage Attack (QTE → combo)
  | 'damage'       // cartas de daño físico (melee)
  | 'beam'         // cartas de energía (haz/onda/esfera/disco)
  | 'support'      // buffs / heals / soporte
  | 'gather'       // Gather Power
  | 'guard'        // Guardia
  | 'move';        // Movimiento táctico

export type ActionVisualKind =
  | 'rush' | 'ray' | 'wave' | 'ball' | 'disk' | 'sword' | 'special'
  | 'power' | 'item';

export type ActionFidelity = 'PLACEHOLDER' | 'INFERRED' | 'VERIFIED' | 'FRAME_VERIFIED';

export interface BattleActionDescriptor {
  /** Slug del perfil firma ('kamehameha', 'stage_3') o genérico por tipo. */
  id: string;
  /** Nombre legible ('Kamehameha', '3 Stage Attack'...). */
  label: string;
  kind: ActionKind;
  visual: ActionVisualKind;
  /** Fidelidad del perfil (PLACEHOLDER/INFERRED/VERIFIED/FRAME_VERIFIED). */
  fidelity: ActionFidelity;
}

// ─── Causa semántica del daño (M5 aplica el número; el contrato nace en M4) ───

export type DamageCause =
  | { type: 'CARD'; cardId: number }
  | { type: 'STAGE_ATTACK'; stage: number }
  | { type: 'COUNTER' }
  | { type: 'OTHER'; id: string };

// ─── Unión discriminada de eventos ─────────────────────────────────────────

export type BattleEvent =
  // ── aceptación / rechazo de comandos ──
  | { type: 'COMMAND_ACCEPTED'; command: BattleCommand }
  | { type: 'COMMAND_REJECTED'; command: BattleCommand; reason: CommandRejectionReason }

  // ── recursos ──
  | { type: 'CC_SPENT'; side: BattleSide; amount: number; before: number; after: number }
  | { type: 'CC_GAINED'; side: BattleSide; amount: number; before: number; after: number }
  | { type: 'KI_SPENT'; side: BattleSide; amount: number; before: number; after: number }

  // ── cartas ──
  | { type: 'CARD_SELECTED'; side: BattleSide; handIndex: number }
  | { type: 'CARD_PLAYED'; side: BattleSide; cardId: number }
  | { type: 'CARD_DISCARDED'; side: BattleSide; cardId: number }

  // ── posición táctica ──
  | { type: 'POSITION_CHANGED'; side: BattleSide; from: BattlePosition; to: BattlePosition; axis: MoveAxis }

  // ── defensa (M8.C2a): el jugador compromete UNA elección defensiva
  // tipada (GUARD | MOVE | carta). DEFENSE_COMMITTED es el ÚNICO evento que
  // autoriza abrir la resolución del atacante (enemy/IA). Hasta entonces la
  // fase 'defend' espera input real, indefinidamente (sin timers ocultos).
  | { type: 'DEFENSE_COMMITTED'; side: BattleSide; choice: DefenseChoice }

  // ── guardia / gather / poder ──
  | { type: 'GUARD_STARTED'; side: BattleSide; guard: GuardType }
  | { type: 'GATHER_STARTED'; side: BattleSide; mode: PowerState }
  | { type: 'POWER_CHANGED'; from: PowerState; to: PowerState }
  /** ROM §132-133/§171 — mantenimiento post-acción: decrementa la power
   *  window de AMBOS fighters tras una ActionExecution completada. */
  | { type: 'POST_ACTION_MAINTENANCE'; decrementedPowerWindows: BattleSide[] }

  // ── character switch (M8.CHARA — ROM §176-178) ──
  // El Engine emite el ciclo semántico del switch; la presentación traduce:
  //   STARTED   → WAIT 20 → CHARA_EXIT (43t)
  //   COMMITTED → CHARA_ENTRY (32t)
  //   COMPLETED → cleanup
  // El commit (activeMember = selectedMember) está alineado entre $27 y $28.
  | { type: 'CHARACTER_SWITCH_STARTED'; side: BattleSide }
  | { type: 'CHARACTER_SWITCH_COMMITTED'; side: BattleSide }
  | { type: 'CHARACTER_SWITCH_COMPLETED'; side: BattleSide }

  // ── QTE / Stage Attack ──
  | { type: 'STAGE_PREP_STARTED'; side: BattleSide; level: 3 | 4 | 5 | 6; seq: StageKey[]; prepTicks: number }
  | { type: 'QTE_STARTED'; side: BattleSide; level: 3 | 4 | 5 | 6; seq: StageKey[]; limitFrames: number }
  | { type: 'QTE_TIMEOUT'; side: BattleSide; window: 'INPUT' | 'COUNTER' }
  | { type: 'QTE_INPUT_RESOLVED'; side: BattleSide; input: StageKey; success: boolean; indexBefore: number; indexAfter: number }
  | { type: 'QTE_COMPLETED'; side: BattleSide; correct: number; total: number; result: 'FULL_SUCCESS' }
  | { type: 'QTE_FAILED'; side: BattleSide; input: StageKey }
  | { type: 'QTE_COUNTER_STARTED'; side: BattleSide }
  | { type: 'QTE_COUNTER_RESOLVED'; side: BattleSide; action: 'DEFEND' | 'CONTINUE' | 'TIMEOUT' }

  // ── acciones ──
  | { type: 'ACTION_STARTED'; side: BattleSide; action: BattleActionDescriptor }
  | { type: 'ACTION_RESOLVED'; side: BattleSide; action: BattleActionDescriptor }

  // ── resolución de ataque (precisión/evasión — M5) ──
  | { type: 'ATTACK_HIT'; source: BattleSide; target: BattleSide; outcome: 'hit' | 'block' | 'guard' }
  | { type: 'ATTACK_MISSED'; source: BattleSide; target: BattleSide; missType?: 'AVOIDED' | 'ATTENUATED' }

  // ── daño / derrota (tipos listos en M4; el Engine los emite en M5) ──
  | { type: 'DAMAGE_APPLIED'; source: BattleSide; target: BattleSide; amount: number; hpBefore: number; hpAfter: number; cause: DamageCause }
  | { type: 'FIGHTER_DEFEATED'; side: BattleSide }

  // ── lifecycle ──
  | { type: 'PHASE_CHANGED'; from: BattlePhase; to: BattlePhase };
