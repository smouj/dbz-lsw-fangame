// ═══════════════════════════════════════════════════════════════════════
// M1 — BATTLE STATE PURO (dominio de batalla autoritativo)
// ═══════════════════════════════════════════════════════════════════════
// Objetivo M1 (docs/BATTLE_ENGINE_MIGRATION.md): identificar, TIPAR y
// EXTRAER todo el estado autoritativo del combate. Este módulo es 100%
// puro — SIN React, DOM, PixiJS, timers ni audio. Nada aquí conoce
// componentes, sprites, fondos, animaciones ni cinematografía.
//
//   BattleState
//   ├─ lifecycle  → turn / phase / exchange / activeSide / intro
//   ├─ fighters   → player / enemy (+ team reserves)
//   ├─ resources  → hp / ki / cc (dentro de fighters) + stages/guard/acc/eva
//   ├─ cards      → hand / drawPile / discardPile / selected / limits
//   ├─ action     → stageQte (QTE/Stage Attack)
//   ├─ power      → powerState / gatherTurns / gatherStartedRound
//   ├─ ai         → estado de la IA enemiga (autoritativo)
//   └─ deterministic → tick (reloj GBC en ticks) + rngState (M2+)
//
// REGLAS DE M1:
// - Sin Math.random dentro del estado (la aleatoriedad entra por
//   rngState/inputs del llamador).
// - Sin relojes de pared: tick = ticks GBC enteros (59.7275 fps).
// - Sin caches derivables: lo derivable se calcula en selectors.
// - JSON.parse(JSON.stringify(state)) debe preservar la semántica.
// ═══════════════════════════════════════════════════════════════════════

import type { BattlePosition } from '../../../data/positions';
import type { CardDef } from '../../../data/cards';
import type { StageKey } from '../../stageInputMap';
import type { QteState } from '../../../data/actionFidelity';
import type { MoveAxis } from '../../../data/positions';

// ─── Fase de batalla (las mismas del juego real — main.tsx) ───
export type BattlePhase =
  | 'position' | 'command' | 'basic' | 'limitSelect' | 'cardSelect'
  | 'stageInput' | 'enemyTurn' | 'defend' | 'discard' | 'win' | 'lose';

export type BattleSide = 'player' | 'enemy';

// ─── Combate: estado de UN luchador (recursos + táctico) ───
export interface BattleFighterState {
  id: string;
  name: string;
  form: string;
  level: number;
  // recursos
  maxHp: number;
  hp: number;
  str: number;
  ki: number;
  spd: number;
  maxCc: number;
  cc: number;
  // táctico
  battlePos: BattlePosition;
  battleId?: 'goku' | 'vegeta';
  limits: string[];
}

// ─── Stages de parámetros (STR/KI/SPD/GUARD — buffs/debuffs persistentes) ───
export interface StageStages {
  str: number;
  ki: number;
  spd: number;
  guard: number;
}

// ─── Estado defensivo (M8.C2a — autoritativo, en el Engine) ───
// La defensa es una ELECCIÓN TÁCTICA (menú GUARD/MOVE/carta), NUNCA un
// QTE: no hay secuencia de inputs, contador Stage ni inputOpenTick en
// este tramo (Stage/QTE pertenece SOLO a la fase de ataque).
//   NONE            → sin ventana defensiva abierta (estado base)
//   AWAITING_CHOICE → ventana abierta: el jugador puede elegir una opción
//                     (GUARD | MOVE(axis) | carta defensiva) — se espera
//                     INDEFINIDAMENTE; el enemigo NO actúa hasta que se
//                     comprometa la elección (contrato C2a: sin timers que
//                     autolancen la resolución enemiga).
//   COMMITTED       → el jugador eligió; la resolución del ataque enemigo
//                     puede abrirse (la presentación representa la defensa
//                     en el CONTACTO: guard idle→block, MOVE por
//                     POSITION_CHANGED, carta con FX previo).
export type DefenseState = 'NONE' | 'AWAITING_CHOICE' | 'COMMITTED';

// ─── Elección defensiva del jugador (M8.C2a — autoritativa, en el Engine) ───
// El jugador compromete GUARD / MOVE / carta defensiva como UNA elección
// tipada. El Runtime/presentación NUNCA deduce "como guard=true, supongo
// que eligió guard": la elección queda explícita en el estado y la
// cinematografía enemiga sabe qué preparación defensiva representar.
export type DefenseChoice =
  | { type: 'GUARD' }
  | { type: 'MOVE'; axis: MoveAxis }
  | { type: 'CARD'; cardId: number };

// ─── Guardia activa (cartas Taiyoken/Avoid/Endurance/Absorb/Foresight) ───
export type GuardType = 'avoid_beam' | 'avoid_damage' | 'reduce' | 'absorb' | 'cancel';

// ─── Estado del QTE / Stage Attack (autoritativo, en ticks GBC absolutos) ───
// M6: el reloj manda — las ventanas usan startedTick/deadlineTick (nunca
// fracciones ni contadores por frame). Regla de borde (contractual):
//   currentTick <  deadlineTick → ventana abierta
//   currentTick >= deadlineTick → timeout (exactamente UNA vez)
// M8.B: PREPARING — tras confirmar la acción, el Engine abre la ventana de
// inputs SOLO cuando currentTick >= inputOpenTick (el último idle de la
// preparación). El reloj del Engine abre INPUT_WINDOW: Presentation jamás
// llama a "startQte" — solo representa los mismos ticks.
export interface BattleQteState {
  state: QteState;
  seq: StageKey[];
  idx: number;
  correct: number;
  card: CardDef | null;
  /** Tick GBC absoluto en que se abrió la ventana actual. */
  startedTick: number;
  /** Tick GBC absoluto en que PREPARING → INPUT_WINDOW (frontera QTE). */
  inputOpenTick: number;
  /** Tick GBC absoluto de expiración de la ventana de inputs. */
  deadlineTick: number;
  /** Duración de la ventana de inputs en ticks (para RECOVER/reabrir). */
  windowTicks: number;
  /** Tick GBC absoluto de expiración de la ventana COUNTER_WINDOW. */
  counterDeadlineTick: number;
  result: 'FULL_SUCCESS' | 'SAFE_ABORT' | 'COUNTER_HIT' | null;
}

// ─── IA enemiga (estado persistente entre exchanges) ───
export interface EnemyAiState {
  mode: number;
  attacks: number;
  gathered: boolean;
  gatherStreak: number;
}

// ─── Nivel de poder GATHER (FULL/HALF/NORMAL) ───
export type PowerState = 'NORMAL' | 'HALF_POWER' | 'FULL_POWER';

// ─── Mazo real (una instancia por combatiente) ───
export interface BattleDeckState {
  drawPile: CardDef[];
  hand: CardDef[];
  discardPile: CardDef[];
}

// ═══════════════════════════════════════════════════════════════════════
// BATTLE STATE — el estado autoritativo COMPLETO del combate.
// ═══════════════════════════════════════════════════════════════════════
export interface BattleState {
  // ── lifecycle ──
  turn: number;
  phase: BattlePhase;
  exchange: 0 | 1;                    // exchangeIndex (0 = 1º, 1 = 2º)
  activeSide: BattleSide;             // turnOwner (quién ataca primero este turno)
  intro: boolean;                     // VS screen en curso (gates beginTurn)

  // ── fighters ──
  player: BattleFighterState;
  enemy: BattleFighterState;
  player2: BattleFighterState | null;
  enemy2: BattleFighterState | null;
  playerTransformedForm: string | null;

  // ── resources / stages (estado temporal por combatiente) ──
  pStages: StageStages;
  eStages: StageStages;
  pAcc: number;                       // turnos de +30% precisión
  pEva: number;                       // turnos de +30% evasión
  playerGuard: GuardType | null;
  /** M8.C2a — estado defensivo explícito (NONE/AWAITING_CHOICE/COMMITTED).
   *  La ventana la abre RESET_DEFENSE (AWAITING_CHOICE); GUARD/MOVE/carta
   *  la comprometen (COMMITTED). Nunca hay QTE en defensa. */
  defenseState: DefenseState;
  /** M8.C2a — elección defensiva comprometida (null mientras AWAITING_CHOICE). */
  defenseChoice: DefenseChoice | null;
  pLockOn: boolean;

  // ── power (GATHER) ──
  powerState: PowerState;
  gatherTurns: number;
  gatherStartedRound: number | null;

  // ── cards ──
  deck: BattleDeckState;              // mazo real del jugador
  eDeck: BattleDeckState;             // mazo real del enemigo
  selectedCard: number | null;        // índice en la mano (cardSelect)
  limits: number[];                   // deck LIMITED del jugador

  // ── action / QTE ──
  stageQte: BattleQteState;

  // ── ai ──
  ai: EnemyAiState;

  // ── deterministic ──
  tick: number;                       // reloj GBC en ticks (59.7275 fps)
  /** Seed explícito (entra desde fuera — nunca Date.now/crypto). */
  seed: number;
  /** Estado del PRNG canónico (M5) — avanza SOLO con tiradas de gameplay. */
  rngState: number;
}
