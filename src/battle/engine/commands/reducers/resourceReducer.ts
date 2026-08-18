// ═══════════════════════════════════════════════════════════════════════
// M3 — reducers/resourceReducer: gasto de recursos UNA sola vez, en el Engine.
// ═══════════════════════════════════════════════════════════════════════
// Puro: devuelve un NUEVO estado; el original nunca se muta. Nunca se
// cobra dos veces (la presentación NO vuelve a aplicar consecuencias).
// ═══════════════════════════════════════════════════════════════════════

import type { BattleSide, BattleState } from '../../state/BattleState';

export function payCc(state: BattleState, side: BattleSide, cost: number): BattleState {
  if (cost <= 0) return state;
  const fighter = side === 'player' ? state.player : state.enemy;
  const nextFighter = { ...fighter, cc: Math.max(0, fighter.cc - cost) };
  return {
    ...state,
    player: side === 'player' ? nextFighter : state.player,
    enemy: side === 'enemy' ? nextFighter : state.enemy,
  };
}

export function payKi(state: BattleState, side: BattleSide, cost: number): BattleState {
  if (cost <= 0) return state;
  const fighter = side === 'player' ? state.player : state.enemy;
  const nextFighter = { ...fighter, ki: Math.max(0, fighter.ki - cost) };
  return {
    ...state,
    player: side === 'player' ? nextFighter : state.player,
    enemy: side === 'enemy' ? nextFighter : state.enemy,
  };
}

export function gainCc(state: BattleState, side: BattleSide, amount: number): BattleState {
  if (amount <= 0) return state;
  const fighter = side === 'player' ? state.player : state.enemy;
  const nextFighter = { ...fighter, cc: Math.min(fighter.maxCc, fighter.cc + amount) };
  return {
    ...state,
    player: side === 'player' ? nextFighter : state.player,
    enemy: side === 'enemy' ? nextFighter : state.enemy,
  };
}
