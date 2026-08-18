// ═══════════════════════════════════════════════════════════════════════
// M3/M4 — reducers/resourceReducer: gasto de recursos UNA sola vez, en el Engine.
// ═══════════════════════════════════════════════════════════════════════
// Puro: devuelve un NUEVO estado; el original nunca se muta. Nunca se
// cobra dos veces (la presentación NO vuelve a aplicar consecuencias).
// M4: cada mutación real emite su evento en el MISMO sitio donde ocurre
// (CC_SPENT/CC_GAINED/KI_SPENT con before/after exactos).
// ═══════════════════════════════════════════════════════════════════════

import type { BattleEvent } from '../../events/BattleEvent';
import type { BattleSide, BattleState } from '../../state/BattleState';

export interface ResourceOutcome {
  state: BattleState;
  events: BattleEvent[];
}

export function payCc(state: BattleState, side: BattleSide, cost: number): ResourceOutcome {
  if (cost <= 0) return { state, events: [] };
  const fighter = side === 'player' ? state.player : state.enemy;
  const before = fighter.cc;
  const after = Math.max(0, before - cost);
  const amount = before - after;
  if (amount <= 0) return { state, events: [] };
  const nextFighter = { ...fighter, cc: after };
  return {
    state: {
      ...state,
      player: side === 'player' ? nextFighter : state.player,
      enemy: side === 'enemy' ? nextFighter : state.enemy,
    },
    events: [{ type: 'CC_SPENT', side, amount, before, after }],
  };
}

export function payKi(state: BattleState, side: BattleSide, cost: number): ResourceOutcome {
  if (cost <= 0) return { state, events: [] };
  const fighter = side === 'player' ? state.player : state.enemy;
  const before = fighter.ki;
  const after = Math.max(0, before - cost);
  const amount = before - after;
  if (amount <= 0) return { state, events: [] };
  const nextFighter = { ...fighter, ki: after };
  return {
    state: {
      ...state,
      player: side === 'player' ? nextFighter : state.player,
      enemy: side === 'enemy' ? nextFighter : state.enemy,
    },
    events: [{ type: 'KI_SPENT', side, amount, before, after }],
  };
}

export function gainCc(state: BattleState, side: BattleSide, amount: number): ResourceOutcome {
  if (amount <= 0) return { state, events: [] };
  const fighter = side === 'player' ? state.player : state.enemy;
  const before = fighter.cc;
  const after = Math.min(fighter.maxCc, before + amount);
  const gained = after - before;
  if (gained <= 0) return { state, events: [] };
  const nextFighter = { ...fighter, cc: after };
  return {
    state: {
      ...state,
      player: side === 'player' ? nextFighter : state.player,
      enemy: side === 'enemy' ? nextFighter : state.enemy,
    },
    events: [{ type: 'CC_GAINED', side, amount: gained, before, after }],
  };
}
