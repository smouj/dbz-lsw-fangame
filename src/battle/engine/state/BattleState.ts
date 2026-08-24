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
//   ├─ power      → powerWindowCounter (SSOT ROM §102/127: Gather=5, CHARA=2)
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

// ─── CONTRATO ÚNICO DEL COMBATE (2026-08-19 — P0 · docs/COMBAT_CONTRACT.md) ───
//   RONDA = 2 exchanges: exchange 0 ataca la INICIATIVA, exchange 1 el
//   opuesto. activeAttacker()/activeDefender() se derivan SOLO de
//   (activeSide, exchange) — jamás de la fase. Una ronda acaba cuando
//   ambos lados han tenido su acción (END_EXCHANGE desde exchange 1:
//   turn++ · exchange 0 · iniciativa recalculada por SPD efectiva).
//   Desde el jugador solo hay ATTACK (si ataca) o DEFENSE (si defiende):
//   initiative player → exchange 0 ATTACK · exchange 1 DEFENSE
//   initiative enemy   → exchange 0 DEFENSE · exchange 1 ATTACK
//   El juego se DETIENE en toda frontera de decisión (getControlBoundary:
//   PLAYER_ATTACK_CHOICE / PLAYER_DEFENSE_CHOICE / ACTION_INPUT); el resto
//   es RESOLVING (automático: preparación y resolución de lo YA elegido).
//   Toda acción elegida pasa por su EJECUCIÓN (getActionExecution):
//   IDLE → PREPARING → (WAITING_INPUT si requiere input) → RESOLVING →
//   COMPLETE. La preparación es parte de la acción, no una fase del turno;
//   el input aparece SOLO al terminar PREPARING (inputOpenTick del reloj —
//   la presentación jamás abre el QTE). La DEFENSA es una INTERACCIÓN con
//   el ataque enemigo (no un segundo ataque): GUARD/MOVE/carta se
//   compromete ANTES de que el enemigo actúe (DEFENSE_COMMITTED).
//   EL JUEGO NUNCA TOMA UNA NUEVA DECISIÓN POR EL JUGADOR.
// En LSW cada TURN tiene DOS exchanges: el atacante del exchange 0 es la
// INICIATIVA (activeSide, marcado con * por SPD) y el del exchange 1 es el
// opuesto. Desde el punto de vista del jugador:
//   initiative=player → ATTACK → DEFENSE
//   initiative=enemy   → DEFENSE → ATTACK
// La fase describe el GAMEPLAY del combatiente controlado, NUNCA quién
// ataca: el lado atacante se deriva SIEMPRE de (activeSide, exchange) —
// activeAttacker() — jamás de la fase. Por eso NO existe una fase
// 'enemyTurn' ni 'playerTurn': cuando el enemigo ataca, la fase observable
// del jugador es 'defend' (elección defensiva). El QTE/Stage vive SOLO en
// las subfases de ataque ('stageInput'); en defensa jamás hay Stage.
// (El tipo de fase de main.tsx sigue siendo legacy y contiene 'enemyTurn'
// como espera presentacional — el puente lo mapea a 'defend'.)
export type BattlePhase =
  | 'position' | 'command' | 'basic' | 'limitSelect' | 'cardSelect'
  | 'stageInput' | 'defend' | 'discard' | 'win' | 'lose';

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
  /** M8.POWER — power window (fighterState+4; ROM §102/127: Gather=5,
   *  CHARA=2). PER FIGHTER: el mantenimiento (§132-133) decrementa ambos
   *  lados tras cada ActionExecution completada. */
  powerWindowCounter: number;
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

// ─── Nivel de poder derivado (view type — el estado almacena SOLO powerWindowCounter) ───
// HALF_POWER es legacy de main.tsx (React); el ROM no lo escribe.
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
