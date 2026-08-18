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

// ─── Guardia activa (cartas Taiyoken/Avoid/Endurance/Absorb/Foresight) ───
export type GuardType = 'avoid_beam' | 'avoid_damage' | 'reduce' | 'absorb' | 'cancel';

// ─── Estado del QTE / Stage Attack (autoritativo, en ticks) ───
export interface BattleQteState {
  state: QteState;
  seq: StageKey[];
  idx: number;
  correct: number;
  card: CardDef | null;
  elapsedFrames: number;   // ticks GBC
  limitFrames: number;     // ticks GBC
  counterFrames: number;   // ticks GBC
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
  rngState: unknown;                  // M2+: RNG determinista (seed/contador)
}
