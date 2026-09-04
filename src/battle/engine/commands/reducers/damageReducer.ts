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

import { getCard, type CardDef } from '../../../../data/cards';
import type { StageKey } from '../../../stageInputMap';
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
  romStageDamage,
  spdFor,
} from '../../combat/resolution';
import type { MoveAxis } from '../../../../data/positions';
import { BattlePosition, POSITION_DATA } from '../../../../data/positions';
import { moveFighter } from './movementReducer';
import { DEFENSE_ROM_RULES } from '../../rom/romDescriptors';
import { nextTransformedForm } from '../../../transforms';

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

export interface RomDefenseDamageOutcome {
  state: BattleState;
  damage: number;
  outcome: 'hit' | 'block' | 'guard';
  applied: boolean;
}

/** Restricción de familia confirmada por las ramas CA83/CA53 de la ROM. */
function defenseAppliesToIncoming(cardId: number, incoming: CardDef): boolean {
  if (cardId === 45 || cardId === 53 || cardId === 76) return incoming.type === 'beam';
  if (cardId === 52 || cardId === 122 || cardId === 123) return incoming.type === 'command';
  if (cardId === 19 || cardId === 124) return incoming.type === 'damage';
  return cardId === 26 || cardId === 121 || cardId === 125;
}

/**
 * Aplica la consecuencia mecánica CA53 de la carta defensiva comprometida.
 * La elección ya fue validada y consumida por PLAY_DEFENSE_CARD; aquí, en el
 * contacto de la ofensiva, se decide el daño/curación real una sola vez.
 *
 * ROM §59/63-67:
 *   CA53=1 AVOIDED      → 0 daño
 *   CA53=2 ATTENUATED   → daño = CC de la carta entrante
 *   CA53=3 NULLIFIED    → 0 daño
 *   CA53=4 ABSORBED     → 0 daño y cura = power de la Beam (Card.atk)
 *   CA53=0 COMMAND_CANCELLED → 0 comandos resueltos (0 daño Stage)
 */
export function applyRomDefenseToIncomingDamage(
  state: BattleState,
  attackerSide: BattleSide,
  incoming: CardDef,
  damage: number,
): RomDefenseDamageOutcome {
  if (attackerSide !== 'enemy' || state.defenseChoice?.type !== 'CARD') {
    return { state, damage: Math.max(0, damage), outcome: 'hit', applied: false };
  }
  const defenseCardId = state.defenseChoice.cardId;
  const rule = DEFENSE_ROM_RULES[defenseCardId];
  if (!rule || !defenseAppliesToIncoming(defenseCardId, incoming)) {
    return { state, damage: Math.max(0, damage), outcome: 'hit', applied: false };
  }

  if (rule.result === 'ATTENUATED') {
    return { state, damage: Math.max(0, incoming.cc), outcome: 'block', applied: true };
  }
  if (rule.result === 'ABSORBED') {
    const hp = Math.min(state.player.maxHp, state.player.hp + Math.max(0, incoming.atk));
    return {
      state: { ...state, player: { ...state.player, hp } },
      damage: 0,
      outcome: 'guard',
      applied: true,
    };
  }
  return { state, damage: 0, outcome: 'guard', applied: true };
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
    // M5 → ROM §130: el daño Stage usa su fórmula específica (NO la de
    // damage/beam). Resolved count = comandos correctos del QTE (CA7F);
    // el QTE completo suma seq.length; el safe-abort usa el progreso.
    // Los tiers son NETOS (pStages/eStages): strStage = buff−debuff STR,
    // guardStage = defBuff−vuln del defensor. Basic Guard (CA82==2) −4.
    const attackerStages = side === 'player' ? state.pStages : state.eStages;
    const defenderStages = side === 'player' ? state.eStages : state.pStages;
    const resolved = state.stageQte?.state === 'COMPLETED'
      ? (state.stageQte.correct + state.stageQte.repaired)
      : stageLevelOf(card) ?? 3;
    const dmg = romStageDamage({
      strength: attacker.str,
      powerWindow: attacker.powerWindowCounter > 0,
      strStage: attackerStages.str,
      guardStage: defenderStages.guard,
      attackerBack: POSITION_DATA[attacker.battlePos].depth === 'BACK',
      defenderBack: POSITION_DATA[defender.battlePos].depth === 'BACK',
      basicGuard: target === 'player' && state.playerGuard === 'reduce',
      resolvedCommandCount: resolved,
    });
    const defense = applyRomDefenseToIncomingDamage(state, side, card, dmg);
    const hit: BattleEvent = { type: 'ATTACK_HIT', source: side, target, outcome: defense.outcome };
    const applied = applyDamage(defense.state, target, defense.damage, { type: 'CARD', cardId: card.id }, side);
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
    let damage = card.effect === 'beam_varhp'
      ? Math.floor(defender.hp * 0.5)
      : attackDamage(card.atk, power, defender.battlePos, card.type);
    const isPierce = card.effect === 'damage_pierce';
    const isTeamAttack = card.effect === 'damage_special_team' || card.effect === 'beam_team';
    const ally = side === 'player' ? state.player2 : state.enemy2;
    if (isTeamAttack && !ally) damage = Math.floor(damage * 0.6);
    if (eResp === 'defend') {
      if (isPierce) {
        damage = Math.floor(damage * 0.5);
        events[events.length - 1] = { type: 'ATTACK_HIT', source: side, target, outcome: 'block' };
      } else {
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
    }

    const defense = applyRomDefenseToIncomingDamage(next, side, card, damage);
    next = defense.state;
    damage = defense.damage;
    if (defense.applied) {
      const contactIndex = events.findIndex((event) => event.type === 'ATTACK_HIT');
      if (contactIndex >= 0) events[contactIndex] = { type: 'ATTACK_HIT', source: side, target, outcome: defense.outcome };
    }
    if (damage > 0) {
      const applied = applyDamage(next, target, damage, { type: 'CARD', cardId: card.id }, side);
      next = applied.state;
      events.push(...applied.events);
      if (card.effect === 'life_drain') {
        const dealt = applied.events
          .filter((event): event is Extract<BattleEvent, { type: 'DAMAGE_APPLIED' }> => event.type === 'DAMAGE_APPLIED')
          .reduce((total, event) => total + event.amount, 0);
        const actor = side === 'player' ? next.player : next.enemy;
        const healed = { ...actor, hp: Math.min(actor.maxHp, actor.hp + dealt) };
        next = side === 'player' ? { ...next, player: healed } : { ...next, enemy: healed };
      }
    }
    if (card.effect === 'beam_suicide') {
      const actor = side === 'player' ? next.player : next.enemy;
      const exhausted = { ...actor, hp: Math.min(actor.hp, 1) };
      next = side === 'player'
        ? { ...next, player: exhausted }
        : { ...next, enemy: exhausted };
    }
    return { state: next, events, rngState: rng };
  }

  // ── Support / defense / special: efectos deterministas (subset M5) ──
  return resolveSupportAction(state, side, card);
}

/**
 * Efectos de soporte DETERMINISTAS (paridad con computeActionOutcome):
 * heal_* · cc_recovery · buff_* / debuff_* (stages) · guard types ·
 * life_drain · bomb/knockdown (daño directo) · transformación · limpieza.
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
  } else if (eff.startsWith('buff_') || eff.startsWith('debuff_') || eff === 'accuracy_up' || eff === 'evasion_up' || eff === 'lock_on'
    || eff === 'powerup_dispel' || eff === 'support_dispel' || eff === 'powerdown_cleanse'
    || eff === 'attack_power_down' || eff === 'sunglasses' || eff === 'special_card') {
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
    if (eff === 'attack_power_down') { es.str -= 1; es.ki -= 1; }
    if (eff === 'powerup_dispel') {
      es.str = Math.min(0, es.str);
      es.ki = Math.min(0, es.ki);
      es.spd = Math.min(0, es.spd);
      es.guard = Math.min(0, es.guard);
    }
    if (eff === 'powerdown_cleanse') {
      s.str = Math.max(0, s.str);
      s.ki = Math.max(0, s.ki);
      s.spd = Math.max(0, s.spd);
      s.guard = Math.max(0, s.guard);
    }
    if (eff === 'support_dispel') {
      next = { ...next, pAcc: 0, pEva: 0, pLockOn: false, playerGuard: null };
    }
    if (card.id === 95) {
      const opponent = side === 'player' ? next.enemy : next.player;
      const stripped = { ...opponent, powerWindowCounter: 0 };
      next = side === 'player' ? { ...next, enemy: stripped } : { ...next, player: stripped };
    }
    if (eff === 'accuracy_up') next = { ...next, pAcc: 2 };
    if (eff === 'evasion_up') next = { ...next, pEva: 2 };
    if (eff === 'lock_on') next = { ...next, pLockOn: true };
    next = {
      ...next,
      pStages: side === 'player' ? clampStages(s) : clampStages(es),
      eStages: side === 'enemy' ? clampStages(s) : clampStages(es),
    };
    if ((card.id === 27 || card.id === 28) && side === 'player') {
      const transformed = nextTransformedForm(next.playerTransformedForm ?? next.player.id);
      if (transformed) next = { ...next, playerTransformedForm: transformed };
    }
  }

  return { state: next, events, rngState: state.rngState };
}

function clampStages(stages: BattleState['pStages']): BattleState['pStages'] {
  const clamp = (value: number) => Math.max(-3, Math.min(3, value));
  return {
    str: clamp(stages.str),
    ki: clamp(stages.ki),
    spd: clamp(stages.spd),
    guard: clamp(stages.guard),
  };
}

/** Daño del contraataque (COUNTER_HIT) — fórmula legacy determinista. */
export function resolveCounterDamage(state: BattleState, cardType: CardDef['type']): DamageOutcome {
  const enemy = state.enemy;
  const dmg = counterDamage(enemy.str, enemy.ki, state.player.battlePos, cardType);
  const events: BattleEvent[] = [{ type: 'ATTACK_HIT', source: 'enemy', target: 'player', outcome: 'hit' }];
  const applied = applyDamage(state, 'player', dmg, { type: 'COUNTER' }, 'enemy');
  return { state: applied.state, events: [...events, ...applied.events] };
}

/** Daño parcial del Stage abortado (SAFE_ABORT) — ROM §92/§94: el progreso
 *  acumulado (comandos resueltos) determina el daño: base + resolvedCount.
 *  Con 0 aciertos → 0 (la ROM fuerza CA7F = 0). */
export function resolvePartialStageDamage(state: BattleState, side: BattleSide, card: CardDef, resolvedCount: number): DamageOutcome {
  const attacker = side === 'player' ? state.player : state.enemy;
  const defender = side === 'player' ? state.enemy : state.player;
  const target: BattleSide = side === 'player' ? 'enemy' : 'player';
  const attackerStages = side === 'player' ? state.pStages : state.eStages;
  const defenderStages = side === 'player' ? state.eStages : state.pStages;
  const dmg = romStageDamage({
    strength: attacker.str,
    powerWindow: attacker.powerWindowCounter > 0,
    strStage: attackerStages.str,
    guardStage: defenderStages.guard,
    attackerBack: POSITION_DATA[attacker.battlePos].depth === 'BACK',
    defenderBack: POSITION_DATA[defender.battlePos].depth === 'BACK',
    basicGuard: target === 'player' && state.playerGuard === 'reduce',
    resolvedCommandCount: resolvedCount,
  });
  if (dmg <= 0) return { state, events: [] };
  const events: BattleEvent[] = [{ type: 'ATTACK_HIT', source: side, target, outcome: 'guard' }];
  const applied = applyDamage(state, target, dmg, { type: 'CARD', cardId: card.id }, side);
  return { state: applied.state, events: [...events, ...applied.events] };
}

/**
 * Carta del Stage Attack básico (paridad legacy: getCard(stages − 2)).
 * 3 Stage → carta 1 · 4 Stage → carta 2 (command, atk 0).
 */
export function resolveStageCard(state: BattleState, seqLen: number): CardDef {
  const stages = seqLen >= 4 ? 4 : 3;
  return getCard(stages - 2) as CardDef;
}

/**
 * Powered repositioning del Stage (ROM §97-99 — SUPERSEDE §78/§79).
 *
 * La rutina Bank01:$6E43–$6E6B consulta CA60 (expected sequence) y recorre
 * CA5F comandos — se aplican los DIRECCIONALES DEL PREFIJO DE LA SECUENCIA
 * que terminó siendo resuelto/procesado (un comando reparado con B cuenta;
 * con A el fallo corta antes). Sólo si `powerWindowCounter != 0` del
 * ATACANTE (propiedad STAGE + POWER WINDOW, no del card ID — §99) y
 * `CA82 != 1` (modo especial SPECIAL_SUPPORT_RESOLUTION — contrato §170,
 * pendiente de cablear en el Engine; el flujo normal Stage nunca lo activa).
 *
 * Por cada comando resuelto (ROM §98):
 *   RIGHT $01 → position |= $02  → FORCE BACK
 *   UP    $04 → position |= $01  → FORCE AIR
 *   DOWN  $08 → position &= $02  → FORCE GROUND (preserva FRONT/BACK)
 *   A/B        → no modifican posición
 *
 * Es posición táctica PERSISTENTE (BattleState.battlePos del defensor), NO
 * knockback cinematográfico (ROM §80). Devuelve el estado con la posición
 * del defensor reescrita y los eventos POSITION_CHANGED correspondientes.
 */
export function applyStagePoweredReposition(
  state: BattleState,
  side: BattleSide,
  seq: readonly StageKey[],
  resolvedCount: number,
): { state: BattleState; events: BattleEvent[] } {
  const attacker = side === 'player' ? state.player : state.enemy;
  // §99: propiedad STAGE + POWER WINDOW. Sin power window → sin reposicionar.
  if (attacker.powerWindowCounter <= 0) return { state, events: [] };
  // §98/§170: CA82 == 1 (special-support) desactiva el reposicionamiento.
  // El flujo normal Stage no modela CA82 (contrato pendiente), así que la
  // condición se cumple por defecto aquí.

  const defenderSide: BattleSide = side === 'player' ? 'enemy' : 'player';
  const defender = defenderSide === 'player' ? state.player : state.enemy;
  const current = POSITION_DATA[defender.battlePos];
  let altitude: 'AIR' | 'GROUND' = current.altitude;
  let depth: 'FRONT' | 'BACK' = current.depth;

  const prefix = seq.slice(0, resolvedCount);
  for (const cmd of prefix) {
    if (cmd === 'RIGHT') depth = 'BACK';
    else if (cmd === 'UP') altitude = 'AIR';
    else if (cmd === 'DOWN') altitude = 'GROUND';
    // A / B → no modifican posición (ROM §98)
  }

  const next = (altitude === 'AIR'
    ? (depth === 'BACK' ? BattlePosition.UP_BACK : BattlePosition.UP_FRONT)
    : (depth === 'BACK' ? BattlePosition.DOWN_BACK : BattlePosition.DOWN_FRONT));
  if (next === defender.battlePos) return { state, events: [] };

  const axis: MoveAxis = (depth !== current.depth) ? 'HORIZONTAL' : 'VERTICAL';
  const defenderState = { ...defender, battlePos: next };
  return {
    state: defenderSide === 'player'
      ? { ...state, player: defenderState }
      : { ...state, enemy: defenderState },
    events: [{ type: 'POSITION_CHANGED', side: defenderSide, from: defender.battlePos, to: next, axis }],
  };
}
