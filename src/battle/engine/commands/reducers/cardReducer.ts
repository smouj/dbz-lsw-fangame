// ═══════════════════════════════════════════════════════════════════════
// M3/M4 — reducers/cardReducer: jugar carta (mano → descarte + coste + acción).
// ═══════════════════════════════════════════════════════════════════════
// Resolución DETERMINISTA de PLAY_CARD / PLAY_DEFENSE_CARD / PLAY_LIMIT_CARD:
//   1) cobra el CC exacto (una sola vez)  2) saca la carta EXACTA de la mano
//   3) la mueve al discardPile             4) marca la acción seleccionada.
// La parte RNG de la resolución (daño/acc) queda DELIMITADA para M5.
//
// M4 — contrato de orden (una carta jugada):
//   CC_SPENT → CARD_PLAYED → CARD_DISCARDED
// (el coste se cobra antes; la carta se juega y después entra al descarte).
// ═══════════════════════════════════════════════════════════════════════

import type { BattleEvent } from '../../events/BattleEvent';
import type { BattleSide, BattleState } from '../../state/BattleState';
import { getCard } from '../../../../data/cards';
import { payCc, type ResourceOutcome } from './resourceReducer';
export interface PlayCardOutcome {
  state: BattleState;
  events: BattleEvent[];
  cardId: number;
}

/** Saca la carta del índice dado de la mano y la añade al descarte. */
function removeFromHand(state: BattleState, side: BattleSide, handIndex: number): { state: BattleState; card: CardLike | null } {
  const deck = side === 'player' ? state.deck : state.eDeck;
  const card = deck.hand[handIndex];
  if (!card) return { state, card: null };
  const hand = deck.hand.filter((_, i) => i !== handIndex);
  const nextDeck = {
    ...deck,
    hand,
    discardPile: [...deck.discardPile, card],
  };
  return {
    state: {
      ...state,
      deck: side === 'player' ? nextDeck : state.deck,
      eDeck: side === 'enemy' ? nextDeck : state.eDeck,
    },
    card,
  };
}

type CardLike = { id: number };

/** PLAY_CARD: coste CC + mano→descarte + acción seleccionada (por índice). */
export function playCard(state: BattleState, side: BattleSide, handIndex: number): PlayCardOutcome {
  const deck = side === 'player' ? state.deck : state.eDeck;
  const card = deck.hand[handIndex];
  const cost = card?.cc ?? 0;
  const paid = payCc(state, side, cost);
  const moved = removeFromHand(paid.state, side, handIndex);
  const cardId = moved.card?.id ?? (card?.id ?? -1);
  const events: BattleEvent[] = [
    ...paid.events,
    ...(cardId >= 0 ? [
      { type: 'CARD_PLAYED' as const, side, cardId },
      { type: 'CARD_DISCARDED' as const, side, cardId },
    ] : []),
  ];
  return { state: moved.state, events, cardId };
}

/** PLAY_LIMIT_CARD: coste CC REAL de la carta del catálogo + marca la LIMITED. */
export function playLimitCard(state: BattleState, side: BattleSide, cardId: number): PlayCardOutcome {
  // La LIMITED se cobra el CC de su carta del catálogo (mismo coste que la
  // Joint equivalente — el juego bloquea con player.cc < c.cc).
  const catalog = getCard(cardId);
  const card = state.limits.includes(cardId) && catalog ? { id: cardId, cc: catalog.cc } : null;
  const cost = card?.cc ?? 0;
  const paid = payCc(state, side, cost);
  const events: BattleEvent[] = [
    ...paid.events,
    ...(cardId >= 0 ? [{ type: 'CARD_PLAYED' as const, side, cardId }] : []),
  ];
  return { state: paid.state, events, cardId };
}

/** PLAY_DEFENSE_CARD: coste CC + mano→descarte + guardia según la carta. */
export function playDefenseCard(state: BattleState, side: BattleSide, handIndex: number): PlayCardOutcome {
  const deck = side === 'player' ? state.deck : state.eDeck;
  const card = deck.hand[handIndex];
  const cost = card?.cc ?? 0;
  const paid = payCc(state, side, cost);
  const moved = removeFromHand(paid.state, side, handIndex);
  const cardId = moved.card?.id ?? (card?.id ?? -1);
  const events: BattleEvent[] = [
    ...paid.events,
    ...(cardId >= 0 ? [
      { type: 'CARD_PLAYED' as const, side, cardId },
      { type: 'CARD_DISCARDED' as const, side, cardId },
    ] : []),
  ];
  return { state: moved.state, events, cardId };
}

export type { ResourceOutcome };
