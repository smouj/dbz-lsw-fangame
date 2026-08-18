// ═══════════════════════════════════════════════════════════════════════
// M1 — createInitialBattleState: fábrica PURA del estado inicial.
// ═══════════════════════════════════════════════════════════════════════
// Determinista: los mismos (config + firstAttacker + decks) producen el
// MISMO estado. Nada de Math.random aquí — la decisión de quién ataca
// primero (o el seed del RNG) la aporta el llamador.
// No modifica ningún valor de balance/duración/secuencia existente: es un
// espejo exacto de los inicializadores actuales de main.tsx (baseline
// PRE_BATTLE_ENGINE_MIGRATION_BASELINE).
// ═══════════════════════════════════════════════════════════════════════

import { BattlePosition } from '../../../data/positions';
import { initRng, DEFAULT_RNG_SEED } from '../random/prng';
import type { CardDef } from '../../../data/cards';
import type {
  BattleDeckState,
  BattleFighterState,
  BattleQteState,
  BattleSide,
  BattleState,
  EnemyAiState,
  PowerState,
  StageStages,
} from './BattleState';

export interface InitialBattleConfig {
  playerFormId: string;
  playerName: string;
  playerForm: string;
  playerLevel: number;
  playerMaxHp: number;
  playerHp: number;
  playerStr: number;
  playerKi: number;
  playerSpd: number;
  playerMaxCc: number;
  playerCc: number;
  enemyFormId: string;
  enemyName: string;
  enemyForm: string;
  enemyLevel: number;
  enemyMaxHp: number;
  enemyHp: number;
  enemyStr: number;
  enemyKi: number;
  enemySpd: number;
  enemyMaxCc: number;
  enemyCc: number;
  playerPos: BattlePosition;
  enemyPos: BattlePosition;
  playerDeck: BattleDeckState;
  enemyDeck: BattleDeckState;
  /** Deck LIMITED del jugador (ids numéricos de carta). */
  playerLimits: number[];
  /** Cartas LIMITED del roster del personaje (ids de forma, Fighter.limits). */
  playerFighterLimits: string[];
  /** Quién ataca primero (SPD resuelta o azar del llamador). */
  firstAttacker: BattleSide;
  /** RNG determinista opcional (M2+): semilla/estado del PRNG. */
  rngState?: unknown;
  /** Seed explícito del PRNG canónico (M5) — default canónico 1. */
  seed?: number;
}

const ZERO_STAGES: StageStages = { str: 0, ki: 0, spd: 0, guard: 0 };
const ZERO_AI: EnemyAiState = { mode: 0, attacks: 0, gathered: false, gatherStreak: 0 };

function emptyQte(): BattleQteState {
  return {
    state: 'WAITING',
    seq: [],
    idx: 0,
    correct: 0,
    card: null,
    elapsedFrames: 0,
    limitFrames: 0,
    counterFrames: 0,
    result: null,
  };
}

function fighterFromConfig(cfg: InitialBattleConfig, side: BattleSide): BattleFighterState {
  const p = side === 'player';
  return {
    id: p ? cfg.playerFormId : cfg.enemyFormId,
    name: p ? cfg.playerName : cfg.enemyName,
    form: p ? cfg.playerForm : cfg.enemyForm,
    level: p ? cfg.playerLevel : cfg.enemyLevel,
    maxHp: p ? cfg.playerMaxHp : cfg.enemyMaxHp,
    hp: p ? cfg.playerHp : cfg.enemyHp,
    str: p ? cfg.playerStr : cfg.enemyStr,
    ki: p ? cfg.playerKi : cfg.enemyKi,
    spd: p ? cfg.playerSpd : cfg.enemySpd,
    maxCc: p ? cfg.playerMaxCc : cfg.enemyMaxCc,
    cc: p ? cfg.playerCc : cfg.enemyCc,
    battlePos: p ? cfg.playerPos : cfg.enemyPos,
    battleId: undefined,
    limits: p ? cfg.playerFighterLimits : [],
  };
}

/**
 * Estado inicial del combate — espejo puro de los inicializadores actuales
 * de main.tsx. Mismo estado observable, sin efectos.
 */
export function createInitialBattleState(cfg: InitialBattleConfig): BattleState {
  const seed = cfg.seed ?? DEFAULT_RNG_SEED;
  return {
    turn: 1,
    phase: 'position',
    exchange: 0,
    activeSide: cfg.firstAttacker,
    intro: true,
    player: fighterFromConfig(cfg, 'player'),
    enemy: fighterFromConfig(cfg, 'enemy'),
    player2: null,
    enemy2: null,
    playerTransformedForm: null,
    pStages: { ...ZERO_STAGES },
    eStages: { ...ZERO_STAGES },
    pAcc: 0,
    pEva: 0,
    playerGuard: null,
    pLockOn: false,
    powerState: 'NORMAL' as PowerState,
    gatherTurns: 0,
    gatherStartedRound: null,
    deck: cfg.playerDeck,
    eDeck: cfg.enemyDeck,
    selectedCard: null,
    limits: cfg.playerLimits,
    stageQte: emptyQte(),
    ai: { ...ZERO_AI },
    tick: 0,
    seed,
    rngState: cfg.rngState as number | undefined ?? initRng(seed),
  };
}
