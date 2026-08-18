// ═══════════════════════════════════════════════════════════════════════
// M5 — reducers/damageReducer: TODA mutación de HP del Engine pasa por aquí.
// ═══════════════════════════════════════════════════════════════════════
//   applyDamage       → HP gobernado exclusivamente por el Engine
//   resolveCardAction → resolución de la carta al completar el Stage QTE
//
// Eventos (orden contractual): ATTACK_HIT/ATTACK_MISSED (precisión) →
// DAMAGE_APPLIED (mutación real, amount = hpBefore − hpAfter) →
// FIGHTER_DEFEATED (solo si hpAfter === 0). Nunca al revés.
//
// Shadow parity: las fórmulas llaman a engine/combat/resolution, que
// reproduce EXACTAMENTE el comportamiento auditado de main.tsx —
// M5 no rebalancea.
// ═══════════════════════════════════════════════════════════════════════

import type { CardDef } from '../../../../data/cards';
import type { BattleEvent, DamageCause } from '../../events/BattleEvent';
import type { RngState } from '../../random/prng';
import { nextRng } from '../../random/prng';
import type { BattleSide, BattleState } from '../../state/BattleState';
import {
  accuracyHits,
  attackDamage,
  counterDamage,
  effectiveAttackAccuracy,
  enemyResponseFromRoll,
  hitBlockAvoidFromRoll,
  moveAxisFromRoll,
  powerFor,
  spdFor,
  stageAttackDamage,
  stagePartialDamage,
} from '../../combat/resolution';
import type { MoveAxis } from '../../../../data/positions';
import { moveFighter } from './movementReducer';

export interface DamageOutcome {
  state: BattleState;
  events: BattleEvent[];
}

/**
 * Aplica daño real a un luchador (única ruta de mutación de HP).
 * - amount >= 0 · HP ∈ [0, maxHp] · amount = hpBefore − hpAfter.
 * - Emite DAMAGE_APPLIED y, si el luchador queda a 0, FIGHTER_DEFEATED
 *   DESPUÉS (orden causal).
 */
export function applyDamage(
  state: BattleState,
  target: BattleSide,
  amount: number,
  cause: DamageCause,
  source: BattleSide,
): DamageOutcome {
  if (amount <= 0) return { state, events: [] };
  const fighter = target === 'player' ? state.player : state.enemy;
  const hpBefore = fighter.hp;
  const hpAfter = Math.max(0, hpBefore - amount);
  const applied = Math.min(amount, hpBefore);
  if (applied <= 0) return { state, events: [] };
  const nextFighter = { ...fighter, hp: hpAfter };
  const next: BattleState = {
    ...state,
    player: target === 'player' ? nextFighter : state.player,
    enemy: target === 'enemy' ? nextFighter : state.enemy,
  };
  const events: BattleEvent[] = [
    { type: 'DAMAGE_APPLIED', source, target, amount: applied, hpBefore, hpAfter, cause },
  ];
  if (hpAfter <= 0) {
    events.push({ type: 'FIGHTER_DEFEATED', side: target });
  }
  return { state: next, events };
}

/** ¿La carta es de stage (command 1-4)? El QTE es su introducción. */
function stageLevelOf(card: CardDef): 3 | 4 | 5 | 6 | null {
  if (card.type !== 'command') return null;
  if (card.name.includes('6')) return 6;
  if (card.name.includes('5')) return 5;
  if (card.name.includes('4')) return 4;
  return 3;
}

export interface CardResolutionOutcome {
  state: BattleState;
  events: BattleEvent[];
  rngState: RngState;
}

/**
 * Resuelve la acción de la carta al completar el Stage QTE.
 * - command (Stage Attack): daño determinista — 0 tiradas.
 * - damage/beam: flujo legacy computeActionOutcome con tiradas:
 *     accuracy (1) → [miss: 0 más] → respuesta enemiga (1) →
 *     [move: eje (1)] | [defend: hit/block/avoid (1)]
 * - support/defense: efectos deterministas (heal/CC/stages/guard) — sin
 *   tiradas (OHKO y efectos de equipo en M8).
 */
export function resolveCardAction(state: BattleState, side: BattleSide, card: CardDef): CardResolutionOutcome {
  const attacker = side === 'player' ? state.player : state.enemy;
  const defender = side === 'player' ? state.enemy : state.player;
  const stages = side === 'player' ? state.pStages : state.eStages;
  const target: BattleSide = side === 'player' ? 'enemy' : 'player';

  // ── Stage Attack (command): determinista, 0 tiradas ──
  if (stageLevelOf(card)) {
    const dmg = stageAttackDamage(card.atk, attacker.str, defender.battlePos, card.type);
    const hit: BattleEvent = { type: 'ATTACK_HIT', source: side, target, outcome: 'hit' };
    const applied = applyDamage(state, target, dmg, { type: 'CARD', cardId: card.id }, side);
    return {
      state: applied.state,
      events: [hit, ...applied.events],
      rngState: state.rngState, // sin consumo
    };
  }

  // ── Cartas de ataque (damage/beam): flujo con precisión/evasión ──
  if (card.type === 'damage' || card.type === 'beam') {
    let rng = state.rngState;
    let events: BattleEvent[] = [];
    let next = state;

    // 1) Precisión (1 tirada) — miss: no hay más tiradas
    const effAcc = effectiveAttackAccuracy(card.acc, side === 'player' ? state.pAcc > 0 : false);
    const lockOn = side === 'player' ? state.pLockOn : false;
    const accRoll = nextRng(rng);
    rng = accRoll.rngState;
    if (!accuracyHits(accRoll.value, effAcc, lockOn)) {
      return {
        state,
        events: [{ type: 'ATTACK_MISSED', source: side, target }],
        rngState: rng, // 1 avance (miss: 0 más)
      };
    }
    events.push({ type: 'ATTACK_HIT', source: side, target, outcome: 'hit' });
    if (lockOn && side === 'player') {
      next = { ...next, pLockOn: false }; // consume lock-on
    }

    // 2) Respuesta del defensor (1 tirada)
    const respRoll = nextRng(rng);
    rng = respRoll.rngState;
    const eResp = enemyResponseFromRoll(respRoll.value);

    // 3a) El defensor se mueve (1 tirada de eje) → POSITION_CHANGED real
    if (eResp === 'move') {
      const axisRoll = nextRng(rng);
      rng = axisRoll.rngState;
      const axis: MoveAxis = moveAxisFromRoll(axisRoll.value);
      const moved = moveFighter(next, target, axis);
      next = moved.state;
      events.push(...moved.events);
    }

    // 4) Daño base (fórmula única legacy) + HIT/BLOCK/AVOID si defiende
    const power = powerFor(card.type, attacker.str, attacker.ki, stages.str, stages.ki);
    let damage = attackDamage(card.atk, power, defender.battlePos, card.type);
    if (eResp === 'defend') {
      const spdDef = spdFor(defender.spd, (side === 'player' ? state.eStages : state.pStages).spd);
      const gRoll = nextRng(rng);
      rng = gRoll.rngState;
      const verdict = hitBlockAvoidFromRoll(gRoll.value, spdDef, card.acc);
      if (verdict === 'avoid') {
        damage = 0;
        events[events.length - 1] = { type: 'ATTACK_HIT', source: side, target, outcome: 'guard' };
      } else if (verdict === 'block') {
        damage = Math.floor(damage * 0.25);
        events[events.length - 1] = { type: 'ATTACK_HIT', source: side, target, outcome: 'block' };
      }
    }

    if (damage > 0) {
      const applied = applyDamage(next, target, damage, { type: 'CARD', cardId: card.id }, side);
      next = applied.state;
      events.push(...applied.events);
    }
    return { state: next, events, rngState: rng };
  }

  // ── Support / defense / special: efectos deterministas (subset M5) ──
  return resolveSupportAction(state, side, card);
}

/**
 * Efectos de soporte DETERMINISTAS (paridad con computeActionOutcome):
 * heal_* · cc_recovery · buff_* / debuff_* (stages) · guard types ·
 * life_drain · bomb/knockdown (daño directo). Transformaciones, OHKO y
 * efectos de equipo quedan para M8 (cutover) — sin tiradas aquí.
 * El heal muta HP pero no emite DAMAGE_APPLIED (no es daño; el evento de
 * heal llega con el soporte completo en M8).
 */
export function resolveSupportAction(state: BattleState, side: BattleSide, card: CardDef): CardResolutionOutcome {
  const target: BattleSide = side === 'player' ? 'enemy' : 'player';
  const fighter = side === 'player' ? state.player : state.enemy;
  const eff = card.effect;
  let next = state;
  const events: BattleEvent[] = [];

  if (eff === 'heal_25pct' || eff === 'heal_strong' || eff === 'heal_light') {
    const pct = eff === 'heal_strong' ? (1 / 4 + 1 / 3) : eff === 'heal_light' ? 0.3 : 0.25;
    const healed = Math.floor(fighter.maxHp * pct);
    const hpAfter = Math.min(fighter.maxHp, fighter.hp + healed);
    next = {
      ...next,
      player: side === 'player' ? { ...next.player, hp: hpAfter } : next.player,
      enemy: side === 'enemy' ? { ...next.enemy, hp: hpAfter } : next.enemy,
    };
  } else if (eff === 'cc_recovery') {
    const gain = card.id === 97 ? 5 : 3;
    const f = side === 'player' ? next.player : next.enemy;
    const after = Math.min(f.maxCc, f.cc + gain);
    const before = f.cc;
    if (after > before) {
      next = {
        ...next,
        player: side === 'player' ? { ...f, cc: after } : next.player,
        enemy: side === 'enemy' ? { ...f, cc: after } : next.enemy,
      };
      events.push({ type: 'CC_GAINED', side, amount: after - before, before, after });
    }
  } else if (eff === 'life_drain') {
    const drain = Math.floor((card.atk + fighter.str) * 0.5);
    if (drain > 0) {
      const applied = applyDamage(next, target, drain, { type: 'CARD', cardId: card.id }, side);
      next = applied.state;
      events.push(...applied.events);
    }
  } else if (eff === 'avoid_beam' || eff === 'avoid_damage' || eff === 'avoid_damage_taiyoken' || eff === 'reduce_damage' || eff === 'absorb_beam' || eff === 'beam_shield' || eff === 'damage_shield' || eff === 'command_cancel') {
    const guardType =
      eff === 'avoid_damage' || eff === 'avoid_damage_taiyoken' || eff === 'damage_shield' ? 'avoid_damage'
      : eff === 'absorb_beam' || eff === 'beam_shield' ? 'absorb'
      : eff === 'reduce_damage' ? 'reduce'
      : eff === 'command_cancel' ? 'cancel'
      : 'avoid_beam';
    next = { ...next, playerGuard: guardType };
    events.push({ type: 'GUARD_STARTED', side, guard: guardType });
  } else if (eff === 'gamebomb' || eff === 'candy' || eff === 'naughty_book' || eff === 'knockdown_dmg' || eff === 'knockdown_min') {
    const bombDmg = Math.floor((card.atk || 20) + fighter.str);
    if (bombDmg > 0) {
      const applied = applyDamage(next, target, bombDmg, { type: 'CARD', cardId: card.id }, side);
      next = applied.state;
      events.push(...applied.events);
    }
  } else if (eff.startsWith('buff_') || eff.startsWith('debuff_') || eff === 'accuracy_up' || eff === 'evasion_up' || eff === 'lock_on') {
    const pStages = side === 'player' ? next.pStages : next.eStages;
    const eStages = side === 'player' ? next.eStages : next.pStages;
    const s = { ...pStages };
    const es = { ...eStages };
    if (eff === 'buff_ki8' || eff === 'buff_str_ki8') s.ki += 1;
    if (eff === 'buff_str8' || eff === 'buff_str_ki8') s.str += 1;
    if (eff === 'buff_kaio') { s.str += 2; s.ki += 2; }
    if (eff === 'buff_speed8') s.spd += 1;
    if (eff === 'buff_guard8') s.guard += 1;
    if (eff === 'debuff_str8') es.str -= 1;
    if (eff === 'debuff_ki8') es.ki -= 1;
    if (eff === 'debuff_speed8' || eff === 'debuff_speed8_lowacc') es.spd -= 1;
    if (eff === 'debuff_guard8') es.guard -= 1;
    if (eff === 'accuracy_up') next = { ...next, pAcc: 2 };
    if (eff === 'evasion_up') next = { ...next, pEva: 2 };
    if (eff === 'lock_on') next = { ...next, pLockOn: true };
    next = {
      ...next,
      pStages: side === 'player' ? s : es,
      eStages: side === 'enemy' ? s : es,
    };
  }

  return { state: next, events, rngState: state.rngState };
}

/** Daño del contraataque (COUNTER_HIT) — fórmula legacy determinista. */
export function resolveCounterDamage(state: BattleState, cardType: CardDef['type']): DamageOutcome {
  const enemy = state.enemy;
  const dmg = counterDamage(enemy.str, enemy.ki, state.player.battlePos, cardType);
  const events: BattleEvent[] = [{ type: 'ATTACK_HIT', source: 'enemy', target: 'player', outcome: 'hit' }];
  const applied = applyDamage(state, 'player', dmg, { type: 'COUNTER' }, 'enemy');
  return { state: applied.state, events: [...events, ...applied.events] };
}

/** Daño parcial del Stage abortado (SAFE_ABORT) — fórmula legacy. */
export function resolvePartialStageDamage(state: BattleState, side: BattleSide, card: CardDef, progress: number): DamageOutcome {
  const attacker = side === 'player' ? state.player : state.enemy;
  const target: BattleSide = side === 'player' ? 'enemy' : 'player';
  const dmg = stagePartialDamage(card.atk, attacker.str, (side === 'player' ? state.enemy : state.player).battlePos, card.type, progress);
  if (dmg <= 0) return { state, events: [] };
  const events: BattleEvent[] = [{ type: 'ATTACK_HIT', source: side, target, outcome: 'guard' }];
  const applied = applyDamage(state, target, dmg, { type: 'CARD', cardId: card.id }, side);
  return { state: applied.state, events: [...events, ...applied.events] };
}
