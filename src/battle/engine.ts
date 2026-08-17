// ═══════════════════════════════════════════════════════════════════════
// BATTLE ENGINE — máquina de FASES/TURNOS/MAZO compartida.
// Fuente única de la ORQUESTACIÓN del combate (fases, exchanges, robo,
// HAND CHECK, defensa). Consumidores: el juego real (main.tsx, migración
// progresiva) y el HUD Studio (hud.tsx) — ambos ejecutan las MISMAS
// transiciones; el HUD Studio solo cambia seed/velocidad/personajes.
//
// Reglas de bajo nivel (deck/CC/descarte): src/battle/state.ts.
// Este módulo añade la máquina: fase → fase con sus tiempos GBC.
// ═══════════════════════════════════════════════════════════════════════

import type { CardDef } from '../data/cards';
import {
  createBattleDeck, drawOne, playJoint, discardOne, needsDiscard,
  seededRng, CC_GAIN_PER_ATTACK_PHASE, HAND_MAX_TRANSITORY,
  type JointDeckState,
} from './state';

// ── Fases canónicas (las mismas del juego real) ──
export type EnginePhase =
  | 'intro' | 'attackPhase' | 'draw' | 'command' | 'cardSelect'
  | 'basic' | 'limitSelect' | 'stageInput' | 'defend' | 'moveSelect'
  | 'discard' | 'cinematic' | 'win' | 'lose';

export type AttackerSide = 'player' | 'enemy';

export interface EngineSide {
  cc: number;
  maxCc: number;
  hp: number;
  maxHp: number;
}

export interface BattleEngineState {
  phase: EnginePhase;
  turn: number;
  exchange: 1 | 2;
  attacker: AttackerSide;
  deck: JointDeckState;      // mazo real del jugador
  eDeck: JointDeckState;     // mazo real del enemigo
  player: EngineSide;
  enemy: EngineSide;
  cue: { id: number; title: string; sub: string } | null;
  drawCard: { card: CardDef; nonce: number } | null;
  played: CardDef | null;
  selectedIdx: number | null;
  winner: AttackerSide | null;
  seed: number;
}

export interface EngineOptions {
  seed?: number;
  playerHp?: number;
  enemyHp?: number;
  maxCc?: number;
  initialCc?: number;
  deckIds: (string | number)[];
  eDeckIds: (string | number)[];
  usable?: (c: CardDef) => boolean;
  eUsable?: (c: CardDef) => boolean;
}

export function initialState(opts: EngineOptions): BattleEngineState {
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  const maxCc = opts.maxCc ?? 99;
  const hp = opts.playerHp ?? 1000;
  const eHp = opts.enemyHp ?? 1000;
  const cc = opts.initialCc ?? 0;
  return {
    phase: 'intro',
    turn: 1,
    exchange: 1,
    attacker: 'player',
    deck: createBattleDeck(opts.deckIds, { seed, usable: opts.usable }),
    eDeck: createBattleDeck(opts.eDeckIds, { seed: seed + 999, usable: opts.eUsable }),
    player: { cc, maxCc, hp, maxHp: hp },
    enemy: { cc, maxCc, hp: eHp, maxHp: eHp },
    cue: null,
    drawCard: null,
    played: null,
    selectedIdx: null,
    winner: null,
    seed,
  };
}

let uid = 1;
const nextUid = () => uid++;

// ═══ TRANSICIONES PURAS (una fuente de verdad para ambos consumidores) ═══

/** ATTACK_PHASE_ENTER: +3 CC al atacante + cue (el robo va después). */
export function enterAttackPhase(s: BattleEngineState, attacker: AttackerSide): BattleEngineState {
  const side = attacker === 'player' ? s.player : s.enemy;
  return {
    ...s,
    attacker,
    player: attacker === 'player' ? { ...side, cc: Math.min(side.maxCc, side.cc + CC_GAIN_PER_ATTACK_PHASE) } : s.player,
    enemy: attacker === 'enemy' ? { ...side, cc: Math.min(side.maxCc, side.cc + CC_GAIN_PER_ATTACK_PHASE) } : s.enemy,
    cue: { id: nextUid(), title: 'ATTACK PHASE', sub: `${attacker === 'player' ? 'PLAYER' : 'ENEMY'} +${CC_GAIN_PER_ATTACK_PHASE} CC` },
    phase: 'attackPhase',
  };
}

/** JOINT_DRAW: roba 1 carta REAL del drawPile del lado indicado. */
export function drawFor(s: BattleEngineState, attacker: AttackerSide): BattleEngineState {
  const deck = attacker === 'player' ? s.deck : s.eDeck;
  if (deck.hand.length >= HAND_MAX_TRANSITORY) return s;
  const res = drawOne(deck);
  return {
    ...s,
    deck: attacker === 'player' ? res.state : s.deck,
    eDeck: attacker === 'enemy' ? res.state : s.eDeck,
    drawCard: res.card ? { card: res.card, nonce: nextUid() } : null,
    phase: 'draw',
  };
}

/** Fin de la animación de robo → COMMAND (sin mano visible todavía). */
export function toCommand(s: BattleEngineState): BattleEngineState {
  return { ...s, drawCard: null, cue: null, phase: 'command' };
}

/** COMMAND: el jugador elige rama. JOINT abre la mano; nunca roba. */
export function selectCommand(s: BattleEngineState, cmd: 'JOINT' | 'BASIC' | 'LIMIT'): BattleEngineState {
  return { ...s, phase: cmd === 'JOINT' ? 'cardSelect' : cmd === 'BASIC' ? 'basic' : 'limitSelect' };
}

/** Jugar una JOINT real: hand → discardPile, coste CC, fase cinemática. */
export function playCard(s: BattleEngineState, idx: number): BattleEngineState {
  const card = s.deck.hand[idx];
  if (!card || s.player.cc < card.cc) return s;
  return {
    ...s,
    deck: playJoint(s.deck, idx),
    player: { ...s.player, cc: s.player.cc - card.cc },
    played: card,
    selectedIdx: idx,
    phase: 'cinematic',
  };
}

/** HAND CHECK real tras la acción: >5 → discard; si no, fase defend. */
export function settleAfterAction(s: BattleEngineState): BattleEngineState {
  if (needsDiscard(s.deck)) return { ...s, played: null, selectedIdx: null, phase: 'discard' };
  return { ...s, played: null, selectedIdx: null, phase: 'defend' };
}

/** DISCARD_REQUIRED: el jugador ELIGE la carta (nunca automático). */
export function chooseDiscard(s: BattleEngineState, idx: number): BattleEngineState {
  return { ...s, deck: discardOne(s.deck, idx), phase: 'defend' };
}

/** DEFENSE resuelta → Exchange 2 (roles invertidos) o nuevo TURN. */
export function defendAction(s: BattleEngineState, _action: 'GUARD' | 'MOVE'): BattleEngineState {
  if (s.exchange === 1) {
    return { ...s, phase: 'command', exchange: 2, attacker: s.attacker === 'player' ? 'enemy' : 'player' };
  }
  return { ...s, phase: 'command', turn: s.turn + 1, exchange: 1, attacker: 'player' };
}

/** Jugar una JOINT del ENEMIGO (autopilot): su hand → su discardPile. */
export function playEnemyCard(s: BattleEngineState, idx: number): BattleEngineState {
  const card = s.eDeck.hand[idx];
  if (!card || s.enemy.cc < card.cc) return s;
  return {
    ...s,
    eDeck: playJoint(s.eDeck, idx),
    enemy: { ...s.enemy, cc: s.enemy.cc - card.cc },
    played: card,
    attacker: 'enemy',
    phase: 'cinematic',
  };
}

/** HAND CHECK del enemigo tras su acción (si >5, se queda en discard propio). */
export function settleEnemyAction(s: BattleEngineState): BattleEngineState {
  if (needsDiscard(s.eDeck)) return s;
  return { ...s, played: null, phase: 'defend' };
}

/** RNG determinista exportado (HUD Studio: seeds reproducibles). */
export { seededRng };
