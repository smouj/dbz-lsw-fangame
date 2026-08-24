// ═══════════════════════════════════════════════════════════════════════
// PA11 — EnemyController: el ENEMIGO ELIGE, el ENGINE DECIDE.
// Controller puro y determinista: BattleState + EnemySessionState →
// BattleCommand legal → BattleRuntime → BattleEngine.
// PROHIBIDO aquí: React/Pixi/DOM/timers/Math.random/Date.now; mutar
// BattleState; cambiar phase/exchange; tocar HP/KI/CC; resolver hit/miss.
// El RNG es un LCG determinista con seed (misma entrada → misma decisión).
// La legalidad SIEMPRE pasa por canExecute (autoridad real, nunca reglas
// duplicadas). El orquestador sincroniza la fase del ciclo (bridge M8.C1)
// antes de ejecutar; aquí solo se valida contra las fases del ciclo.
// ═══════════════════════════════════════════════════════════════════════
import type { BattleState, BattleSide } from '../engine/state/BattleState';
import type { BattleCommand } from '../engine/commands/BattleCommand';
import { canExecute } from '../engine/commands/canExecute';
import { activeDefender } from '../engine/state/battleStateSelectors';
import { getForm } from '../../data/roster';
import type { CardDef } from '../../data/cards';

// ── Intención (RESULTADO descriptivo de la decisión — nunca autoridad) ──
export type EnemyIntent =
  | 'ATTACK_CARD'
  | 'BASIC'
  | 'GATHER'
  | 'HEAL'
  | 'DEFENSE_CARD'
  | 'GUARD'
  | 'MOVE'
  | 'PASS';

// ── Memoria privada de la IA (no es autoridad del combate) ──
export interface EnemySessionState {
  consecutiveGather: number;
  consecutiveHeal: number;
  turnsWithoutDamage: number;
  lastIntent: EnemyIntent | null;
  rngState: number;
}

export function createEnemySession(seed = 0x1234abcd): EnemySessionState {
  return {
    consecutiveGather: 0,
    consecutiveHeal: 0,
    turnsWithoutDamage: 0,
    lastIntent: null,
    rngState: seed >>> 0,
  };
}

// LCG determinista (Park–Miller-ish) — sin Math.random
function nextRandom(rngState: number): { value: number; rngState: number } {
  const s = (rngState * 1664525 + 1013904223) >>> 0;
  return { value: s / 0x100000000, rngState: s };
}

export interface EnemyDecisionContext {
  battle: BattleState;
  session: EnemySessionState;
}

export interface EnemyDecision {
  command: BattleCommand;
  /** Carta física decidida (para el puente resolveCard del orquestador). */
  card: CardDef | null;
  nextSession: EnemySessionState;
  diagnostic: {
    intent: EnemyIntent;
    reason: string;
  };
}

/** Fases del ciclo ofensivo que el orquestador sincroniza antes de ejecutar
 *  (JOINT → cardSelect → PLAY_CARD · basic → GATHER/BASIC_STAGE_ATTACK ·
 *  defend → GUARD/MOVE/PLAY_DEFENSE_CARD). canExecute sigue siendo la
 *  autoridad de reglas — solo se le da el contexto de fase del ciclo. */
const OFFENSIVE_PHASES = ['command', 'cardSelect', 'basic'] as const;

function legal(state: BattleState, cmd: BattleCommand, side: BattleSide, characterId: string): boolean {
  if (cmd.type === 'GUARD' || cmd.type === 'MOVE' || cmd.type === 'PLAY_DEFENSE_CARD') {
    const st: BattleState = { ...state, phase: 'defend' };
    return canExecute(st, cmd, { side, characterId }).ok;
  }
  for (const phase of OFFENSIVE_PHASES) {
    let st: BattleState = { ...state, phase };
    if (phase === 'cardSelect' && cmd.type === 'PLAY_CARD') {
      const idx = (cmd as { handIndex: number }).handIndex;
      // el ciclo selecciona la carta antes de jugarla (SELECT_CARD)
      if (st.selectedCard !== idx) st = { ...st, selectedCard: idx };
    }
    if (canExecute(st, cmd, { side, characterId }).ok) return true;
  }
  return false;
}

/** Character del luchador enemigo (para compatibilidad de cartas — data pura). */
function enemyCharacterId(state: BattleState): string {
  const formId = state.enemy.id ?? '';
  const form = getForm(formId);
  if (form?.character) return form.character;
  // fallback: id sin sufijo de forma (goku_base → goku)
  const short = formId.replace(/_base$/, '').replace(/_.*$/, '');
  return short || '';
}

function handOf(state: BattleState): CardDef[] {
  return state.eDeck?.hand ?? [];
}

function decision(
  ns: EnemySessionState,
  command: BattleCommand,
  card: CardDef | null,
  intent: EnemyIntent,
  reason: string,
): EnemyDecision {
  return {
    command,
    card,
    nextSession: { ...ns, lastIntent: intent },
    diagnostic: { intent, reason },
  };
}

/**
 * PA11 — decisión pura del enemigo. Nunca muta BattleState.
 * Policy Alpha: ataque ofensivo > BASIC/Stage > heal útil > Gather útil.
 * Defensa: carta defensiva > GUARD > MOVE. Anti-loop: gather/heal
 * consecutivos penalizados; nunca PASS con acción ofensiva razonable.
 */
export function decideEnemyCommand(ctx: EnemyDecisionContext): EnemyDecision {
  const { battle: b, session: s } = ctx;
  const side: BattleSide = 'enemy';
  const enemy = b.enemy;
  const hand = handOf(b);
  const charId = enemyCharacterId(b);
  const { rngState } = nextRandom(s.rngState);
  const ns: EnemySessionState = { ...s, rngState };

  // ── CONTEXTO DEFENSIVO: el enemigo es el defensor activo ──
  // ⚠️ FUTURE: el Engine actual (M8.C2a-L) SOLO soporta defensa del PLAYER
  // (playerIsDefender → NOT_DEFENDER para side enemy). Esta rama queda lista
  // para cuando el Engine la soporte; el orquestador hoy solo llama al
  // controller en contexto ofensivo → nunca produce comandos defensivos.
  if (activeDefender(b) === 'enemy') {
    for (let i = 0; i < hand.length; i++) {
      const cmd = { type: 'PLAY_DEFENSE_CARD', handIndex: i } as const;
      if (legal(b, cmd, side, charId)) {
        return decision(ns, cmd, hand[i], 'DEFENSE_CARD', `carta defensiva ${hand[i].name} (mano ${i})`);
      }
    }
    const guard: BattleCommand = { type: 'GUARD' };
    if (legal(b, guard, side, charId)) return decision(ns, guard, null, 'GUARD', 'GUARD estable (fallback defensivo)');
    const move: BattleCommand = { type: 'MOVE', axis: 'HORIZONTAL' };
    if (legal(b, move, side, charId)) return decision(ns, move, null, 'MOVE', 'MOVE variación defensiva');
    return decision(ns, guard, null, 'GUARD', 'GUARD fallback final');
  }

  // ── CONTEXTO OFENSIVO (activeAttacker === 'enemy' — lo garantiza el orquestador) ──
  const missingRatio = 1 - enemy.hp / Math.max(1, enemy.maxHp);
  const antiHeal = s.consecutiveHeal * 80;

  // 1) HEAL solo si es útil de verdad (HP bajo) y sin loop
  let bestHeal: { score: number; cmd: BattleCommand; card: CardDef } | null = null;
  for (let i = 0; i < hand.length; i++) {
    const c = hand[i];
    if (c.type !== 'support' || !c.effect.startsWith('heal_')) continue;
    let score = 0;
    if (missingRatio > 0.7) score += 60;
    else if (missingRatio > 0.45) score += 40;
    else if (missingRatio > 0.25) score += 20;
    else score -= 1000; // HP alto: curar es malo
    score -= antiHeal;
    const cmd = { type: 'PLAY_CARD', handIndex: i } as const;
    if (legal(b, cmd, side, charId) && score > (bestHeal?.score ?? -Infinity)) bestHeal = { score, cmd, card: c };
  }
  if (bestHeal && bestHeal.score > 30) {
    return decision({ ...ns, consecutiveHeal: s.consecutiveHeal + 1, consecutiveGather: 0 }, bestHeal.cmd, bestHeal.card, 'HEAL', `heal ${bestHeal.card.name} (missing ${Math.round(missingRatio * 100)}%)`);
  }

  // 2) ATAQUE ofensivo: damage/beam/command de la mano
  let bestAttack: { score: number; cmd: BattleCommand; card: CardDef } | null = null;
  for (let i = 0; i < hand.length; i++) {
    const c = hand[i];
    if (c.type !== 'damage' && c.type !== 'beam' && c.type !== 'command') continue;
    const cmd = { type: 'PLAY_CARD', handIndex: i } as const;
    if (!legal(b, cmd, side, charId)) continue;
    let score = 100 + (c.atk ?? 0) * 2;
    if (c.type === 'beam') score += 10;
    if (c.type === 'command') score = 90; // stage attacks de la mano
    if (score > (bestAttack?.score ?? -Infinity)) bestAttack = { score, cmd, card: c };
  }
  if (bestAttack) {
    return decision(
      { ...ns, consecutiveGather: 0, consecutiveHeal: 0, turnsWithoutDamage: 0 },
      bestAttack.cmd, bestAttack.card, 'ATTACK_CARD',
      `${bestAttack.card.name} (score ${bestAttack.score})`,
    );
  }

  // 3) BASIC / Stage universal (gratis, sin mano)
  const basic: BattleCommand = { type: 'BASIC_STAGE_ATTACK' };
  if (legal(b, basic, side, charId)) {
    return decision(
      { ...ns, consecutiveGather: 0, consecutiveHeal: 0, turnsWithoutDamage: 0 },
      basic, null, 'BASIC', 'Stage básico universal (sin cartas ofensivas asequibles)',
    );
  }

  // 4) GATHER solo si aporta valor y no está en loop
  const gather: BattleCommand = { type: 'GATHER_POWER' };
  const needsPower = enemy.powerWindowCounter === 0;
  const gatherScore = 30 + (needsPower ? 15 : 0) - s.consecutiveGather * 80;
  if (legal(b, gather, side, charId) && gatherScore > 0) {
    return decision(
      { ...ns, consecutiveGather: s.consecutiveGather + 1, consecutiveHeal: 0, turnsWithoutDamage: s.turnsWithoutDamage + 1 },
      gather, null, 'GATHER', `Gather útil (${needsPower ? 'sin power window' : 'power activa'})`,
    );
  }

  // 5) fallback: nunca PASS si hay BASIC legal; si ni eso, PASS (el
  //    orquestador decide el stage — nunca deja de progresar a propósito)
  if (legal(b, basic, side, charId)) {
    return decision({ ...ns, turnsWithoutDamage: s.turnsWithoutDamage + 1 }, basic, null, 'BASIC', 'fallback stage');
  }
  return decision({ ...ns, turnsWithoutDamage: s.turnsWithoutDamage + 1 }, basic, null, 'PASS', 'sin acción legal (orquestador resuelve)');
}

/** Candidatos legales del lado (para inspección/diagnóstico — no decisión). */
export function getAvailableCommands(state: BattleState, side: BattleSide): BattleCommand[] {
  const hand = side === 'player' ? state.deck?.hand ?? [] : state.eDeck?.hand ?? [];
  const charId = side === 'enemy' ? enemyCharacterId(state) : '';
  const out: BattleCommand[] = [];
  for (let i = 0; i < hand.length; i++) {
    const c = hand[i];
    const cmd = { type: 'PLAY_CARD', handIndex: i } as const;
    if (legal(state, cmd, side, charId)) out.push(cmd);
  }
  const basic: BattleCommand = { type: 'BASIC_STAGE_ATTACK' };
  if (legal(state, basic, side, charId)) out.push(basic);
  const gather: BattleCommand = { type: 'GATHER_POWER' };
  if (legal(state, gather, side, charId)) out.push(gather);
  const guard: BattleCommand = { type: 'GUARD' };
  if (legal(state, guard, side, charId)) out.push(guard);
  const move: BattleCommand = { type: 'MOVE', axis: 'HORIZONTAL' };
  if (legal(state, move, side, charId)) out.push(move);
  for (let i = 0; i < hand.length; i++) {
    const cmd = { type: 'PLAY_DEFENSE_CARD', handIndex: i } as const;
    if (legal(state, cmd, side, charId)) out.push(cmd);
  }
  return out;
}
