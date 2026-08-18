// ═══════════════════════════════════════════════════════════════════════
// M3 — reducers/cardReducer: jugar carta (mano → descarte + coste + acción).
// ═══════════════════════════════════════════════════════════════════════
// Resolución DETERMINISTA de PLAY_CARD / PLAY_DEFENSE_CARD / PLAY_LIMIT_CARD:
//   1) cobra el CC exacto (una sola vez)  2) saca la carta EXACTA de la mano
//   3) la mueve al discardPile             4) marca la acción seleccionada.
// La parte RNG de la resolución (daño/acc) queda DELIMITADA para M5.
// ═══════════════════════════════════════════════════════════════════════

import type { BattleSide, BattleState } from '../../state/BattleState';
import { payCc } from './resourceReducer';

export interface PlayCardOutcome {
  state: BattleState;
  cardId: number;
}

/** Saca la carta del índice dado de la mano y la añade al descarte. */
function removeFromHand(state: BattleState, side: BattleSide, handIndex: number): BattleState {
  const deck = side === 'player' ? state.deck : state.eDeck;
  const card = deck.hand[handIndex];
  if (!card) return state;
  const hand = deck.hand.filter((_, i) => i !== handIndex);
  const nextDeck = {
    ...deck,
    hand,
    discardPile: [...deck.discardPile, card],
  };
  return {
    ...state,
    deck: side === 'player' ? nextDeck : state.deck,
    eDeck: side === 'enemy' ? nextDeck : state.eDeck,
  };
}

/** PLAY_CARD: coste CC + mano→descarte + acción seleccionada (por índice). */
export function playCard(state: BattleState, side: BattleSide, handIndex: number): PlayCardOutcome {
  const deck = side === 'player' ? state.deck : state.eDeck;
  const card = deck.hand[handIndex];
  const cost = card?.cc ?? 0;
  const paid = payCc(state, side, cost);
  const moved = removeFromHand(paid, side, handIndex);
  return { state: moved, cardId: card?.id ?? -1 };
}

/** PLAY_LIMIT_CARD: coste CC + marca la LIMITED seleccionada (sin mano). */
export function playLimitCard(state: BattleState, side: BattleSide, cardId: number): PlayCardOutcome {
  // El coste de la LIMITED se cobra en el juego al pulsarla (player.cc < c.cc
  // bloquea); aquí cobramos el mismo CC que la carta del catálogo.
  const card = state.limits.includes(cardId) ? { id: cardId, cc: 0 } : null;
  const cost = card?.cc ?? 0;
  const paid = payCc(state, side, cost);
  return { state: paid, cardId };
}

/** PLAY_DEFENSE_CARD: coste CC + mano→descarte + guardia según la carta. */
export function playDefenseCard(state: BattleState, side: BattleSide, handIndex: number): PlayCardOutcome {
  const deck = side === 'player' ? state.deck : state.eDeck;
  const card = deck.hand[handIndex];
  const cost = card?.cc ?? 0;
  const paid = payCc(state, side, cost);
  const moved = removeFromHand(paid, side, handIndex);
  return { state: moved, cardId: card?.id ?? -1 };
}
